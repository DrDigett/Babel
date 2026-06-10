import crypto from 'node:crypto'
import { db } from '../db'
import { nodes, relations } from '../db/schema'
import { Hono } from 'hono'
import { eq } from 'drizzle-orm'
import type { CreateRelationInput } from '@babel-plus/shared'
import { RELATION_TYPES } from '@babel-plus/shared'

const router = new Hono()

router.get('/', (c) => {
  const sourceId = c.req.query('sourceId')
  const targetId = c.req.query('targetId')

  const all = db.select().from(relations).all()
  let filtered = all
  if (sourceId) filtered = filtered.filter((r) => r.sourceId === sourceId)
  if (targetId) filtered = filtered.filter((r) => r.targetId === targetId)
  return c.json(filtered)
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

  const sourceExists = db.select({ id: nodes.id }).from(nodes).where(eq(nodes.id, body.sourceId)).get()
  const targetExists = db.select({ id: nodes.id }).from(nodes).where(eq(nodes.id, body.targetId)).get()
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
  db.insert(relations).values(relation).run()
  return c.json(relation, 201)
})

router.delete('/:id', (c) => {
  const id = c.req.param('id')
  db.delete(relations).where(eq(relations.id, id)).run()
  return c.json({ success: true })
})

export default router
