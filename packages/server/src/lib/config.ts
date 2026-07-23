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
  databaseUrl: required('DATABASE_URL', 'PostgreSQL connection string. Create a free DB at https://render.com or use local postgres'),
  dbPath: optional('DB_PATH', 'data/babel.db'),
  groqApiKey: required('GROQ_API_KEY', 'Get one at https://console.groq.com'),
  corsOrigin: optional('CORS_ORIGIN', '*'),
  jwtSecret: optional('JWT_SECRET', 'dev-secret-change-in-production'),
  nodeEnv: optional('NODE_ENV', 'development'),
}

if (config.nodeEnv === 'production' && config.jwtSecret === 'dev-secret-change-in-production') {
  throw new Error('JWT_SECRET must be set in production. Generate one: openssl rand -base64 32')
}
