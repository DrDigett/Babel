import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { serveStatic } from 'hono/serve-static'
import { readFile, stat } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { sql, asc } from 'drizzle-orm'
import { config } from './lib/config'
import { db } from './db'
import { nodes, lists, listNodes } from './db/schema'
import { migrate } from './db/migrate'
import aiRouter from './routes/ai'
import nodesRouter from './routes/nodes'
import relationsRouter from './routes/relations'
import searchRouter from './routes/search'
import listsRouter from './routes/lists'
import authRouter from './routes/auth'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const clientDist = join(__dirname, '../../client/dist')

const app = new Hono()

app.use(
  '/*',
  cors({
    origin: config.corsOrigin,
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
  }),
)

app.onError((err, c) => {
  console.error('Unhandled error:', err)
  return c.json({ error: err instanceof Error ? err.message : 'Internal server error' }, 500)
})
app.route('/api/nodes', nodesRouter)
app.route('/api/relations', relationsRouter)
app.route('/api/search', searchRouter)
app.route('/api/ai', aiRouter)
app.route('/api/lists', listsRouter)
app.route('/api/auth', authRouter)

app.get('/api/health', (c) => c.json({ status: 'ok' }))

if (config.nodeEnv === 'production') {
  app.use('/*', serveStatic({
    root: clientDist,
    getContent: async (path) => {
      try {
        const buf = await readFile(path)
        return buf as unknown as string
      } catch {
        return null
      }
    },
    isDir: async (path) => {
      try {
        const s = await stat(path)
        return s.isDirectory()
      } catch {
        return false
      }
    },
  }))

  app.get('*', async (c) => {
    const html = (await readFile(join(clientDist, 'index.html'))).toString()
    return c.html(html)
  })
}

async function bootstrap() {
  console.log('Running database migrations...')
  await migrate()

  const [{ count }] = await db.select({ count: sql<number>`count(*)` }).from(nodes)
  if (count === 0) {
    console.log('Database is empty, seeding...')
    const { seed } = await import('./db/seed')
    await seed()
  } else {
    console.log(`Database has ${count} nodes, skipping node seed`)
  }

  const [{ listCount }] = await db.select({ listCount: sql<number>`count(*)` }).from(lists)
  if (listCount === 0) {
    console.log('Lists table is empty, seeding lists...')
    const allNodes = await db.select({ id: nodes.id, title: nodes.title }).from(nodes).orderBy(asc(nodes.createdAt))
    if (allNodes.length > 0) {
      const crypto = await import('node:crypto')
      const now = new Date().toISOString()
      const chars = 'abcdefghijklmnopqrstuvwxyz0123456789'
      let listId = ''
      for (let i = 0; i < 4; i++) listId += chars[Math.floor(Math.random() * chars.length)]

      await db.insert(lists).values({
        id: listId,
        name: 'Todos los nodos',
        description: 'Lista principal con todos los nodos del grafo',
        createdAt: now,
        updatedAt: now,
      })

      const entries = allNodes.map((n, i) => ({
        id: crypto.randomUUID(),
        listId,
        nodeId: n.id,
        position: i,
        createdAt: now,
      }))
      await db.insert(listNodes).values(entries)
      console.log(`Lista '${listId}' creada con ${entries.length} nodos`)
    }
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
