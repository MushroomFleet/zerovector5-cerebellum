import { DatabaseManager } from '../database/DatabaseManager.js'
import { VectorDatabase } from '../vectorstore/VectorDatabase.js'
import { EmbeddingGenerator } from '../vectorstore/EmbeddingGenerator.js'
import { EpisodicMemoryEntry, MemorySearchResult } from '../../types/memory.js'
import { logger } from '../../utils/logger.js'

export class EpisodicMemory {
  private db: DatabaseManager
  private vectorDb: VectorDatabase
  private embeddings: EmbeddingGenerator

  constructor() {
    this.db = DatabaseManager.getInstance()
    this.vectorDb = VectorDatabase.getInstance()
    this.embeddings = EmbeddingGenerator.getInstance()
  }

  async storeEpisode(personaId: string, episode: EpisodicMemoryEntry): Promise<string> {
    const episodeId = episode.id || this.generateEpisodeId()
    
    try {
      // Generate embedding for content
      const contentEmbedding = await this.embeddings.generateEmbedding(
        this.combineEpisodeContent(episode)
      )

      // Store in relational database
      const stmt = this.db.prepare(`
        INSERT INTO episodic_memories (
          id, persona_id, timestamp, event_type, content, 
          context, emotional_valence, importance_score, 
          participants, location, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)

      stmt.run(
        episodeId,
        personaId,
        episode.timestamp.toISOString(),
        episode.eventType,
        JSON.stringify(episode.content),
        JSON.stringify(episode.context),
        episode.emotionalValence,
        episode.importanceScore,
        JSON.stringify(episode.participants || []),
        episode.location || null,
        new Date().toISOString()
      )

      // Store embedding in vector database
      await this.vectorDb.upsert({
        id: episodeId,
        embedding: contentEmbedding,
        metadata: {
          type: 'episodic',
          personaId,
          timestamp: episode.timestamp.toISOString(),
          eventType: episode.eventType,
          importanceScore: episode.importanceScore
        }
      })

      logger.memoryOperation('Store', personaId, 'episodic memory', 1)
      return episodeId
    } catch (error) {
      logger.error(`Failed to store episode for persona ${personaId}:`, error)
      throw error
    }
  }

  async searchEpisodes(
    personaId: string, 
    query: string, 
    options: {
      limit?: number
      timeRange?: { start: Date; end: Date }
      eventTypes?: string[]
      minImportance?: number
    } = {}
  ): Promise<MemorySearchResult[]> {
    
    try {
      // Generate query embedding
      const queryEmbedding = await this.embeddings.generateEmbedding(query)

      // Vector similarity search
      const similarResults = await this.vectorDb.search({
        embedding: queryEmbedding,
        limit: options.limit || 10,
        filter: {
          type: 'episodic',
          personaId
        }
      })

      // Retrieve full episodes from database and apply additional filters
      const episodeIds = similarResults.map(r => r.id)
      const episodes = await this.getEpisodesByIds(episodeIds, options)

      // Combine and rank results
      const results = this.combineSearchResults(episodes, similarResults)
      
      logger.memoryOperation('Search', personaId, 'episodic memory', results.length)
      return results
    } catch (error) {
      logger.error(`Failed to search episodes for persona ${personaId}:`, error)
      throw error
    }
  }

  async getRecentEpisodes(personaId: string, limit: number = 20): Promise<EpisodicMemoryEntry[]> {
    try {
      const stmt = this.db.prepare(`
        SELECT * FROM episodic_memories 
        WHERE persona_id = ? 
        ORDER BY timestamp DESC 
        LIMIT ?
      `)

      const rows = stmt.all(personaId, limit)
      const episodes = rows.map(this.mapRowToEpisode)
      
      logger.memoryOperation('Get Recent', personaId, 'episodic memory', episodes.length)
      return episodes
    } catch (error) {
      logger.error(`Failed to get recent episodes for persona ${personaId}:`, error)
      throw error
    }
  }

  async consolidateMemories(personaId: string): Promise<void> {
    try {
      // Get recent unconsolidated episodes
      const recentEpisodes = await this.getUnconsolidatedEpisodes(personaId)
      
      let consolidatedCount = 0
      
      // Pattern identification and importance scoring
      for (const episode of recentEpisodes) {
        const patterns = await this.identifyPatterns(episode, personaId)
        const updatedImportance = await this.recalculateImportance(episode, patterns)
        
        // Update episode importance
        await this.updateEpisodeImportance(episode.id!, updatedImportance)
        
        // Mark as consolidated
        await this.markConsolidated(episode.id!)
        consolidatedCount++
      }

      logger.memoryOperation('Consolidate', personaId, 'episodic memory', consolidatedCount)
    } catch (error) {
      logger.error(`Failed to consolidate memories for persona ${personaId}:`, error)
      throw error
    }
  }

  async getMemoryStatistics(personaId: string): Promise<any> {
    try {
      const stmt = this.db.prepare(`
        SELECT 
          COUNT(*) as total,
          AVG(importance_score) as avg_importance,
          COUNT(CASE WHEN is_consolidated = 1 THEN 1 END) as consolidated,
          COUNT(CASE WHEN is_consolidated = 0 THEN 1 END) as pending_consolidation,
          event_type,
          COUNT(*) as type_count
        FROM episodic_memories 
        WHERE persona_id = ?
        GROUP BY event_type
      `)

      const typeStats = stmt.all(personaId)
      
      const overallStmt = this.db.prepare(`
        SELECT 
          COUNT(*) as total,
          AVG(importance_score) as avg_importance,
          COUNT(CASE WHEN is_consolidated = 1 THEN 1 END) as consolidated,
          COUNT(CASE WHEN is_consolidated = 0 THEN 1 END) as pending_consolidation
        FROM episodic_memories 
        WHERE persona_id = ?
      `)

      const overall = overallStmt.get(personaId)

      return {
        overall,
        byType: typeStats,
        consolidationStatus: {
          pending: overall.pending_consolidation,
          processed: overall.consolidated,
          lastConsolidation: await this.getLastConsolidationDate(personaId)
        }
      }
    } catch (error) {
      logger.error(`Failed to get memory statistics for persona ${personaId}:`, error)
      throw error
    }
  }

  private combineEpisodeContent(episode: EpisodicMemoryEntry): string {
    return [
      episode.eventType,
      JSON.stringify(episode.content),
      JSON.stringify(episode.context),
      episode.location || '',
      (episode.participants || []).join(' ')
    ].join(' ')
  }

  private generateEpisodeId(): string {
    return `ep_${Date.now()}_${Math.random().toString(36).substring(7)}`
  }

  private mapRowToEpisode(row: any): EpisodicMemoryEntry {
    return {
      id: row.id,
      timestamp: new Date(row.timestamp),
      eventType: row.event_type,
      content: JSON.parse(row.content),
      context: JSON.parse(row.context),
      emotionalValence: row.emotional_valence,
      importanceScore: row.importance_score,
      participants: JSON.parse(row.participants || '[]'),
      location: row.location
    }
  }

  private async getEpisodesByIds(
    episodeIds: string[], 
    options: {
      timeRange?: { start: Date; end: Date }
      eventTypes?: string[]
      minImportance?: number
    }
  ): Promise<EpisodicMemoryEntry[]> {
    if (episodeIds.length === 0) return []

    try {
      let query = `
        SELECT * FROM episodic_memories 
        WHERE id IN (${episodeIds.map(() => '?').join(',')})
      `
      const params: any[] = [...episodeIds]

      // Add additional filters
      if (options.timeRange) {
        query += ` AND timestamp BETWEEN ? AND ?`
        params.push(options.timeRange.start.toISOString(), options.timeRange.end.toISOString())
      }

      if (options.eventTypes && options.eventTypes.length > 0) {
        query += ` AND event_type IN (${options.eventTypes.map(() => '?').join(',')})`
        params.push(...options.eventTypes)
      }

      if (options.minImportance !== undefined) {
        query += ` AND importance_score >= ?`
        params.push(options.minImportance)
      }

      const stmt = this.db.prepare(query)
      const rows = stmt.all(...params)
      
      return rows.map(this.mapRowToEpisode)
    } catch (error) {
      logger.error('Failed to get episodes by IDs:', error)
      throw error
    }
  }

  private combineSearchResults(
    episodes: EpisodicMemoryEntry[], 
    vectorResults: any[]
  ): MemorySearchResult[] {
    const resultMap = new Map<string, any>()
    
    // Map vector results by ID
    vectorResults.forEach(vr => {
      resultMap.set(vr.id, vr)
    })

    return episodes.map(episode => {
      const vectorResult = resultMap.get(episode.id!)
      
      return {
        id: episode.id!,
        content: episode.content,
        relevanceScore: vectorResult?.score || 0,
        timestamp: episode.timestamp,
        type: 'episodic' as const,
        metadata: {
          eventType: episode.eventType,
          importanceScore: episode.importanceScore,
          emotionalValence: episode.emotionalValence,
          participants: episode.participants,
          location: episode.location,
          context: episode.context
        }
      }
    }).sort((a, b) => b.relevanceScore - a.relevanceScore)
  }

  private async getUnconsolidatedEpisodes(personaId: string): Promise<EpisodicMemoryEntry[]> {
    const stmt = this.db.prepare(`
      SELECT * FROM episodic_memories 
      WHERE persona_id = ? AND is_consolidated = 0
      ORDER BY timestamp DESC 
      LIMIT 50
    `)

    const rows = stmt.all(personaId)
    return rows.map(this.mapRowToEpisode)
  }

  private async identifyPatterns(episode: EpisodicMemoryEntry, personaId: string): Promise<string[]> {
    // Simple pattern identification - could be enhanced with ML
    const patterns: string[] = []
    
    // Time-based patterns
    const hour = episode.timestamp.getHours()
    if (hour < 6) patterns.push('late_night')
    else if (hour < 12) patterns.push('morning')
    else if (hour < 18) patterns.push('afternoon')
    else patterns.push('evening')

    // Content-based patterns
    if (episode.eventType === 'conversation') {
      if (episode.participants && episode.participants.length > 2) {
        patterns.push('group_conversation')
      } else {
        patterns.push('one_on_one_conversation')
      }
    }

    // Emotional patterns
    if (episode.emotionalValence > 0.5) patterns.push('positive_experience')
    else if (episode.emotionalValence < -0.5) patterns.push('negative_experience')

    return patterns
  }

  private async recalculateImportance(
    episode: EpisodicMemoryEntry, 
    patterns: string[]
  ): Promise<number> {
    let importance = episode.importanceScore

    // Adjust based on patterns
    if (patterns.includes('positive_experience')) importance += 0.1
    if (patterns.includes('negative_experience')) importance += 0.15
    if (patterns.includes('group_conversation')) importance += 0.05

    // Temporal decay (older memories become less important over time)
    const ageInDays = (Date.now() - episode.timestamp.getTime()) / (1000 * 60 * 60 * 24)
    const decay = Math.exp(-ageInDays / 30) // 30-day half-life
    importance *= decay

    return Math.max(0, Math.min(1, importance))
  }

  private async updateEpisodeImportance(episodeId: string, newImportance: number): Promise<void> {
    const stmt = this.db.prepare(`
      UPDATE episodic_memories 
      SET importance_score = ? 
      WHERE id = ?
    `)

    stmt.run(newImportance, episodeId)
  }

  private async markConsolidated(episodeId: string): Promise<void> {
    const stmt = this.db.prepare(`
      UPDATE episodic_memories 
      SET is_consolidated = 1 
      WHERE id = ?
    `)

    stmt.run(episodeId)
  }

  private async getLastConsolidationDate(personaId: string): Promise<Date | null> {
    const stmt = this.db.prepare(`
      SELECT MAX(created_at) as last_consolidation
      FROM episodic_memories 
      WHERE persona_id = ? AND is_consolidated = 1
    `)

    const result = stmt.get(personaId) as { last_consolidation: string | null }
    return result.last_consolidation ? new Date(result.last_consolidation) : null
  }
}
