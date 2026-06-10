export const NODE_TYPE_CATEGORIES = [
  'material', 'evento',
] as const

export const NODE_TYPES = [
  'libro', 'pelicula', 'articulo', 'video', 'curso',
  'evento',
  'videojuego',
] as const

export const NODE_STATUSES = ['pendiente', 'en_progreso', 'terminado', 'abandonado'] as const

export const NODE_PRIORITIES = ['alta', 'media', 'baja'] as const

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
