import crypto from 'node:crypto'
import { db } from '../db'
import { nodes, relations } from '../db/schema'
import { Hono } from 'hono'
import { eq, and } from 'drizzle-orm'
import { requireAuth } from '../lib/auth'
import { getUserId, type AppEnv } from '../lib/types'
import type { CreateRelationInput, RelationType } from '@babel-plus/shared'

const RELATION_TYPES: RelationType[] = [
  'es_autor_de', 'dirigio', 'trata_sobre', 'pertenece_a',
  'influyo_a', 'critica_a', 'inspiro', 'ocurre_en', 'similar_a',
]

const router = new Hono<AppEnv>()

router.use('*', requireAuth)

router.get('/', async (c) => {
  const userId = getUserId(c)
  const sourceId = c.req.query('sourceId')
  const targetId = c.req.query('targetId')

  const conditions = [eq(relations.userId, userId)]
  if (sourceId) conditions.push(eq(relations.sourceId, sourceId))
  if (targetId) conditions.push(eq(relations.targetId, targetId))

  const all = await db.select().from(relations).where(and(...conditions))
  return c.json(all)
})

router.post('/', async (c) => {
  const userId = getUserId(c)
  const body = await c.req.json<CreateRelationInput>()
  if (!body.sourceId || !body.targetId) {
    return c.json({ error: 'sourceId and targetId are required' }, 400)
  }
  if (!body.type || !RELATION_TYPES.includes(body.type)) {
    return c.json({ error: `invalid type, must be one of: ${RELATION_TYPES.join(', ')}` }, 400)
  }
  if (body.sourceId === body.targetId) {
    return c.json({ error: 'source and target must be different' }, 400)
  }

  const [source] = await db.select({ id: nodes.id }).from(nodes).where(and(eq(nodes.id, body.sourceId), eq(nodes.userId, userId))).limit(1)
  const [target] = await db.select({ id: nodes.id }).from(nodes).where(and(eq(nodes.id, body.targetId), eq(nodes.userId, userId))).limit(1)
  if (!source) return c.json({ error: 'source node not found' }, 404)
  if (!target) return c.json({ error: 'target node not found' }, 404)

  const weight = body.weight ?? 1.0
  if (typeof weight !== 'number' || weight < 0 || weight > 1) {
    return c.json({ error: 'weight must be a number between 0 and 1' }, 400)
  }

  const relation = {
    id: crypto.randomUUID(),
    sourceId: body.sourceId,
    targetId: body.targetId,
    type: body.type,
    weight,
    userId,
    createdAt: new Date().toISOString(),
  }
  await db.insert(relations).values(relation)
  return c.json(relation, 201)
})

router.delete('/:id', async (c) => {
  const userId = getUserId(c)
  const id = c.req.param('id')
  const [existing] = await db.select({ id: relations.id }).from(relations).where(and(eq(relations.id, id), eq(relations.userId, userId))).limit(1)
  if (!existing) return c.json({ error: 'not found' }, 404)
  await db.delete(relations).where(eq(relations.id, id))
  return c.json({ success: true })
})

export default router
