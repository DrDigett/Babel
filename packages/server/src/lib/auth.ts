import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import type { Context, Next } from 'hono'
import { config } from './config'
import type { AppEnv } from './types'

const SALT_ROUNDS = 10

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS)
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

export function signToken(userId: string): string {
  return jwt.sign({ userId }, config.jwtSecret, { expiresIn: '7d' })
}

export function verifyToken(token: string): { userId: string } {
  return jwt.verify(token, config.jwtSecret) as { userId: string }
}

export async function requireAuth(c: Context<AppEnv>, next: Next) {
  const header = c.req.header('Authorization')
  if (!header?.startsWith('Bearer ')) {
    return c.json({ error: 'No autenticado' }, 401)
  }
  try {
    const { userId } = verifyToken(header.slice(7))
    c.set('userId', userId)
    await next()
  } catch {
    return c.json({ error: 'Token inválido' }, 401)
  }
}
