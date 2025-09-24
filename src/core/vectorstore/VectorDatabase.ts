import { DatabaseManager } from '../database/DatabaseManager.js'
import { EmbeddingGenerator } from './EmbeddingGenerator.js'
import { logger } from '../../utils/logger.js'

interface VectorEntry {
  id: string
  embedding: number[]
  metadata: any
}

interface SearchOptions {
  embedding: number[]
  limit?: number
  threshold?: number
  filter?: any
}

interface SearchResult {
  id: string
  score: number
  metadata: any
}

export class VectorDatabase {
  private static instance: VectorDatabase
  private db: DatabaseManager
  private embeddingGenerator: EmbeddingGenerator
  private similarityThreshold: number

  private constructor() {
    this.db = DatabaseManager.getInstance()
    this.embeddingGenerator = EmbeddingGenerator.getInstance()
    this.similarityThreshold = parseFloat(process.env.SIMILARITY_THRESHOLD || '0.7')
  }

  public static getInstance(): VectorDatabase {
    if (!VectorDatabase.instance) {
      VectorDatabase.instance = new VectorDatabase()
    }
    return VectorDatabase.instance
  }

  public async initialize(): Promise<void> {
    try {
      // Initialize embedding generator
      await this.embeddingGenerator.initialize()

      // Create vector storage tables if they don't exist
      this.db.prepare(`
        CREATE TABLE IF NOT EXISTS vector_embeddings (
          id TEXT PRIMARY KEY,
          embedding_data BLOB NOT NULL,
          metadata TEXT NOT NULL,
          dimension INTEGER NOT NULL,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        )
      `).run()

      this.db.prepare(`
        CREATE INDEX IF NOT EXISTS idx_vector_metadata ON vector_embeddings(metadata)
      `).run()

      logger.info('Vector database initialized successfully')
    } catch (error) {
      logger.error('Failed to initialize vector database:', error)
      throw error
    }
  }

  public async upsert(entry: VectorEntry): Promise<void> {
    try {
      const embeddingBuffer = Buffer.from(new Float64Array(entry.embedding).buffer)
      const now = new Date().toISOString()

      const stmt = this.db.prepare(`
        INSERT OR REPLACE INTO vector_embeddings 
        (id, embedding_data, metadata, dimension, created_at, updated_at)
        VALUES (?, ?, ?, ?, 
          COALESCE((SELECT created_at FROM vector_embeddings WHERE id = ?), ?),
          ?)
      `)

      stmt.run(
        entry.id,
        embeddingBuffer,
        JSON.stringify(entry.metadata),
        entry.embedding.length,
        entry.id,
        now,
        now
      )

      logger.debug(`Upserted vector entry: ${entry.id}`)
    } catch (error) {
      logger.error(`Failed to upsert vector entry ${entry.id}:`, error)
      throw error
    }
  }

  public async upsertBatch(entries: VectorEntry[]): Promise<void> {
    if (entries.length === 0) return

    try {
      this.db.transaction(() => {
        const stmt = this.db.prepare(`
          INSERT OR REPLACE INTO vector_embeddings 
          (id, embedding_data, metadata, dimension, created_at, updated_at)
          VALUES (?, ?, ?, ?, 
            COALESCE((SELECT created_at FROM vector_embeddings WHERE id = ?), ?),
            ?)
        `)

        const now = new Date().toISOString()

        for (const entry of entries) {
          const embeddingBuffer = Buffer.from(new Float64Array(entry.embedding).buffer)
          stmt.run(
            entry.id,
            embeddingBuffer,
            JSON.stringify(entry.metadata),
            entry.embedding.length,
            entry.id,
            now,
            now
          )
        }
      })()

      logger.debug(`Upserted ${entries.length} vector entries in batch`)
    } catch (error) {
      logger.error('Failed to upsert vector batch:', error)
      throw error
    }
  }

  public async search(options: SearchOptions): Promise<SearchResult[]> {
    const { embedding, limit = 10, threshold = this.similarityThreshold, filter } = options

    try {
      const startTime = Date.now()

      // Build query with optional filtering
      let query = `
        SELECT id, embedding_data, metadata, dimension
        FROM vector_embeddings
      `
      const params: any[] = []

      if (filter) {
        const filterConditions = this.buildFilterConditions(filter)
        if (filterConditions.length > 0) {
          query += ` WHERE ${filterConditions.join(' AND ')}`
        }
      }

      const stmt = this.db.prepare(query)
      const rows = stmt.all(...params)

      // Calculate similarities
      const results: SearchResult[] = []

      for (const row of rows) {
        const storedEmbedding = this.deserializeEmbedding(row.embedding_data)
        const similarity = this.embeddingGenerator.calculateSimilarity(
          embedding,
          storedEmbedding
        )

        if (similarity >= threshold) {
          results.push({
            id: row.id,
            score: similarity,
            metadata: JSON.parse(row.metadata)
          })
        }
      }

      // Sort by similarity and limit
      results.sort((a, b) => b.score - a.score)
      const limitedResults = results.slice(0, limit)

      const duration = Date.now() - startTime
      logger.debug(`Vector search completed: ${limitedResults.length} results in ${duration}ms`)

      return limitedResults
    } catch (error) {
      logger.error('Vector search failed:', error)
      throw error
    }
  }

  public async get(id: string): Promise<VectorEntry | null> {
    try {
      const stmt = this.db.prepare(`
        SELECT id, embedding_data, metadata, dimension
        FROM vector_embeddings
        WHERE id = ?
      `)

      const row = stmt.get(id)
      if (!row) return null

      return {
        id: row.id,
        embedding: this.deserializeEmbedding(row.embedding_data),
        metadata: JSON.parse(row.metadata)
      }
    } catch (error) {
      logger.error(`Failed to get vector entry ${id}:`, error)
      throw error
    }
  }

  public async delete(id: string): Promise<boolean> {
    try {
      const stmt = this.db.prepare(`
        DELETE FROM vector_embeddings
        WHERE id = ?
      `)

      const result = stmt.run(id)
      const deleted = result.changes > 0

      if (deleted) {
        logger.debug(`Deleted vector entry: ${id}`)
      }

      return deleted
    } catch (error) {
      logger.error(`Failed to delete vector entry ${id}:`, error)
      throw error
    }
  }

  public async deleteBatch(ids: string[]): Promise<number> {
    if (ids.length === 0) return 0

    try {
      const placeholders = ids.map(() => '?').join(',')
      const stmt = this.db.prepare(`
        DELETE FROM vector_embeddings
        WHERE id IN (${placeholders})
      `)

      const result = stmt.run(...ids)
      logger.debug(`Deleted ${result.changes} vector entries in batch`)

      return result.changes
    } catch (error) {
      logger.error('Failed to delete vector batch:', error)
      throw error
    }
  }

  public async deleteByFilter(filter: any): Promise<number> {
    try {
      const filterConditions = this.buildFilterConditions(filter)
      if (filterConditions.length === 0) {
        throw new Error('Cannot delete without filter conditions')
      }

      const query = `
        DELETE FROM vector_embeddings
        WHERE ${filterConditions.join(' AND ')}
      `

      const stmt = this.db.prepare(query)
      const result = stmt.run()
      
      logger.debug(`Deleted ${result.changes} vector entries by filter`)
      return result.changes
    } catch (error) {
      logger.error('Failed to delete by filter:', error)
      throw error
    }
  }

  public async count(filter?: any): Promise<number> {
    try {
      let query = `SELECT COUNT(*) as count FROM vector_embeddings`
      
      if (filter) {
        const filterConditions = this.buildFilterConditions(filter)
        if (filterConditions.length > 0) {
          query += ` WHERE ${filterConditions.join(' AND ')}`
        }
      }

      const stmt = this.db.prepare(query)
      const result = stmt.get() as { count: number }
      
      return result.count
    } catch (error) {
      logger.error('Failed to count vector entries:', error)
      throw error
    }
  }

  public async getStats(): Promise<any> {
    try {
      const totalCount = await this.count()
      
      const stmt = this.db.prepare(`
        SELECT 
          AVG(dimension) as avg_dimension,
          MIN(dimension) as min_dimension,
          MAX(dimension) as max_dimension
        FROM vector_embeddings
      `)
      
      const dimensionStats = stmt.get()
      
      return {
        totalVectors: totalCount,
        dimensionStats,
        similarityThreshold: this.similarityThreshold,
        embeddingModel: this.embeddingGenerator.getModelInfo()
      }
    } catch (error) {
      logger.error('Failed to get vector database stats:', error)
      throw error
    }
  }

  public async cleanup(olderThanDays: number = 30): Promise<number> {
    try {
      const cutoffDate = new Date(Date.now() - (olderThanDays * 24 * 60 * 60 * 1000)).toISOString()
      
      const stmt = this.db.prepare(`
        DELETE FROM vector_embeddings
        WHERE created_at < ?
      `)

      const result = stmt.run(cutoffDate)
      logger.info(`Cleaned up ${result.changes} old vector entries`)
      
      return result.changes
    } catch (error) {
      logger.error('Failed to cleanup vector database:', error)
      throw error
    }
  }

  private deserializeEmbedding(buffer: Buffer): number[] {
    const float64Array = new Float64Array(buffer.buffer, buffer.byteOffset, buffer.length / 8)
    return Array.from(float64Array)
  }

  private buildFilterConditions(filter: any): string[] {
    const conditions: string[] = []
    
    if (typeof filter === 'object' && filter !== null) {
      for (const [key, value] of Object.entries(filter)) {
        if (key === 'type' || key === 'personaId' || key === 'domain') {
          conditions.push(`json_extract(metadata, '$.${key}') = '${value}'`)
        }
      }
    }

    return conditions
  }
}
