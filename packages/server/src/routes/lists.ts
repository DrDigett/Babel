import crypto from 'node:crypto'
import { db } from '../db'
import { lists, listNodes, nodes } from '../db/schema'
import { Hono } from 'hono'
import { eq, and, asc, sql } from 'drizzle-orm'
import { requireAuth } from '../lib/auth'
import { getUserId, type AppEnv } from '../lib/types'
import type { CreateListInput } from '@babel-plus/shared'

const router = new Hono<AppEnv>()

router.use('*', requireAuth)

function generateId(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789'
  let id = ''
  for (let i = 0; i < 4; i++) {
    id += chars[Math.floor(Math.random() * chars.length)]
  }
  return id
}

async function generateUniqueId(): Promise<string> {
  for (let attempt = 0; attempt < 10; attempt++) {
    const id = generateId()
    const [existing] = await db.select({ id: lists.id }).from(lists).where(eq(lists.id, id)).limit(1)
    if (!existing) return id
  }
  throw new Error('Could not generate unique list ID')
}

router.get('/', async (c) => {
  const userId = getUserId(c)
  const all = await db.select().from(lists).where(eq(lists.userId, userId)).orderBy(asc(lists.createdAt))
  return c.json(all)
})

router.post('/', async (c) => {
  const userId = getUserId(c)
  const body = await c.req.json<CreateListInput>()
  if (body.name !== undefined && (typeof body.name !== 'string' || body.name.trim().length === 0)) {
    return c.json({ error: 'name cannot be empty' }, 400)
  }
  if (body.name && body.name.length > 200) {
    return c.json({ error: 'name too long (max 200)' }, 400)
  }

  const now = new Date().toISOString()
  const id = await generateUniqueId()
  const list = {
    id,
    name: body.name?.trim() ?? id,
    description: body.description?.slice(0, 2000) ?? null,
    userId,
    createdAt: now,
    updatedAt: now,
  }
  await db.insert(lists).values(list)
  return c.json(list, 201)
})

router.get('/:id', async (c) => {
  const userId = getUserId(c)
  const id = c.req.param('id')
  const [list] = await db.select().from(lists).where(and(eq(lists.id, id), eq(lists.userId, userId))).limit(1)
  if (!list) return c.json({ error: 'not found' }, 404)

  const items = await db
    .select({
      node: nodes,
      position: listNodes.position,
      listRating: listNodes.rating,
    })
    .from(listNodes)
    .where(eq(listNodes.listId, id))
    .innerJoin(nodes, eq(listNodes.nodeId, nodes.id))
    .orderBy(asc(listNodes.position))

  return c.json({
    ...list,
    nodes: items.map(i => ({
      ...i.node,
      position: i.position,
      listRating: i.listRating ?? null,
    })),
  })
})

router.put('/:id', async (c) => {
  const userId = getUserId(c)
  const id = c.req.param('id')
  const body = await c.req.json<Partial<CreateListInput>>()
  const [existing] = await db.select().from(lists).where(and(eq(lists.id, id), eq(lists.userId, userId))).limit(1)
  if (!existing) return c.json({ error: 'not found' }, 404)

  if (body.name !== undefined && (typeof body.name !== 'string' || body.name.trim().length === 0)) {
    return c.json({ error: 'name cannot be empty' }, 400)
  }

  const update: Record<string, unknown> = { updatedAt: new Date().toISOString() }
  if (body.name !== undefined) update.name = body.name.trim().slice(0, 200)
  if (body.description !== undefined) update.description = body.description?.slice(0, 2000) ?? null

  await db.update(lists).set(update).where(eq(lists.id, id))
  const [updated] = await db.select().from(lists).where(eq(lists.id, id)).limit(1)
  return c.json(updated)
})

router.delete('/:id', async (c) => {
  const userId = getUserId(c)
  const id = c.req.param('id')
  const [existing] = await db.select({ id: lists.id }).from(lists).where(and(eq(lists.id, id), eq(lists.userId, userId))).limit(1)
  if (!existing) return c.json({ error: 'not found' }, 404)

  await db.delete(lists).where(eq(lists.id, id))
  return c.json({ success: true })
})

router.post('/:id/nodes', async (c) => {
  const userId = getUserId(c)
  const listId = c.req.param('id')
  const { nodeId } = await c.req.json<{ nodeId: string }>()

  const [list] = await db.select({ id: lists.id }).from(lists).where(and(eq(lists.id, listId), eq(lists.userId, userId))).limit(1)
  if (!list) return c.json({ error: 'list not found' }, 404)

  const [node] = await db.select({ id: nodes.id }).from(nodes).where(and(eq(nodes.id, nodeId), eq(nodes.userId, userId))).limit(1)
  if (!node) return c.json({ error: 'node not found' }, 404)

  const [existingEntry] = await db
    .select({ id: listNodes.id })
    .from(listNodes)
    .where(and(eq(listNodes.listId, listId), eq(listNodes.nodeId, nodeId)))
    .limit(1)
  if (existingEntry) return c.json({ error: 'node already in list' }, 409)

  const [{ maxPos }] = await db
    .select({ maxPos: sql<number>`COALESCE(MAX(position), -1)` })
    .from(listNodes)
    .where(eq(listNodes.listId, listId))

  const entry = {
    id: crypto.randomUUID(),
    listId,
    nodeId,
    position: maxPos + 1,
    createdAt: new Date().toISOString(),
  }
  await db.insert(listNodes).values(entry)
  return c.json(entry, 201)
})

router.delete('/:id/nodes/:nodeId', async (c) => {
  const userId = getUserId(c)
  const listId = c.req.param('id')
  const nodeId = c.req.param('nodeId')

  const [list] = await db.select({ id: lists.id }).from(lists).where(and(eq(lists.id, listId), eq(lists.userId, userId))).limit(1)
  if (!list) return c.json({ error: 'list not found' }, 404)

  const [existingEntry] = await db
    .select({ id: listNodes.id })
    .from(listNodes)
    .where(and(eq(listNodes.listId, listId), eq(listNodes.nodeId, nodeId)))
    .limit(1)
  if (!existingEntry) return c.json({ error: 'not found' }, 404)

  await db.delete(listNodes).where(eq(listNodes.id, existingEntry.id))
  return c.json({ success: true })
})

router.put('/:id/nodes/:nodeId/rating', async (c) => {
  const userId = getUserId(c)
  const listId = c.req.param('id')
  const nodeId = c.req.param('nodeId')
  const { rating } = await c.req.json<{ rating: number | null }>()

  const [list] = await db.select({ id: lists.id }).from(lists).where(and(eq(lists.id, listId), eq(lists.userId, userId))).limit(1)
  if (!list) return c.json({ error: 'list not found' }, 404)

  const [existingEntry] = await db
    .select({ id: listNodes.id })
    .from(listNodes)
    .where(and(eq(listNodes.listId, listId), eq(listNodes.nodeId, nodeId)))
    .limit(1)
  if (!existingEntry) return c.json({ error: 'not found' }, 404)

  await db.update(listNodes).set({ rating }).where(eq(listNodes.id, existingEntry.id))
  return c.json({ success: true })
})

router.put('/:id/nodes/reorder', async (c) => {
  const userId = getUserId(c)
  const listId = c.req.param('id')
  const { nodeIds } = await c.req.json<{ nodeIds: string[] }>()

  const [list] = await db.select({ id: lists.id }).from(lists).where(and(eq(lists.id, listId), eq(lists.userId, userId))).limit(1)
  if (!list) return c.json({ error: 'list not found' }, 404)

  for (let i = 0; i < nodeIds.length; i++) {
    await db
      .update(listNodes)
      .set({ position: i })
      .where(and(eq(listNodes.listId, listId), eq(listNodes.nodeId, nodeIds[i])))
  }

  return c.json({ success: true })
})

export default router
