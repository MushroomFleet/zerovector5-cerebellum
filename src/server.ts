import { config } from 'dotenv'
import app from './app.js'
import { DatabaseManager } from './core/database/DatabaseManager.js'
import { VectorDatabase } from './core/vectorstore/VectorDatabase.js'
import { EmbeddingGenerator } from './core/vectorstore/EmbeddingGenerator.js'
import { logger } from './utils/logger.js'

// Load environment variables
config()

const PORT = process.env.PORT || 3000

async function startServer() {
  try {
    logger.info('Starting ZV5-Cerebellum server...')

    // Initialize database
    const dbManager = DatabaseManager.getInstance()
    await dbManager.initialize()
    logger.info('✅ Database initialized successfully')

    // Initialize vector database (without embeddings for now)
    const vectorDb = VectorDatabase.getInstance()
    try {
      await vectorDb.initialize()
      logger.info('✅ Vector database initialized successfully')
    } catch (error) {
      logger.warn('⚠️ Vector database initialization failed, continuing without embeddings')
    }

    // Initialize embedding generator (optional for basic functionality)
    const embeddings = EmbeddingGenerator.getInstance()
    try {
      await embeddings.initialize()
      logger.info('✅ Embedding generator initialized successfully')
    } catch (error) {
      logger.warn('⚠️ Embedding generator initialization failed, vector search will be limited')
    }

    // Start Express server
    const server = app.listen(PORT, () => {
      logger.info(`🚀 ZV5-Cerebellum server running on port ${PORT}`)
      logger.info(`📊 Health check: http://localhost:${PORT}/api/health`)
      logger.info(`🧠 Memory API: http://localhost:${PORT}/api/memory/*`)
      logger.info(`👤 Persona API: http://localhost:${PORT}/api/persona/*`)
      logger.info(`🔑 Auth API: http://localhost:${PORT}/api/auth/*`)
      
      // Log server stats
      const dbStats = dbManager.getStats()
      logger.info('Database statistics:', dbStats)
    })

    // Graceful shutdown
    process.on('SIGTERM', async () => {
      logger.info('Received SIGTERM, shutting down gracefully...')
      server.close(async () => {
        await dbManager.close()
        await embeddings.cleanup()
        logger.info('Server shut down successfully')
        process.exit(0)
      })
    })

    process.on('SIGINT', async () => {
      logger.info('Received SIGINT, shutting down gracefully...')
      server.close(async () => {
        await dbManager.close()
        await embeddings.cleanup()
        logger.info('Server shut down successfully')
        process.exit(0)
      })
    })

  } catch (error) {
    logger.error('❌ Failed to start server:', error)
    process.exit(1)
  }
}

startServer()
