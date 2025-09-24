import express from 'express'
import cors from 'cors'
import helmet from 'helmet'

import authRoutes from './api/routes/auth.js'
import memoryRoutes from './api/routes/memory.js'
import personaRoutes from './api/routes/persona.js'
import healthRoutes from './api/routes/health.js'
import compatibilityRoutes from './api/routes/compatibility.js'

import { errorHandler } from './api/middleware/errorHandler.js'
import { requestLogger } from './api/middleware/requestLogger.js'
import { authMiddleware } from './api/middleware/auth.js'
import { loadCorsConfig } from './config/cors.config.js'

const app = express()

// Load CORS configuration
const corsConfig = loadCorsConfig()

// Security middleware
app.use(helmet())
app.use(cors(corsConfig))

// Handle preflight requests explicitly (frontend team requirement)
app.options('*', (req, res) => {
  const allowedOrigins = [
    'http://localhost:5173',
    'http://localhost:3000', 
    'https://f191cc91-1b62-4c1b-921c-fa842dd36c67.lovableproject.com',
    'https://zv5-lite.oragenai.com'
  ]
  
  const origin = req.headers.origin
  if (allowedOrigins.includes(origin || '')) {
    res.header('Access-Control-Allow-Origin', origin)
  }
  
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH')
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Session-ID')
  res.header('Access-Control-Allow-Credentials', 'true')
  res.header('Access-Control-Max-Age', '86400')
  res.status(200).send()
})

// Body parsing
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

// Request logging
app.use(requestLogger)

// Routes
app.use('/api/auth', authRoutes)
app.use('/api/memory', authMiddleware, memoryRoutes)
app.use('/api/persona', authMiddleware, personaRoutes)
app.use('/api/health', healthRoutes)

// Frontend compatibility layer (simplified endpoints)
app.use('/api', authMiddleware, compatibilityRoutes)

// Error handling
app.use(errorHandler)

export default app
