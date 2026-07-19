import crypto from 'node:crypto'
import { db } from '../db'
import { nodes, relations } from '../db/schema'
import { Hono } from 'hono'
import { eq, sql, and } from 'drizzle-orm'
import { classifyAndSuggest } from '../lib/ai'
import OpenAI from 'openai'
import { config } from '../lib/config'

const groq = new OpenAI({
  baseURL: 'https://api.groq.com/openai/v1',
  apiKey: config.groqApiKey,
})

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

router.post('/reevaluate/:id', async (c) => {
  const id = c.req.param('id')
  const [node] = await db.select().from(nodes).where(eq(nodes.id, id)).limit(1)
  if (!node) return c.json({ error: 'node not found' }, 404)

  const parts = [node.title]
  if (node.author) parts.push(`Autor: ${node.author}`)
  if (node.year) parts.push(`Año: ${node.year}`)
  if (node.description) parts.push(node.description)
  if (node.tags) {
    try { parts.push(`Tags: ${JSON.parse(node.tags).join(', ')}`) } catch {}
  }
  const input = parts.join('. ')

  const result = await classifyAndSuggest(input, node.type)

  const existingOut = await db.select().from(relations).where(eq(relations.sourceId, id))
  const existingIn = await db.select().from(relations).where(eq(relations.targetId, id))

  const now = new Date().toISOString()
  const added: string[] = []
  const kept: string[] = []
  const removed: string[] = []

  for (const suggested of result.relations) {
    const [target] = await db
      .select({ id: nodes.id })
      .from(nodes)
      .where(sql`LOWER(${nodes.title}) = LOWER(${suggested.targetTitle})`)
      .limit(1)
    if (!target) continue

    const alreadyExists = existingOut.some(
      r => r.targetId === target.id && r.type === suggested.type,
    )
    if (alreadyExists) {
      kept.push(target.id)
    } else {
      await db.insert(relations).values({
        id: crypto.randomUUID(),
        sourceId: id,
        targetId: target.id,
        type: suggested.type,
        weight: suggested.weight ?? 1.0,
        createdAt: now,
      })
      added.push(target.id)
    }
  }

  for (const existing of existingOut) {
    const stillSuggested = result.relations.some(s => {
      const match = existingOut.find(r => r.id === existing.id)
      return match && s.type === existing.type
    })
    if (!stillSuggested) {
      const targetNode = await db.select({ title: nodes.title }).from(nodes).where(eq(nodes.id, existing.targetId)).limit(1)
      const targetTitle = targetNode[0]?.title ?? existing.targetId
      const wasInSuggested = result.relations.some(
        s => s.type === existing.type && sql`LOWER(${s.targetTitle}) = LOWER(${targetTitle})`
      )
      if (!wasInSuggested) {
        await db.delete(relations).where(eq(relations.id, existing.id))
        removed.push(existing.targetId)
      }
    }
  }

  const updatedOut = await db.select().from(relations).where(eq(relations.sourceId, id))

  return c.json({
    kept: kept.length,
    added: added.length,
    removed: removed.length,
    outgoing: updatedOut,
    incoming: existingIn,
  })
})

router.post('/research', async (c) => {
  const { url } = await c.req.json<{ url: string }>()
  if (!url || typeof url !== 'string') {
    return c.json({ error: 'url is required' }, 400)
  }
  if (!url.startsWith('https://')) {
    return c.json({ error: 'only HTTPS links are accepted' }, 400)
  }

  let html: string
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; BaBelBot/1.0)' },
      signal: AbortSignal.timeout(15000),
    })
    if (!res.ok) return c.json({ error: `fetch failed: ${res.status}` }, 400)
    html = await res.text()
  } catch (err) {
    return c.json({ error: `could not fetch URL: ${err instanceof Error ? err.message : 'unknown'}` }, 400)
  }

  const text = html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<nav[\s\S]*?<\/nav>/gi, '')
    .replace(/<footer[\s\S]*?<\/footer>/gi, '')
    .replace(/<header[\s\S]*?<\/header>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 8000)

  if (text.length < 20) {
    return c.json({ error: 'page content too short to extract metadata' }, 400)
  }

  const prompt = `Extrae los metadatos del siguiente contenido web. Devuelve SOLO un JSON sin texto adicional:
{
  "title": "título del contenido o null",
  "author": "autor o null",
  "tags": ["etiqueta1", "etiqueta2"],
  "year": 2024 o null
}

Reglas:
- Si no encuentras un campo, usa null (o array vacío para tags).
- Tags deben ser conceptos clave, no más de 8.
- Year debe ser un número entero.

Contenido:
"${text}"`

  let result: { title?: string | null; author?: string | null; tags?: string[]; year?: number | null }
  try {
    const response = await groq.chat.completions.create({
      model: 'llama-3.1-8b-instant',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.2,
      response_format: { type: 'json_object' },
    })
    const raw = response.choices[0]?.message?.content ?? ''
    const cleaned = raw.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim()
    result = JSON.parse(cleaned)
  } catch {
    return c.json({ error: 'AI could not extract metadata from this page' }, 400)
  }

  return c.json({
    title: result.title || null,
    author: result.author || null,
    tags: Array.isArray(result.tags) ? result.tags.slice(0, 8) : [],
    year: typeof result.year === 'number' ? result.year : null,
  })
})

export default router
