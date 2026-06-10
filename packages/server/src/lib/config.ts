import 'dotenv/config'

function required(key: string, hint?: string): string {
  const value = process.env[key]
  if (!value) {
    throw new Error(
      `Missing required env ${key}.${hint ? ` ${hint}` : ''}`
    )
  }
  return value
}

function optional(key: string, fallback: string): string {
  return process.env[key] || fallback
}

export const config = {
  port: parseInt(optional('PORT', '3000'), 10),
  dbPath: optional('DB_PATH', 'data/babel.db'),
  groqApiKey: required('GROQ_API_KEY', 'Get one at https://console.groq.com'),
  corsOrigin: optional('CORS_ORIGIN', '*'),
  jwtSecret: optional('JWT_SECRET', 'dev-secret-change-in-production'),
  nodeEnv: optional('NODE_ENV', 'development'),
}
