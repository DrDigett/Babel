import { Hono } from 'hono'
import { db } from '../db'
import { users } from '../db/schema'
import { eq } from 'drizzle-orm'
import crypto from 'node:crypto'
import { hashPassword, verifyPassword, signToken, requireAuth } from '../lib/auth'
import { getUserId, type AppEnv } from '../lib/types'

const router = new Hono<AppEnv>()

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const USERNAME_RE = /^[a-zA-Z0-9_-]{3,30}$/

// ponytail: in-memory rate limit per IP, resets on restart. good enough.
const attempts = new Map<string, { count: number; resetAt: number }>()
const WINDOW_MS = 15 * 60 * 1000
const MAX_ATTEMPTS = 20

function checkRateLimit(ip: string): boolean {
  const now = Date.now()
  const entry = attempts.get(ip)
  if (!entry || now > entry.resetAt) {
    attempts.set(ip, { count: 1, resetAt: now + WINDOW_MS })
    return true
  }
  entry.count++
  return entry.count <= MAX_ATTEMPTS
}

router.post('/register', async (c) => {
  if (!checkRateLimit(c.req.header('x-forwarded-for') ?? c.req.header('x-real-ip') ?? 'unknown')) {
    return c.json({ error: 'Demasiados intentos, intentá más tarde' }, 429)
  }

  const { email, username, password } = await c.req.json()

  if (!email || !username || !password) {
    return c.json({ error: 'Email, username y password son requeridos' }, 400)
  }

  if (typeof email !== 'string' || !EMAIL_RE.test(email)) {
    return c.json({ error: 'Email inválido' }, 400)
  }
  if (typeof username !== 'string' || !USERNAME_RE.test(username)) {
    return c.json({ error: 'Username: 3-30 caracteres, solo letras, números, _ o -' }, 400)
  }
  if (typeof password !== 'string' || password.length < 8 || password.length > 200) {
    return c.json({ error: 'Password: 8-200 caracteres' }, 400)
  }

  const existingEmail = await db.select().from(users).where(eq(users.email, email)).limit(1)
  if (existingEmail.length > 0) {
    return c.json({ error: 'El email ya está registrado' }, 409)
  }

  const existingUsername = await db.select().from(users).where(eq(users.username, username)).limit(1)
  if (existingUsername.length > 0) {
    return c.json({ error: 'El username ya existe' }, 409)
  }

  const id = crypto.randomUUID()
  const passwordHash = await hashPassword(password)
  const now = new Date().toISOString()

  await db.insert(users).values({ id, email, username, passwordHash, createdAt: now })

  const token = signToken(id)
  return c.json({ token, user: { id, email, username, createdAt: now } }, 201)
})

router.post('/login', async (c) => {
  if (!checkRateLimit(c.req.header('x-forwarded-for') ?? c.req.header('x-real-ip') ?? 'unknown')) {
    return c.json({ error: 'Demasiados intentos, intentá más tarde' }, 429)
  }

  const { email, password } = await c.req.json()

  if (!email || !password) {
    return c.json({ error: 'Email y password son requeridos' }, 400)
  }

  const result = await db.select().from(users).where(eq(users.email, email)).limit(1)
  if (result.length === 0) {
    return c.json({ error: 'Credenciales inválidas' }, 401)
  }

  const user = result[0]
  const valid = await verifyPassword(password, user.passwordHash)
  if (!valid) {
    return c.json({ error: 'Credenciales inválidas' }, 401)
  }

  const token = signToken(user.id)
  return c.json({ token, user: { id: user.id, email: user.email, username: user.username, createdAt: user.createdAt } })
})

router.get('/me', requireAuth, async (c) => {
  const userId = getUserId(c)
  const result = await db.select().from(users).where(eq(users.id, userId)).limit(1)
  if (result.length === 0) {
    return c.json({ error: 'Usuario no encontrado' }, 404)
  }
  const user = result[0]
  return c.json({ id: user.id, email: user.email, username: user.username, createdAt: user.createdAt })
})

export default router
