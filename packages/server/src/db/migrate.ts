import { sql } from 'drizzle-orm'
import { db } from './index'

export async function migrate() {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS nodes (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      type TEXT NOT NULL,
      description TEXT,
      status TEXT NOT NULL DEFAULT 'pendiente',
      priority TEXT NOT NULL DEFAULT 'media',
      tags TEXT,
      author TEXT,
      year INTEGER,
      link TEXT,
      local_file TEXT,
      rating INTEGER,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `)

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS relations (
      id TEXT PRIMARY KEY,
      source_id TEXT NOT NULL REFERENCES nodes(id) ON DELETE CASCADE,
      target_id TEXT NOT NULL REFERENCES nodes(id) ON DELETE CASCADE,
      type TEXT NOT NULL,
      weight REAL NOT NULL DEFAULT 1.0,
      created_at TEXT NOT NULL
    )
  `)

  await db.execute(sql`
    ALTER TABLE nodes DROP COLUMN IF EXISTS index_id
  `)

  await db.execute(sql`
    ALTER TABLE relations DROP COLUMN IF EXISTS index_id
  `)

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS lists (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `)

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS list_nodes (
      id TEXT PRIMARY KEY,
      list_id TEXT NOT NULL REFERENCES lists(id) ON DELETE CASCADE,
      node_id TEXT NOT NULL REFERENCES nodes(id) ON DELETE CASCADE,
      position INTEGER NOT NULL DEFAULT 0,
      rating INTEGER,
      created_at TEXT NOT NULL,
      UNIQUE(list_id, node_id)
    )
  `)

  await db.execute(sql`
    ALTER TABLE list_nodes ADD COLUMN IF NOT EXISTS rating INTEGER
  `)
}
