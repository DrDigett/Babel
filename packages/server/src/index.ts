import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { sql } from 'drizzle-orm'
import { config } from './lib/config'
import { db } from './db'
import { nodes } from './db/schema'
import { migrate } from './db/migrate'
import aiRouter from './routes/ai'
import nodesRouter from './routes/nodes'
import relationsRouter from './routes/relations'
import searchRouter from './routes/search'

const app = new Hono()

app.use(
  '/*',
  cors({
    origin: config.corsOrigin,
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
  }),
)
app.route('/api/nodes', nodesRouter)
app.route('/api/relations', relationsRouter)
app.route('/api/search', searchRouter)
app.route('/api/ai', aiRouter)

app.get('/api/health', (c) => c.json({ status: 'ok' }))

async function bootstrap() {
  console.log('Running database migrations...')
  await migrate()

  const [{ count }] = await db.select({ count: sql<number>`count(*)` }).from(nodes)
  if (count === 0) {
    console.log('Database is empty, seeding...')
    const { seed } = await import('./db/seed')
    await seed()
  } else {
    console.log(`Database has ${count} nodes, skipping seed`)
  }

  serve(
    {
      fetch: app.fetch,
      port: config.port,
      hostname: '0.0.0.0',
    },
    (info) => {
      console.log(`BaBel+ API running on http://0.0.0.0:${info.port}`)
    },
  )
}

bootstrap()
