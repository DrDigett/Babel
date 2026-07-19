import { Hono } from 'hono'
import { db } from '../db'
import { users } from '../db/schema'
import { eq } from 'drizzle-orm'
import crypto from 'node:crypto'
import { hashPassword, verifyPassword, signToken, requireAuth } from '../lib/auth'
import { getUserId, type AppEnv } from '../lib/types'

const router = new Hono<AppEnv>()

router.post('/register', async (c) => {
  const { email, username, password } = await c.req.json()

  if (!email || !username || !password) {
    return c.json({ error: 'Email, username y password son requeridos' }, 400)
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
