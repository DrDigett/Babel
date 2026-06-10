import { pgTable, text, integer, real } from 'drizzle-orm/pg-core'

export const nodes = pgTable('nodes', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  type: text('type').notNull(),
  description: text('description'),
  status: text('status').notNull().default('pendiente'),
  priority: text('priority').notNull().default('media'),
  tags: text('tags'),
  author: text('author'),
  year: integer('year'),
  link: text('link'),
  localFile: text('local_file'),
  rating: integer('rating'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
})

export const relations = pgTable('relations', {
  id: text('id').primaryKey(),
  sourceId: text('source_id').notNull().references(() => nodes.id, { onDelete: 'cascade' }),
  targetId: text('target_id').notNull().references(() => nodes.id, { onDelete: 'cascade' }),
  type: text('type').notNull(),
  weight: real('weight').notNull().default(1.0),
  createdAt: text('created_at').notNull(),
})
