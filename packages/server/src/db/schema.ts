import { pgTable, text, integer, real, unique } from 'drizzle-orm/pg-core'

export const users = pgTable('users', {
  id: text('id').primaryKey(),
  email: text('email').notNull().unique(),
  username: text('username').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  createdAt: text('created_at').notNull(),
})

export const nodes = pgTable('nodes', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  type: text('type').notNull(),
  description: text('description'),
  status: text('status').notNull().default('pendiente'),
  tags: text('tags'),
  author: text('author'),
  year: integer('year'),
  link: text('link'),
  rating: integer('rating'),
  order: integer('order').notNull().default(0),
  userId: text('user_id').references(() => users.id, { onDelete: 'set null' }),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
})

export const relations = pgTable('relations', {
  id: text('id').primaryKey(),
  sourceId: text('source_id').notNull().references(() => nodes.id, { onDelete: 'cascade' }),
  targetId: text('target_id').notNull().references(() => nodes.id, { onDelete: 'cascade' }),
  type: text('type').notNull(),
  weight: real('weight').notNull().default(1.0),
  userId: text('user_id').references(() => users.id, { onDelete: 'set null' }),
  createdAt: text('created_at').notNull(),
})

export const lists = pgTable('lists', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  userId: text('user_id').references(() => users.id, { onDelete: 'set null' }),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
})

export const listNodes = pgTable('list_nodes', {
  id: text('id').primaryKey(),
  listId: text('list_id').notNull().references(() => lists.id, { onDelete: 'cascade' }),
  nodeId: text('node_id').notNull().references(() => nodes.id, { onDelete: 'cascade' }),
  position: integer('position').notNull().default(0),
  rating: integer('rating'),
  createdAt: text('created_at').notNull(),
}, (table) => ({
  uniqueListNode: unique().on(table.listId, table.nodeId),
}))
