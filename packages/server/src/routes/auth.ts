import { Hono } from 'hono'
import { db } from '../db'
import { users, nodes, relations } from '../db/schema'
import { eq, ilike, and, sql } from 'drizzle-orm'
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
  return c.json({ token, user: { id, email, username, profilePhotoUrl: null, createdAt: now } }, 201)
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
  return c.json({ token, user: { id: user.id, email: user.email, username: user.username, profilePhotoUrl: user.profilePhotoUrl, createdAt: user.createdAt } })
})

router.get('/me', requireAuth, async (c) => {
  const userId = getUserId(c)
  const result = await db.select().from(users).where(eq(users.id, userId)).limit(1)
  if (result.length === 0) {
    return c.json({ error: 'Usuario no encontrado' }, 404)
  }
  const user = result[0]
  return c.json({ id: user.id, email: user.email, username: user.username, profilePhotoUrl: user.profilePhotoUrl, createdAt: user.createdAt })
})

router.put('/password', requireAuth, async (c) => {
  const userId = getUserId(c)
  const { currentPassword, newPassword } = await c.req.json()

  if (!currentPassword || !newPassword) {
    return c.json({ error: 'Password actual y nuevo password son requeridos' }, 400)
  }
  if (typeof newPassword !== 'string' || newPassword.length < 8 || newPassword.length > 200) {
    return c.json({ error: 'Nuevo password: 8-200 caracteres' }, 400)
  }

  const result = await db.select().from(users).where(eq(users.id, userId)).limit(1)
  if (result.length === 0) {
    return c.json({ error: 'Usuario no encontrado' }, 404)
  }

  const valid = await verifyPassword(currentPassword, result[0].passwordHash)
  if (!valid) {
    return c.json({ error: 'Password actual incorrecto' }, 401)
  }

  const passwordHash = await hashPassword(newPassword)
  await db.update(users).set({ passwordHash }).where(eq(users.id, userId))
  return c.json({ ok: true })
})

router.put('/profile-photo', requireAuth, async (c) => {
  const userId = getUserId(c)
  const { profilePhotoUrl } = await c.req.json()

  if (profilePhotoUrl !== null && (typeof profilePhotoUrl !== 'string' || profilePhotoUrl.length > 2000)) {
    return c.json({ error: 'URL inválida' }, 400)
  }

  await db.update(users).set({ profilePhotoUrl: profilePhotoUrl || null }).where(eq(users.id, userId))
  return c.json({ profilePhotoUrl: profilePhotoUrl || null })
})

router.get('/search', requireAuth, async (c) => {
  const q = c.req.query('q')
  if (!q || q.trim().length === 0) return c.json([])
  const results = await db.select({ id: users.id, username: users.username, profilePhotoUrl: users.profilePhotoUrl, createdAt: users.createdAt })
    .from(users)
    .where(ilike(users.username, `%${q.trim()}%`))
    .limit(10)
  return c.json(results)
})

router.get('/profile/:id', requireAuth, async (c) => {
  const id = c.req.param('id') as string
  const [profileUser] = await db.select({ id: users.id, username: users.username, profilePhotoUrl: users.profilePhotoUrl, createdAt: users.createdAt })
    .from(users).where(eq(users.id, id)).limit(1)
  if (!profileUser) return c.json({ error: 'Usuario no encontrado' }, 404)

  const userNodes = await db.select().from(nodes).where(eq(nodes.userId, id))
  const userRelations = await db.select({ count: sql<number>`count(*)` }).from(relations).where(eq(relations.userId, id))
  const terminated = userNodes.filter((n) => n.status === 'terminado')
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
  const topRated = userNodes.filter((n) => n.rating != null).sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0)).slice(0, 10)

  return c.json({
    ...profileUser,
    nodeCount: userNodes.length,
    relationCount: userRelations[0]?.count ?? 0,
    terminatedCount: terminated.length,
    terminated: terminated.slice(0, 20).map((n) => ({ id: n.id, title: n.title, type: n.type, updatedAt: n.updatedAt })),
    topRated: topRated.map((n) => ({ id: n.id, title: n.title, type: n.type, rating: n.rating })),
  })
})

export default router
