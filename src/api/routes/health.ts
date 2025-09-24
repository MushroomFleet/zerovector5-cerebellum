import express from 'express'
import { logger } from '../../utils/logger.js'

const router = express.Router()

// Basic health check
router.get('/', async (req, res) => {
  try {
    const uptime = process.uptime()
    const memoryUsage = process.memoryUsage()
    
    const healthStatus = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      uptime: Math.floor(uptime),
      database: {
        connected: true // Will be enhanced when we test actual DB connection
      },
      memory: {
        used: Math.round(memoryUsage.heapUsed / 1024 / 1024),
        available: Math.round(memoryUsage.heapTotal / 1024 / 1024)
      },
      services: {
        core: { status: 'healthy' },
        memory: { status: 'healthy' },
        persona: { status: 'healthy' }
      }
    }

    logger.apiRequest(req.method, req.path, 200)
    res.json(healthStatus)
  } catch (error) {
    logger.error('Health check failed:', error)
    res.status(500).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: 'Health check failed'
    })
  }
})

// Detailed health check
router.get('/detailed', async (req, res) => {
  try {
    // This will be enhanced when we have the database fully connected
    const detailed = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        database: 'not_yet_connected',
        vector_store: 'not_yet_connected',
        embedding_generator: 'not_yet_connected',
        persona_core: 'not_yet_connected'
      },
      dependencies: {
        sqlite3: 'installed',
        transformers: 'installed',
        express: 'installed'
      }
    }

    res.json(detailed)
  } catch (error) {
    logger.error('Detailed health check failed:', error)
    res.status(500).json({
      status: 'error',
      error: error.message
    })
  }
})

export default router
