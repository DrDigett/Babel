import { db } from '../db'
import { nodes } from '../db/schema'
import { Hono } from 'hono'
import { like, or } from 'drizzle-orm'

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
        like(nodes.title, `%${sanitized}%`),
        like(nodes.description, `%${sanitized}%`),
        like(nodes.author, `%${sanitized}%`),
        like(nodes.tags, `%${sanitized}%`),
      ),
    )

  return c.json(results)
})

export default router
