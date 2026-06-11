import { Pool } from 'pg'
import { drizzle } from 'drizzle-orm/node-postgres'
import { config } from '../lib/config'
import * as schema from './schema'

const pool = new Pool({
  connectionString: config.databaseUrl,
  ssl: { rejectUnauthorized: false },
})
export const db = drizzle(pool, { schema })
