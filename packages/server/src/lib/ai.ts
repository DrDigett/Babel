// ponytail: Groq migration - llama-3.1-8b-instant deprecated 2026-08-16.
// Using openai/gpt-oss-20b (free tier, 30 RPM / 1K RPD / 8K TPM / 200K TPD).
// Alternative: Gemini Flash (better multilingual, but new SDK + data sent to Google).
// Upgrade path: openai/gpt-oss-120b for better quality (same limits, same SDK).
import type { NodeType, RelationType } from '@babel-plus/shared'
import OpenAI from 'openai'
import crypto from 'node:crypto'
import { eq, and, sql } from 'drizzle-orm'
import { config } from './config'
import { db } from '../db'
import { nodes, relations } from '../db/schema'

const client = new OpenAI({
  baseURL: 'https://api.groq.com/openai/v1',
  apiKey: config.groqApiKey,
})

interface ClassifiedNode {
  title: string
  type: NodeType
  description: string | null
  status: 'pendiente'
  tags: string[]
  author: string | null
  year: number | null
  link: string | null
}

interface SuggestedRelation {
  targetTitle: string
  type: RelationType
  weight: number
}

interface AIResult {
  node: ClassifiedNode
  relations: SuggestedRelation[]
}

export async function classifyAndSuggest(input: string, typeHint?: string, userId?: string): Promise<AIResult> {
  const existingNodes = userId
    ? await db.select({
        title: nodes.title,
        type: nodes.type,
        author: nodes.author,
        year: nodes.year,
        description: nodes.description,
        tags: nodes.tags,
      }).from(nodes).where(eq(nodes.userId, userId))
    : await db.select({
        title: nodes.title,
        type: nodes.type,
        author: nodes.author,
        year: nodes.year,
        description: nodes.description,
        tags: nodes.tags,
      }).from(nodes)

  const nodeList = existingNodes.map(n => {
    const parts = [`  - "${n.title}" (${n.type})`]
    if (n.author) parts.push(`    Autor/Director: "${n.author}"`)
    if (n.year) parts.push(`    Año: ${n.year}`)
    if (n.description) parts.push(`    Resumen: "${n.description}"`)
    if (n.tags) {
      try { parts.push(`    Tags: ${JSON.stringify(JSON.parse(n.tags))}`) } catch { parts.push(`    Tags: ${n.tags}`) }
    }
    return parts.join('\n')
  }).join('\n')

  const typeInstruction = typeHint
    ? `IMPORTANTE: El usuario seleccionó manualmente el tipo "${typeHint}". DEBES usar exactamente ese type, no intentes inferirlo.`
    : ''

  const prompt = `Eres un asistente experto en clasificación de contenido para una biblioteca personal de conocimiento basada en grafos.

${typeInstruction}

Interpreta el texto del usuario y extrae la información siguiendo estas reglas:

1. Extraer título del contenido.
2. Extraer resumen corto (1 frase).
3. Identificar el tipo correcto entre: libro, pelicula, articulo, video, curso, videojuego.
4. Identificar autores/directores relevantes.
5. Identificar año si se menciona.
6. Identificar conceptos principales.
7. Identificar corrientes filosóficas o científicas.
8. Identificar eventos históricos mencionados.

Debes devolver UNICAMENTE un objeto JSON sin texto adicional, usando esta estructura exacta:
{
  "node": {
    "title": "título del contenido",
    "type": "tipo del contenido",
    "description": "resumen corto o null",
    "status": "pendiente",
    "tags": ["etiqueta1", "etiqueta2"],
    "author": "autor o null",
    "year": 2024 o null,
    "link": null
  },
  "relations": [
    { "targetTitle": "nombre exacto del nodo existente", "type": "tipo_relacion", "weight": 1.0 }
  ]
}

TIPOS DE RELACIÓN Y REGLAS DE CONEXIÓN:
- es_autor_de: cuando el autor del nuevo contenido es autor de una obra existente o viceversa (peso: 1.0).
- dirigio: cuando el director del nuevo contenido dirigió una película/video existente o viceversa (peso: 1.0).
- trata_sobre: cuando el nuevo contenido trata sobre el tema, concepto o tags de un nodo existente.
  * Peso 1.0 si comparten 3 o más tags temáticos o abordan exactamente el mismo concepto central.
  * Peso 0.7 si comparten 2 tags temáticos o tratan sobre un tema estrechamente relacionado.
  * Peso 0.4 si comparten 1 tag temático o mención secundaria.
- pertenece_a: cuando el contenido pertenece a una escuela de pensamiento, corriente filosófica, saga o universo existente (peso: 0.8 - 1.0).
- influyo_a: cuando el autor o la obra influyó directamente en otro autor o corriente existente (peso: 0.7 - 1.0).
- critica_a: cuando el nuevo contenido critica, debate o rebate a un autor, obra o concepto existente (peso: 0.8 - 1.0).
- inspiro: cuando el nuevo contenido se inspiró en una obra existente (peso: 0.7 - 0.9).
- ocurre_en: cuando el nuevo contenido ocurre en un evento o época histórica existente (peso: 0.8 - 1.0).
- similar_a: cuando dos nodos son temáticamente afines (solo entre el mismo tipo: libro-libro, pelicula-pelicula, etc.) (peso: 0.5 - 0.9).

REGLAS IMPORTANTES:
- Conecta SOLO con nodos EXISTENTES de la lista provista abajo. El targetTitle debe coincidir EXACTAMENTE con el nombre listado.
- Usa el RESUMEN, AUTOR y los TAGS de cada nodo existente para decidir si hay relación temática real.
- Asigna peso ('weight') numérico entre 0.1 y 1.0 según la fuerza de la relación (1.0=central/directo, 0.7=importante, 0.4=secundario, 0.2=débil).
- No inventes nodos. Solo relaciona con los que YA EXISTEN en la lista de abajo del mismo usuario.
- Si no hay relaciones temáticas claras con los nodos existentes, devuelve "relations": [].

NODOS EXISTENTES (targetTitle debe coincidir exactamente, usa su autor, resumen y tags para decidir relaciones):
${nodeList}

Texto del usuario: "${input}"

JSON:`

  let response
  try {
    response = await client.chat.completions.create({
      model: 'openai/gpt-oss-20b',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
      response_format: { type: 'json_object' },
    })
  } catch (err) {
    throw new Error(`Groq API error: ${err instanceof Error ? err.message : 'Unknown error'}`)
  }

  const text = response.choices[0]?.message?.content ?? ''

  const parsed = extractJson(text)
  if (!parsed) {
    throw new Error(`AI response parse error: invalid JSON from model. Raw: ${text.slice(0, 300)}`)
  }

  return parsed as AIResult
}

function extractJson(text: string): unknown | null {
  const cleaned = text
    .replace(/```json\s*/g, '')
    .replace(/```\s*/g, '')
    .trim()
  try {
    return JSON.parse(cleaned)
  } catch {
    const match = cleaned.match(/\{[\s\S]*\}/)
    if (match) {
      try {
        return JSON.parse(match[0])
      } catch {
        return null
      }
    }
    return null
  }
}

export async function reevaluateNode(id: string, userId?: string) {
  const conditions = [eq(nodes.id, id)]
  if (userId) conditions.push(eq(nodes.userId, userId))

  const [node] = await db.select().from(nodes).where(and(...conditions)).limit(1)
  if (!node) throw new Error('Node not found')

  const effectiveUserId = node.userId ?? userId ?? undefined

  const parts = [node.title]
  if (node.author) parts.push(`Autor: ${node.author}`)
  if (node.year) parts.push(`Año: ${node.year}`)
  if (node.description) parts.push(node.description)
  if (node.tags) {
    try { parts.push(`Tags: ${JSON.parse(node.tags).join(', ')}`) } catch {}
  }
  const input = parts.join('. ')

  const result = await classifyAndSuggest(input, node.type, effectiveUserId)

  const outConditions = [eq(relations.sourceId, id)]
  const inConditions = [eq(relations.targetId, id)]
  if (effectiveUserId) {
    outConditions.push(eq(relations.userId, effectiveUserId))
    inConditions.push(eq(relations.userId, effectiveUserId))
  }

  const existingOut = await db.select().from(relations).where(and(...outConditions))
  const existingIn = await db.select().from(relations).where(and(...inConditions))

  const now = new Date().toISOString()
  const added: string[] = []
  const kept: string[] = []
  const removed: string[] = []

  // 1. Process suggested relations from AI
  for (const suggested of result.relations) {
    const targetConditions = [sql`LOWER(${nodes.title}) = LOWER(${suggested.targetTitle.trim()})`]
    if (effectiveUserId) targetConditions.push(eq(nodes.userId, effectiveUserId))

    const [target] = await db
      .select({ id: nodes.id, title: nodes.title })
      .from(nodes)
      .where(and(...targetConditions))
      .limit(1)

    if (!target || target.id === id) continue

    const alreadyExists = existingOut.some(
      r => r.targetId === target.id && r.type === suggested.type
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
        userId: effectiveUserId ?? null,
        createdAt: now,
      })
      added.push(target.id)
    }
  }

  // 2. Remove old relations that are no longer suggested
  for (const existing of existingOut) {
    const targetConds = [eq(nodes.id, existing.targetId)]
    if (effectiveUserId) targetConds.push(eq(nodes.userId, effectiveUserId))

    const [targetNode] = await db.select({ title: nodes.title }).from(nodes).where(and(...targetConds)).limit(1)
    const targetTitle = targetNode?.title
    const wasInSuggested = targetTitle
      ? result.relations.some(
          s => s.type === existing.type && s.targetTitle.trim().toLowerCase() === targetTitle.trim().toLowerCase()
        )
      : false

    if (!wasInSuggested) {
      const deleteConds = [eq(relations.id, existing.id)]
      if (effectiveUserId) deleteConds.push(eq(relations.userId, effectiveUserId))
      await db.delete(relations).where(and(...deleteConds))
      removed.push(existing.targetId)
    }
  }

  const updatedOut = await db.select().from(relations).where(and(...outConditions))

  return {
    kept: kept.length,
    added: added.length,
    removed: removed.length,
    outgoing: updatedOut,
    incoming: existingIn,
  }
}

export async function reevaluateAllNodes(userId?: string, onProgress?: (current: number, total: number, title: string) => void) {
  // Limpiar relaciones huérfanas (que apuntan a nodos inexistentes)
  await db.execute(sql`
    DELETE FROM relations 
    WHERE source_id NOT IN (SELECT id FROM nodes) 
       OR target_id NOT IN (SELECT id FROM nodes)
  `)

  // Limpiar relaciones duplicadas
  await db.execute(sql`
    DELETE FROM relations r1
    USING relations r2
    WHERE r1.id > r2.id
      AND r1.source_id = r2.source_id
      AND r1.target_id = r2.target_id
      AND r1.type = r2.type
  `)

  const nodeConditions = []
  if (userId) nodeConditions.push(eq(nodes.userId, userId))

  const allNodes = await db
    .select({ id: nodes.id, title: nodes.title, userId: nodes.userId })
    .from(nodes)
    .where(nodeConditions.length > 0 ? and(...nodeConditions) : undefined)

  const summary = {
    totalNodes: allNodes.length,
    processed: 0,
    totalAdded: 0,
    totalRemoved: 0,
    totalKept: 0,
    errors: [] as { nodeId: string; title: string; error: string }[],
  }

  for (let i = 0; i < allNodes.length; i++) {
    const node = allNodes[i]
    if (onProgress) onProgress(i + 1, allNodes.length, node.title)
    try {
      if (i > 0) {
        // Pausa de 2s para respetar límites de RPM de Groq
        await new Promise(r => setTimeout(r, 2000))
      }
      const res = await reevaluateNode(node.id, node.userId ?? undefined)
      summary.processed++
      summary.totalAdded += res.added
      summary.totalRemoved += res.removed
      summary.totalKept += res.kept
    } catch (err) {
      summary.errors.push({
        nodeId: node.id,
        title: node.title,
        error: err instanceof Error ? err.message : 'Unknown error',
      })
    }
  }

  return summary
}
