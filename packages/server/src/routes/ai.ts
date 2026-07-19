import crypto from 'node:crypto'
import { db } from '../db'
import { nodes, relations } from '../db/schema'
import { Hono } from 'hono'
import { eq, sql } from 'drizzle-orm'
import { classifyAndSuggest } from '../lib/ai'

const router = new Hono()

router.post('/classify', async (c) => {
  const { text, typeHint } = await c.req.json<{ text: string; typeHint?: string }>()
  if (!text || typeof text !== 'string' || text.trim().length === 0) {
    return c.json({ error: 'text is required' }, 400)
  }
  if (text.length > 10000) {
    return c.json({ error: 'text too long (max 10000)' }, 400)
  }

  const result = await classifyAndSuggest(text.trim().slice(0, 10000), typeHint)
  return c.json(result)
})

router.post('/smart-add', async (c) => {
  const { text, typeHint } = await c.req.json<{ text: string; typeHint?: string }>()
  if (!text || typeof text !== 'string' || text.trim().length === 0) {
    return c.json({ error: 'text is required' }, 400)
  }
  if (text.length > 10000) {
    return c.json({ error: 'text too long (max 10000)' }, 400)
  }

  const result = await classifyAndSuggest(text, typeHint)
  const now = new Date().toISOString()

  const nodeId = crypto.randomUUID()
  const node = {
    id: nodeId,
    title: result.node.title,
    type: result.node.type,
    description: result.node.description ?? null,
    status: result.node.status ?? 'pendiente',
    tags: result.node.tags.length > 0 ? JSON.stringify(result.node.tags) : null,
    author: result.node.author ?? null,
    year: result.node.year ?? null,
    link: result.node.link ?? null,
    localFile: null,
    createdAt: now,
    updatedAt: now,
  }

  await db.insert(nodes).values(node)

  const createdRelations = []
  for (const rel of result.relations) {
    const [target] = await db
      .select({ id: nodes.id, title: nodes.title })
      .from(nodes)
      .where(sql`LOWER(${nodes.title}) = LOWER(${rel.targetTitle})`)
      .limit(1)

    if (target) {
      const relation = {
        id: crypto.randomUUID(),
        sourceId: nodeId,
        targetId: target.id,
        type: rel.type,
        weight: rel.weight ?? 1.0,
        createdAt: now,
      }
      await db.insert(relations).values(relation)
      createdRelations.push({ ...relation, targetTitle: target.title })
    }
  }

  return c.json({
    node,
    relations: createdRelations,
  }, 201)
})

export default router
