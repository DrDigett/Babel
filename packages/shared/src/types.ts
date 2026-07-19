import type { NODE_TYPES, NODE_STATUSES, RELATION_TYPES } from './constants'

export type NodeType = typeof NODE_TYPES[number]
export type NodeStatus = typeof NODE_STATUSES[number]
export type RelationType = typeof RELATION_TYPES[number]

export interface Node {
  id: string
  title: string
  type: NodeType
  description: string | null
  status: NodeStatus
  tags: string | null
  author: string | null
  year: number | null
  link: string | null
  rating: number | null
  order: number
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
  tags?: string[]
  author?: string
  year?: number
  link?: string
  rating?: number
}

export interface CreateRelationInput {
  sourceId: string
  targetId: string
  type: RelationType
  weight?: number
}

export interface List {
  id: string
  name: string
  description: string | null
  createdAt: string
  updatedAt: string
}

export interface ListWithNodes extends List {
  nodes: (Node & { position: number })[]
}

export interface CreateListInput {
  name: string
  description?: string
}

export interface User {
  id: string
  email: string
  username: string
  createdAt: string
}

export interface LoginInput {
  email: string
  password: string
}

export interface RegisterInput {
  email: string
  username: string
  password: string
}

export interface AuthResponse {
  token: string
  user: User
}
