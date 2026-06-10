import crypto from 'node:crypto'
import { db } from '../db'
import { nodes, relations } from '../db/schema'
import { Hono } from 'hono'
import { eq, and } from 'drizzle-orm'
import type { CreateRelationInput, RelationType } from '@babel-plus/shared'

const RELATION_TYPES: RelationType[] = [
  'es_autor_de', 'dirigio', 'trata_sobre', 'pertenece_a',
  'influyo_a', 'critica_a', 'inspiro', 'ocurre_en', 'similar_a',
]

const router = new Hono()

router.get('/', async (c) => {
  const sourceId = c.req.query('sourceId')
  const targetId = c.req.query('targetId')

  const conditions = []
  if (sourceId) conditions.push(eq(relations.sourceId, sourceId))
  if (targetId) conditions.push(eq(relations.targetId, targetId))

  const all = conditions.length
    ? await db.select().from(relations).where(and(...conditions))
    : await db.select().from(relations)

  return c.json(all)
})

router.post('/', async (c) => {
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

  const [sourceExists] = await db.select({ id: nodes.id }).from(nodes).where(eq(nodes.id, body.sourceId)).limit(1)
  const [targetExists] = await db.select({ id: nodes.id }).from(nodes).where(eq(nodes.id, body.targetId)).limit(1)
  if (!sourceExists) return c.json({ error: 'source node not found' }, 404)
  if (!targetExists) return c.json({ error: 'target node not found' }, 404)

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
    createdAt: new Date().toISOString(),
  }
  await db.insert(relations).values(relation)
  return c.json(relation, 201)
})

router.delete('/:id', async (c) => {
  const id = c.req.param('id')
  await db.delete(relations).where(eq(relations.id, id))
  return c.json({ success: true })
})

export default router
