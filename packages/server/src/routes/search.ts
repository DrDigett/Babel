import { db } from '../db'
import { nodes } from '../db/schema'
import { Hono } from 'hono'
import { ilike, or } from 'drizzle-orm'

const router = new Hono()

router.get('/', async (c) => {
  const q = c.req.query('q')
  if (!q) return c.json([])

  const sanitized = q.trim().slice(0, 200)

  const results = await db
    .select()
    .from(nodes)
    .where(
      or(
        ilike(nodes.title, `%${sanitized}%`),
        ilike(nodes.description, `%${sanitized}%`),
        ilike(nodes.author, `%${sanitized}%`),
        ilike(nodes.tags, `%${sanitized}%`),
      ),
    )

  return c.json(results)
})

export default router
