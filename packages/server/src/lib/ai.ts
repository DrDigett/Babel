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
  const existingNodes = db.select({ title: nodes.title, type: nodes.type }).from(nodes).all()

  const grouped: Record<string, string[]> = {}
  for (const n of existingNodes) {
    if (!grouped[n.type]) grouped[n.type] = []
    grouped[n.type].push(n.title)
  }

  const nodeListByType = Object.entries(grouped)
    .map(([type, titles]) => `${type}: ${JSON.stringify(titles)}`)
    .join('\n')

  const typeInstruction = typeHint
    ? `IMPORTANTE: El usuario seleccionó manualmente el tipo "${typeHint}". DEBES usar exactamente ese type, no intentes inferirlo.`
    : ''

  const prompt = `Eres un asistente experto en clasificación de contenido para una biblioteca personal de conocimiento basada en grafos.

${typeInstruction}

Interpreta el texto del usuario y extrae la información siguiendo estas reglas:

1. Extraer título del contenido.
2. Extraer resumen corto (1 frase).
3. Identificar el tipo correcto entre: libro, pelicula, articulo, video, curso, evento, videojuego.
4. Identificar autores/directores relevantes.
5. Identificar año si se menciona.
6. Identificar conceptos principales.
7. Identificar corrientes filosóficas o científicas.
8. Identificar eventos históricos mencionados.

Devuelve SOLO JSON con esta estructura exacta:
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

TIPOS DE RELACIÓN DISPONIBLES (usa SOLO estos):
- trata_sobre: Material → Evento (ej: película → Guerra de Independencia)
- similar_a: Nodo → Nodo (automático, con peso entre 0 y 1)

REGLAS IMPORTANTES:
- Cada relación debe responder una pregunta específica. No uses relaciones genéricas.
- Asigna peso según: 1.0=central, 0.7=importante, 0.4=secundaria, 0.2=débil.
- Conecta SOLO con nodos EXISTENTES de la lista provista abajo. El targetTitle debe coincidir EXACTAMENTE con el nombre listado.
- Usa trata_sobre si el nuevo contenido trata sobre un evento existente.
- similar_a solo entre contenidos del mismo tipo (libro-libro, pelicula-pelicula, videojuego-videojuego) basado en similitud temática real.
- No inventes nodos. Solo relaciona con los que YA EXISTEN en la lista de abajo.

NODOS EXISTENTES (targetTitle debe coincidir exactamente):
${nodeListByType}

Texto del usuario: "${input}"`

  const response = await client.chat.completions.create({
    model: 'llama-3.1-8b-instant',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.3,
  })

  const text = response.choices[0]?.message?.content ?? '{}'

  const cleaned = text
    .replace(/```json\s*/g, '')
    .replace(/```\s*/g, '')
    .trim()

  const parsed = JSON.parse(cleaned) as AIResult

  return parsed
}
