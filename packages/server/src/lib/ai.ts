import type { NodeType, RelationType } from '@babel-plus/shared'
import OpenAI from 'openai'
import { config } from './config'
import { db } from '../db'
import { nodes } from '../db/schema'

const client = new OpenAI({
  baseURL: 'https://api.groq.com/openai/v1',
  apiKey: config.groqApiKey,
})

interface ClassifiedNode {
  title: string
  type: NodeType
  description: string | null
  status: 'pendiente'
  priority: 'media'
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

export async function classifyAndSuggest(input: string, typeHint?: string): Promise<AIResult> {
  const existingNodes = await db.select({ title: nodes.title, type: nodes.type, description: nodes.description, tags: nodes.tags }).from(nodes)

  const nodeList = existingNodes.map(n => {
    const parts = [`  - "${n.title}" (${n.type})`]
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
    "priority": "media",
    "tags": ["etiqueta1", "etiqueta2"],
    "author": "autor o null",
    "year": 2024 o null,
    "link": null
  },
  "relations": [
    { "targetTitle": "nombre exacto del nodo existente", "type": "tipo_relacion", "weight": 1.0 }
  ]
}

TIPOS DE RELACIÓN DISPONIBLES:
- es_autor_de: cuando el nuevo contenido fue creado por un autor existente
- dirigio: cuando el nuevo contenido fue dirigido por un director existente
- trata_sobre: cuando el nuevo contenido trata sobre un concepto, escuela o evento existente
- pertenece_a: cuando el nuevo contenido pertenece a una escuela o corriente existente
- influyo_a: cuando el autor del nuevo contenido influyó en un filosofo/escritor existente
- critica_a: cuando el nuevo contenido critica a un autor o concepto existente
- inspiro: cuando el nuevo contenido se inspiró en una obra existente
- ocurre_en: cuando el nuevo contenido ocurre en un evento o época existente
- similar_a: cuando el nuevo contenido es temáticamente similar a otro del mismo tipo

REGLAS IMPORTANTES:
- Conecta SOLO con nodos EXISTENTES de la lista provista abajo. El targetTitle debe coincidir EXACTAMENTE con el nombre listado.
- Usa el RESUMEN y los TAGS de cada nodo existente para decidir si hay relación temática real.
- Si los TAGS del nuevo nodo coinciden o son similares a los TAGS de un nodo existente, genera una relación "trata_sobre". El peso debe ser proporcional a la cantidad de tags compartidos (1.0 si comparte 3+, 0.7 si 2, 0.4 si 1).
- No inventes nodos. Solo relaciona con los que YA EXISTEN en la lista de abajo.
- similar_a solo entre contenidos del mismo tipo (libro-libro, pelicula-pelicula, videojuego-videojuego).

NODOS EXISTENTES (targetTitle debe coincidir exactamente, usa su resumen y tags para decidir relaciones):
${nodeList}

Texto del usuario: "${input}"

JSON:`

  let response
  try {
    response = await client.chat.completions.create({
      model: 'llama-3.1-8b-instant',
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
