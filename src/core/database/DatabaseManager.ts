import sqlite3 from 'sqlite3'
import { existsSync, mkdirSync } from 'fs'
import { dirname } from 'path'
import { createTablesSQL, seedDataSQL } from './schemas.js'
import { logger } from '../../utils/logger.js'

export class DatabaseManager {
  private static instance: DatabaseManager
  private db: sqlite3.Database | null = null
  private dbPath: string

  private constructor() {
    this.dbPath = process.env.DATABASE_PATH || './database/cerebellum.db'
  }

  public static getInstance(): DatabaseManager {
    if (!DatabaseManager.instance) {
      DatabaseManager.instance = new DatabaseManager()
    }
    return DatabaseManager.instance
  }

  public async initialize(): Promise<void> {
    try {
      // Ensure database directory exists
      const dbDir = dirname(this.dbPath)
      if (!existsSync(dbDir)) {
        mkdirSync(dbDir, { recursive: true })
        logger.info(`Created database directory: ${dbDir}`)
      }

      // Open database connection
      await new Promise<void>((resolve, reject) => {
        this.db = new sqlite3.Database(this.dbPath, (err) => {
          if (err) {
            reject(err)
          } else {
            resolve()
          }
        })
      })
      
      // Enable WAL mode for better concurrent performance
      if (process.env.ENABLE_WAL_MODE === 'true') {
        await this.run('PRAGMA journal_mode = WAL')
      }
      
      // Optimize SQLite settings
      await this.run('PRAGMA synchronous = NORMAL')
      await this.run('PRAGMA cache_size = 1000')
      await this.run('PRAGMA temp_store = memory')
      await this.run('PRAGMA mmap_size = 268435456') // 256MB

      // Create tables
      await this.exec(createTablesSQL)
      logger.info('Database tables created successfully')

      // Seed default data
      await this.exec(seedDataSQL)
      logger.info('Database seeded with default data')

      // Auto-generate API key if none exists
      await this.ensureApiKeyExists()

      logger.info(`Database initialized successfully at ${this.dbPath}`)
    } catch (error) {
      logger.error('Failed to initialize database:', error)
      throw error
    }
  }

  public getDatabase(): sqlite3.Database {
    if (!this.db) {
      throw new Error('Database not initialized. Call initialize() first.')
    }
    return this.db
  }

  public async run(sql: string, params: any[] = []): Promise<sqlite3.RunResult> {
    const db = this.getDatabase()
    return new Promise((resolve, reject) => {
      db.run(sql, params, function(err) {
        if (err) {
          reject(err)
        } else {
          resolve(this)
        }
      })
    })
  }

  public async get(sql: string, params: any[] = []): Promise<any> {
    const db = this.getDatabase()
    return new Promise((resolve, reject) => {
      db.get(sql, params, (err, row) => {
        if (err) {
          reject(err)
        } else {
          resolve(row)
        }
      })
    })
  }

  public async all(sql: string, params: any[] = []): Promise<any[]> {
    const db = this.getDatabase()
    return new Promise((resolve, reject) => {
      db.all(sql, params, (err, rows) => {
        if (err) {
          reject(err)
        } else {
          resolve(rows || [])
        }
      })
    })
  }

  public async exec(sql: string): Promise<void> {
    const db = this.getDatabase()
    return new Promise((resolve, reject) => {
      db.exec(sql, (err) => {
        if (err) {
          reject(err)
        } else {
          resolve()
        }
      })
    })
  }

  public prepare(sql: string): any {
    // For compatibility with existing code, return an object with run/get/all methods
    return {
      run: (...params: any[]) => this.run(sql, params),
      get: (...params: any[]) => this.get(sql, params),
      all: (...params: any[]) => this.all(sql, params)
    }
  }

  public async transaction<T>(fn: () => Promise<T>): Promise<T> {
    await this.run('BEGIN TRANSACTION')
    try {
      const result = await fn()
      await this.run('COMMIT')
      return result
    } catch (error) {
      await this.run('ROLLBACK')
      throw error
    }
  }

  private async ensureApiKeyExists(): Promise<void> {
    try {
      const stmt = this.prepare('SELECT COUNT(*) as count FROM api_keys WHERE is_active = 1')
      const result = stmt.get() as { count: number }
      
      if (result.count === 0) {
        const apiKey = await this.generateApiKey('System Generated', 'Auto-generated API key on installation')
        logger.info(`Generated initial API key: ${apiKey}`)
        logger.info('IMPORTANT: Save this API key - it will not be displayed again!')
      }
    } catch (error) {
      logger.error('Failed to ensure API key exists:', error)
    }
  }

  private async generateApiKey(name: string, description: string): Promise<string> {
    const { randomBytes } = await import('crypto')
    const bcrypt = await import('bcryptjs')
    const { v4: uuidv4 } = await import('uuid')
    
    const keyLength = parseInt(process.env.API_KEY_LENGTH || '32')
    const rawKey = randomBytes(keyLength).toString('hex')
    const keyId = uuidv4()
    
    const saltRounds = parseInt(process.env.BCRYPT_ROUNDS || '12')
    const keyHash = await bcrypt.hash(rawKey, saltRounds)
    
    const stmt = this.prepare(`
      INSERT INTO api_keys (id, key_hash, name, description, created_at)
      VALUES (?, ?, ?, ?, ?)
    `)
    
    stmt.run(keyId, keyHash, name, description, new Date().toISOString())
    
    return rawKey
  }

  public async close(): Promise<void> {
    if (this.db) {
      this.db.close()
      this.db = null
      logger.info('Database connection closed')
    }
  }

  public async backup(backupPath: string): Promise<void> {
    try {
      // sqlite3 doesn't have built-in backup, so we'll copy the database file
      const fs = await import('fs')
      await fs.promises.copyFile(this.dbPath, backupPath)
      logger.info(`Database backed up to: ${backupPath}`)
    } catch (error) {
      logger.error('Database backup failed:', error)
      throw error
    }
  }

  public async getStats(): Promise<any> {
    const stats = {
      personas: await this.get('SELECT COUNT(*) as count FROM personas'),
      episodicMemories: await this.get('SELECT COUNT(*) as count FROM episodic_memories'),
      semanticKnowledge: await this.get('SELECT COUNT(*) as count FROM semantic_knowledge'),
      proceduralSkills: await this.get('SELECT COUNT(*) as count FROM procedural_skills'),
      apiKeys: await this.get('SELECT COUNT(*) as count FROM api_keys WHERE is_active = 1'),
      databaseSize: this.getDatabaseSize()
    }

    return stats
  }

  private getDatabaseSize(): string {
    try {
      const fs = require('fs')
      const stats = fs.statSync(this.dbPath)
      const fileSizeInBytes = stats.size
      const fileSizeInMB = (fileSizeInBytes / (1024 * 1024)).toFixed(2)
      return `${fileSizeInMB} MB`
    } catch (error) {
      return 'Unknown'
    }
  }

  // Cleanup old log entries
  public async cleanupLogs(daysToKeep: number = 30): Promise<void> {
    const cutoffDate = new Date(Date.now() - (daysToKeep * 24 * 60 * 60 * 1000)).toISOString()
    
    const cleanupQueries = [
      'DELETE FROM api_usage_log WHERE timestamp < ?',
      'DELETE FROM consciousness_evolution_log WHERE timestamp < ?',
      'DELETE FROM sleep_cycles WHERE timestamp < ?'
    ]

    await this.transaction(async () => {
      for (const query of cleanupQueries) {
        const result = await this.run(query, [cutoffDate])
        logger.info(`Cleaned up ${result.changes} old log entries with query: ${query}`)
      }
    })
  }
}
