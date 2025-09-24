import { CorsOptions } from 'cors'
import { existsSync, readFileSync } from 'fs'
import { logger } from '../utils/logger.js'

interface CorsConfig {
  allowedOrigins: string[]
  credentials: boolean
  methods: string[]
  headers: string[]
}

export function loadCorsConfig(): CorsOptions {
  // Frontend team required origins
  const requiredOrigins = [
    'http://localhost:5173',
    'http://localhost:3000',
    'https://f191cc91-1b62-4c1b-921c-fa842dd36c67.lovableproject.com',
    'https://zv5-lite.oragenai.com'
  ]

  const defaultConfig: CorsConfig = {
    allowedOrigins: requiredOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    headers: ['Authorization', 'Content-Type', 'X-Session-ID']
  }

  let config = defaultConfig

  // Try to load user configuration
  const configPath = './config/cors.json'
  if (existsSync(configPath)) {
    try {
      const userConfig = JSON.parse(readFileSync(configPath, 'utf8'))
      config = { ...defaultConfig, ...userConfig }
      logger.info('Loaded custom CORS configuration')
    } catch (error) {
      logger.warn('Failed to load CORS config, using defaults:', error instanceof Error ? error.message : 'Unknown error')
    }
  }

  // Override with environment variables if present
  if (process.env.ALLOWED_ORIGINS) {
    const envOrigins = process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
    config.allowedOrigins = [...new Set([...requiredOrigins, ...envOrigins])] // Merge and dedupe
  }

  logger.info('CORS configured for origins:', config.allowedOrigins)

  return {
    origin: config.allowedOrigins,
    credentials: config.credentials,
    methods: config.methods,
    allowedHeaders: config.headers,
    optionsSuccessStatus: 200,
    maxAge: 86400 // Frontend team requested max age
  }
}

export function createDefaultCorsConfig(): void {
  const configPath = './config/cors.json'
  const defaultConfig = {
    allowedOrigins: ['http://localhost:5173', 'http://localhost:3000'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    headers: ['Authorization', 'Content-Type', 'X-Session-ID']
  }

  if (!existsSync('./config')) {
    require('fs').mkdirSync('./config', { recursive: true })
  }

  if (!existsSync(configPath)) {
    require('fs').writeFileSync(configPath, JSON.stringify(defaultConfig, null, 2))
    logger.info('Created default CORS configuration file')
  }
}
