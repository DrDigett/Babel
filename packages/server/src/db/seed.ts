import crypto from 'node:crypto'
import { db } from './index'
import { nodes, relations, lists, listNodes } from './schema'
import { eq, asc, sql } from 'drizzle-orm'

const now = new Date().toISOString()

const seedNodes = [
  {
    id: crypto.randomUUID(),
    title: 'La Ideología Alemana',
    type: 'libro',
    description: 'Obra crítica sobre la filosofía alemana post-hegeliana donde Marx y Engels desarrollan la concepción materialista de la historia.',
    status: 'terminado',

    tags: JSON.stringify(['filosofia', 'marxismo', 'materialismo-historico', 'alemania']),
    author: 'Karl Marx, Friedrich Engels',
    year: 1932,
    link: null,
    createdAt: now,
    updatedAt: now,
  },
  {
    id: crypto.randomUUID(),
    title: 'Estatismo y Anarquía',
    type: 'libro',
    description: 'Última obra de Mijaíl Bakunin, crítica del estatismo y defensa del anarquismo colectivista.',
    status: 'pendiente',

    tags: JSON.stringify(['filosofia', 'anarquismo', 'estado', 'revolucion']),
    author: 'Mijaíl Bakunin',
    year: 1873,
    link: null,
    createdAt: now,
    updatedAt: now,
  },
  {
    id: crypto.randomUUID(),
    title: 'Fenomenología del Espíritu',
    type: 'libro',
    description: 'Obra fundamental de Hegel que describe el desarrollo de la conciencia desde la percepción sensible hasta el saber absoluto.',
    status: 'pendiente',

    tags: JSON.stringify(['filosofia', 'idealismo-aleman', 'dialectica', 'epistemologia']),
    author: 'G. W. F. Hegel',
    year: 1807,
    link: null,
    createdAt: now,
    updatedAt: now,
  },
  {
    id: crypto.randomUUID(),
    title: 'La Sociedad del Espectáculo',
    type: 'libro',
    description: 'Análisis crítico de la sociedad contemporánea donde Guy Debord describe el espectáculo como la relación social mediada por imágenes.',
    status: 'en_progreso',

    tags: JSON.stringify(['filosofia', 'marxismo', 'sociedad', 'capitalismo', 'medios']),
    author: 'Guy Debord',
    year: 1967,
    link: null,
    createdAt: now,
    updatedAt: now,
  },
  {
    id: crypto.randomUUID(),
    title: 'La Batalla de Argel',
    type: 'pelicula',
    description: 'Película épica sobre la guerra de independencia argelina contra el colonialismo francés.',
    status: 'pendiente',

    tags: JSON.stringify(['colonialismo', 'revolucion', 'argelia', 'guerra']),
    author: null,
    year: 1966,
    link: null,
    createdAt: now,
    updatedAt: now,
  },
  {
    id: crypto.randomUUID(),
    title: 'Los condenados de la tierra',
    type: 'libro',
    description: 'Obra de Frantz Fanon sobre la descolonización y la psicología del colonizado.',
    status: 'pendiente',

    tags: JSON.stringify(['colonialismo', 'revolucion', 'psicologia', 'argelia']),
    author: 'Frantz Fanon',
    year: 1961,
    link: null,
    createdAt: now,
    updatedAt: now,
  },
  {
    id: crypto.randomUUID(),
    title: 'Colonialismo',
    type: 'concepto',
    description: 'Sistema de dominación política y económica de un territorio por una potencia extranjera.',
    status: 'terminado',

    tags: JSON.stringify(['historia', 'politica', 'imperialismo']),
    author: null,
    year: null,
    link: null,
    createdAt: now,
    updatedAt: now,
  },
  {
    id: crypto.randomUUID(),
    title: 'Revolución',
    type: 'concepto',
    description: 'Cambio profundo y rápido en las estructuras políticas, sociales o económicas de una sociedad.',
    status: 'terminado',

    tags: JSON.stringify(['historia', 'politica', 'cambio-social']),
    author: null,
    year: null,
    link: null,
    createdAt: now,
    updatedAt: now,
  },
  {
    id: crypto.randomUUID(),
    title: 'Estado',
    type: 'concepto',
    description: 'Conjunto de instituciones que ejercen el poder político y administrativo sobre una sociedad.',
    status: 'terminado',

    tags: JSON.stringify(['politica', 'filosofia', 'poder']),
    author: null,
    year: null,
    link: null,
    createdAt: now,
    updatedAt: now,
  },
  {
    id: crypto.randomUUID(),
    title: 'Karl Marx',
    type: 'autor',
    description: 'Filósofo, economista y revolucionario alemán, fundador del marxismo.',
    status: 'terminado',

    tags: JSON.stringify(['filosofia', 'marxismo', 'economia', 'alemania']),
    author: null,
    year: null,
    link: null,
    createdAt: now,
    updatedAt: now,
  },
  {
    id: crypto.randomUUID(),
    title: 'Materialismo histórico',
    type: 'concepto',
    description: 'Concepción materialista de la historia que sostiene que las condiciones económicas determinan la superestructura social y política.',
    status: 'terminado',

    tags: JSON.stringify(['filosofia', 'marxismo', 'historia', 'economia']),
    author: null,
    year: null,
    link: null,
    createdAt: now,
    updatedAt: now,
  },
  {
    id: crypto.randomUUID(),
    title: 'G. W. F. Hegel',
    type: 'filosofo',
    description: 'Filósofo alemán del idealismo, figura clave de la filosofía occidental.',
    status: 'terminado',

    tags: JSON.stringify(['filosofia', 'idealismo-aleman', 'dialectica']),
    author: null,
    year: null,
    link: null,
    createdAt: now,
    updatedAt: now,
  },
  {
    id: crypto.randomUUID(),
    title: 'Mijaíl Bakunin',
    type: 'autor',
    description: 'Revolucionario y filósofo ruso, fundador del anarquismo colectivista.',
    status: 'terminado',

    tags: JSON.stringify(['filosofia', 'anarquismo', 'rusia', 'revolucion']),
    author: null,
    year: null,
    link: null,
    createdAt: now,
    updatedAt: now,
  },
  {
    id: crypto.randomUUID(),
    title: 'Guy Debord',
    type: 'autor',
    description: 'Filósofo, escritor y cineasta francés, miembro central de la Internacional Situacionista.',
    status: 'terminado',

    tags: JSON.stringify(['filosofia', 'situacionismo', 'france']),
    author: null,
    year: null,
    link: null,
    createdAt: now,
    updatedAt: now,
  },
  {
    id: crypto.randomUUID(),
    title: 'Gillo Pontecorvo',
    type: 'director',
    description: 'Cineasta italiano, conocido por su cine político.',
    status: 'terminado',

    tags: JSON.stringify(['cine', 'italia', 'politica']),
    author: null,
    year: null,
    link: null,
    createdAt: now,
    updatedAt: now,
  },
  {
    id: crypto.randomUUID(),
    title: 'Frantz Fanon',
    type: 'autor',
    description: 'Psiquiatra, filósofo y revolucionario martiniqués, teórico de la descolonización.',
    status: 'terminado',

    tags: JSON.stringify(['colonialismo', 'psicologia', 'descolonizacion']),
    author: null,
    year: null,
    link: null,
    createdAt: now,
    updatedAt: now,
  },
  {
    id: crypto.randomUUID(),
    title: 'Marxismo',
    type: 'escuela',
    description: 'Corriente filosófica, política y económica fundada por Karl Marx y Friedrich Engels.',
    status: 'terminado',

    tags: JSON.stringify(['filosofia', 'economia', 'politica', 'historia']),
    author: null,
    year: null,
    link: null,
    createdAt: now,
    updatedAt: now,
  },
  {
    id: crypto.randomUUID(),
    title: 'Anarquismo',
    type: 'escuela',
    description: 'Corriente política que rechaza el Estado y toda forma de autoridad coercitiva.',
    status: 'terminado',

    tags: JSON.stringify(['filosofia', 'politica', 'libertad']),
    author: null,
    year: null,
    link: null,
    createdAt: now,
    updatedAt: now,
  },
  {
    id: crypto.randomUUID(),
    title: 'Idealismo alemán',
    type: 'escuela',
    description: 'Corriente filosófica alemana del siglo XIX que sostiene que la realidad es fundamentalmente espiritual o mental.',
    status: 'terminado',

    tags: JSON.stringify(['filosofia', 'alemania', 'idealismo']),
    author: null,
    year: null,
    link: null,
    createdAt: now,
    updatedAt: now,
  },
  {
    id: crypto.randomUUID(),
    title: 'Guerra de Independencia Argelina',
    type: 'evento',
    description: 'Conflicto armado entre Francia y el Frente de Liberación Nacional argelino (1954-1962).',
    status: 'terminado',

    tags: JSON.stringify(['historia', 'argelia', 'colonialismo', 'independencia']),
    author: null,
    year: 1954,
    link: null,
    createdAt: now,
    updatedAt: now,
  },
]

const seedRelations = [
  {
    id: crypto.randomUUID(),
    sourceId: seedNodes[0].id,
    targetId: seedNodes[10].id,
    type: 'trata_sobre',
    weight: 1.0,
    createdAt: now,
  },
  {
    id: crypto.randomUUID(),
    sourceId: seedNodes[9].id,
    targetId: seedNodes[0].id,
    type: 'es_autor_de',
    weight: 1.0,
    createdAt: now,
  },
  {
    id: crypto.randomUUID(),
    sourceId: seedNodes[3].id,
    targetId: seedNodes[7].id,
    type: 'trata_sobre',
    weight: 0.7,
    createdAt: now,
  },
  {
    id: crypto.randomUUID(),
    sourceId: seedNodes[4].id,
    targetId: seedNodes[6].id,
    type: 'trata_sobre',
    weight: 0.9,
    createdAt: now,
  },
  {
    id: crypto.randomUUID(),
    sourceId: seedNodes[4].id,
    targetId: seedNodes[7].id,
    type: 'trata_sobre',
    weight: 0.7,
    createdAt: now,
  },
  {
    id: crypto.randomUUID(),
    sourceId: seedNodes[1].id,
    targetId: seedNodes[8].id,
    type: 'trata_sobre',
    weight: 1.0,
    createdAt: now,
  },
  {
    id: crypto.randomUUID(),
    sourceId: seedNodes[2].id,
    targetId: seedNodes[18].id,
    type: 'pertenece_a',
    weight: 1.0,
    createdAt: now,
  },
  {
    id: crypto.randomUUID(),
    sourceId: seedNodes[11].id,
    targetId: seedNodes[2].id,
    type: 'es_autor_de',
    weight: 1.0,
    createdAt: now,
  },
  {
    id: crypto.randomUUID(),
    sourceId: seedNodes[11].id,
    targetId: seedNodes[9].id,
    type: 'influyo_a',
    weight: 0.9,
    createdAt: now,
  },
  {
    id: crypto.randomUUID(),
    sourceId: seedNodes[1].id,
    targetId: seedNodes[17].id,
    type: 'pertenece_a',
    weight: 1.0,
    createdAt: now,
  },
  {
    id: crypto.randomUUID(),
    sourceId: seedNodes[0].id,
    targetId: seedNodes[16].id,
    type: 'pertenece_a',
    weight: 1.0,
    createdAt: now,
  },
  {
    id: crypto.randomUUID(),
    sourceId: seedNodes[12].id,
    targetId: seedNodes[1].id,
    type: 'es_autor_de',
    weight: 1.0,
    createdAt: now,
  },
  {
    id: crypto.randomUUID(),
    sourceId: seedNodes[12].id,
    targetId: seedNodes[9].id,
    type: 'critica_a',
    weight: 0.8,
    createdAt: now,
  },
  {
    id: crypto.randomUUID(),
    sourceId: seedNodes[13].id,
    targetId: seedNodes[3].id,
    type: 'es_autor_de',
    weight: 1.0,
    createdAt: now,
  },
  {
    id: crypto.randomUUID(),
    sourceId: seedNodes[14].id,
    targetId: seedNodes[4].id,
    type: 'dirigio',
    weight: 1.0,
    createdAt: now,
  },
  {
    id: crypto.randomUUID(),
    sourceId: seedNodes[15].id,
    targetId: seedNodes[5].id,
    type: 'es_autor_de',
    weight: 1.0,
    createdAt: now,
  },
  {
    id: crypto.randomUUID(),
    sourceId: seedNodes[4].id,
    targetId: seedNodes[19].id,
    type: 'ocurre_en',
    weight: 1.0,
    createdAt: now,
  },
  {
    id: crypto.randomUUID(),
    sourceId: seedNodes[5].id,
    targetId: seedNodes[6].id,
    type: 'trata_sobre',
    weight: 1.0,
    createdAt: now,
  },
  {
    id: crypto.randomUUID(),
    sourceId: seedNodes[5].id,
    targetId: seedNodes[7].id,
    type: 'trata_sobre',
    weight: 0.8,
    createdAt: now,
  },
]

async function seedLists() {
  const [{ count }] = await db.select({ count: sql<number>`count(*)` }).from(lists)
  if (count > 0) {
    console.log(`Lists table has ${count} lists, skipping list seed`)
    return
  }

  const allNodes = await db.select({ id: nodes.id, title: nodes.title }).from(nodes).orderBy(asc(nodes.createdAt))
  if (allNodes.length === 0) return

  const now = new Date().toISOString()
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789'
  let listId = ''
  for (let i = 0; i < 4; i++) listId += chars[Math.floor(Math.random() * chars.length)]
  const list = {
    id: listId,
    name: 'Todos los nodos',
    description: 'Lista principal con todos los nodos del grafo',
    createdAt: now,
    updatedAt: now,
  }
  await db.insert(lists).values(list)

  const entries = allNodes.map((n, i) => ({
    id: crypto.randomUUID(),
    listId: list.id,
    nodeId: n.id,
    position: i,
    createdAt: now,
  }))
  await db.insert(listNodes).values(entries)
  console.log(`Lista '${list.id}' creada con ${entries.length} nodos`)
}

export async function seed() {
  console.log(`Insertando ${seedNodes.length} nodos...`)
  await db.insert(nodes).values(seedNodes.map((n, i) => ({ ...n, order: i })))

  console.log(`Insertando ${seedRelations.length} relaciones...`)
  await db.insert(relations).values(seedRelations)

  await seedLists()

  console.log('Seed completado.')
}

const isMain = import.meta.url === `file://${process.argv[1]}`.replace(/\\/g, '/')
if (isMain) {
  seed().catch((err) => {
    console.error('Seed falló:', err)
    process.exit(1)
  })
}
