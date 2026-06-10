import crypto from 'node:crypto'
import { db } from '../db'
import { nodes } from '../db/schema'
import { Hono } from 'hono'
import { eq, and } from 'drizzle-orm'
import type { CreateNodeInput, NodeType, NodeStatus, NodePriority } from '@babel-plus/shared'

const NODE_TYPES: NodeType[] = ['libro', 'pelicula', 'articulo', 'video', 'curso', 'evento', 'videojuego']
const NODE_STATUSES: NodeStatus[] = ['pendiente', 'en_progreso', 'terminado', 'abandonado']
const NODE_PRIORITIES: NodePriority[] = ['alta', 'media', 'baja']

const router = new Hono()

router.get('/', async (c) => {
  const type = c.req.query('type')
  const status = c.req.query('status')

  const conditions = []
  if (type) conditions.push(eq(nodes.type, type))
  if (status) conditions.push(eq(nodes.status, status))

  const all = conditions.length
    ? await db.select().from(nodes).where(and(...conditions))
    : await db.select().from(nodes)

  return c.json(all)
})

router.get('/:id', async (c) => {
  const id = c.req.param('id')
  const [node] = await db.select().from(nodes).where(eq(nodes.id, id)).limit(1)
  if (!node) return c.json({ error: 'not found' }, 404)
  return c.json(node)
})

router.post('/', async (c) => {
  const body = await c.req.json<CreateNodeInput>()
  if (!body.title || typeof body.title !== 'string' || body.title.trim().length === 0) {
    return c.json({ error: 'title is required' }, 400)
  }
  if (body.title.length > 500) {
    return c.json({ error: 'title too long (max 500)' }, 400)
  }
  if (body.type && !NODE_TYPES.includes(body.type)) {
    return c.json({ error: `invalid type, must be one of: ${NODE_TYPES.join(', ')}` }, 400)
  }
  if (body.status && !NODE_STATUSES.includes(body.status)) {
    return c.json({ error: `invalid status, must be one of: ${NODE_STATUSES.join(', ')}` }, 400)
  }
  if (body.priority && !NODE_PRIORITIES.includes(body.priority)) {
    return c.json({ error: `invalid priority, must be one of: ${NODE_PRIORITIES.join(', ')}` }, 400)
  }
  if (body.year && (typeof body.year !== 'number' || body.year < -5000 || body.year > 3000)) {
    return c.json({ error: 'invalid year' }, 400)
  }

  const now = new Date().toISOString()
  const node = {
    id: crypto.randomUUID(),
    title: body.title.trim(),
    type: body.type,
    description: body.description?.slice(0, 5000) ?? null,
    status: body.status ?? 'pendiente',
    priority: body.priority ?? 'media',
    tags: body.tags ? JSON.stringify(body.tags.slice(0, 50)) : null,
    author: body.author?.slice(0, 300) ?? null,
    year: body.year ?? null,
    link: body.link?.slice(0, 2000) ?? null,
    localFile: body.localFile?.slice(0, 500) ?? null,
    createdAt: now,
    updatedAt: now,
  }
  await db.insert(nodes).values(node)
  return c.json(node, 201)
})

router.put('/:id', async (c) => {
  const id = c.req.param('id')
  const body = await c.req.json<Partial<CreateNodeInput>>()
  const [existing] = await db.select().from(nodes).where(eq(nodes.id, id)).limit(1)
  if (!existing) return c.json({ error: 'not found' }, 404)

  if (body.title !== undefined && (typeof body.title !== 'string' || body.title.trim().length === 0)) {
    return c.json({ error: 'title cannot be empty' }, 400)
  }

  const update: Record<string, unknown> = { updatedAt: new Date().toISOString() }
  if (body.title !== undefined) update.title = body.title.trim().slice(0, 500)
  if (body.type !== undefined) update.type = body.type
  if (body.description !== undefined) update.description = body.description?.slice(0, 5000) ?? null
  if (body.status !== undefined) update.status = body.status
  if (body.priority !== undefined) update.priority = body.priority
  if (body.tags !== undefined) update.tags = JSON.stringify(body.tags.slice(0, 50))
  if (body.author !== undefined) update.author = body.author?.slice(0, 300) ?? null
  if (body.year !== undefined) update.year = body.year
  if (body.link !== undefined) update.link = body.link?.slice(0, 2000) ?? null
  if (body.localFile !== undefined) update.localFile = body.localFile?.slice(0, 500) ?? null
  if (body.rating !== undefined) update.rating = body.rating

  await db.update(nodes).set(update).where(eq(nodes.id, id))
  const [updated] = await db.select().from(nodes).where(eq(nodes.id, id)).limit(1)
  return c.json(updated)
})

router.delete('/:id', async (c) => {
  const id = c.req.param('id')
  await db.delete(nodes).where(eq(nodes.id, id))
  return c.json({ success: true })
})

export default router
