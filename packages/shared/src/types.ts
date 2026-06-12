import type { NODE_TYPES, NODE_STATUSES, NODE_PRIORITIES, RELATION_TYPES } from './constants'

export type NodeType = typeof NODE_TYPES[number]
export type NodeStatus = typeof NODE_STATUSES[number]
export type NodePriority = typeof NODE_PRIORITIES[number]
export type RelationType = typeof RELATION_TYPES[number]

export interface Node {
  id: string
  title: string
  type: NodeType
  description: string | null
  status: NodeStatus
  priority: NodePriority
  tags: string | null
  author: string | null
  year: number | null
  link: string | null
  localFile: string | null
  rating: number | null
  createdAt: string
  updatedAt: string
}

export interface Relation {
  id: string
  sourceId: string
  targetId: string
  type: RelationType
  weight: number
  createdAt: string
}

export interface CreateNodeInput {
  title: string
  type: NodeType
  description?: string
  status?: NodeStatus
  priority?: NodePriority
  tags?: string[]
  author?: string
  year?: number
  link?: string
  localFile?: string
  rating?: number
}

export interface CreateRelationInput {
  sourceId: string
  targetId: string
  type: RelationType
  weight?: number
}
