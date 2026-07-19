import type { Context, Next } from 'hono'

export type AppEnv = {
  Variables: {
    userId: string
  }
}

export function getUserId(c: Context<AppEnv>): string {
  return c.get('userId')
}
