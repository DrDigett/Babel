export const NODE_TYPES = [
  'libro', 'pelicula', 'articulo', 'video', 'curso',
  'videojuego',
] as const

export const NODE_STATUSES = ['pendiente', 'en_progreso', 'terminado', 'abandonado'] as const

export const RELATION_TYPES = [
  'es_autor_de',
  'dirigio',
  'trata_sobre',
  'pertenece_a',
  'influyo_a',
  'critica_a',
  'inspiro',
  'ocurre_en',
  'similar_a',
] as const

export const RELATION_TYPE_WEIGHTS: Record<string, number> = {
  es_autor_de: 4,
  dirigio: 4,
  trata_sobre: 4,
  pertenece_a: 3,
  influyo_a: 3,
  critica_a: 4,
  inspiro: 3,
  ocurre_en: 1,
  similar_a: 1,
}

export const RELATION_THRESHOLD = 4

export const MIN_RELATION_WEIGHT = 0.7