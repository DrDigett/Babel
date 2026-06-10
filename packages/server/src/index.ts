import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { config } from './lib/config'
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

serve(
  {
    fetch: app.fetch,
    port: config.port,
  },
  (info) => {
    console.log(`BaBel+ API running on http://localhost:${info.port}`)
  },
)
