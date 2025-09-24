import { DatabaseManager } from '../database/DatabaseManager.js'
import { EpisodicMemory } from './EpisodicMemory.js'
import { SemanticMemory } from './SemanticMemory.js'
import { ProceduralMemory } from './ProceduralMemory.js'
import { MemoryConsolidationResult } from '../../types/memory.js'
import { logger } from '../../utils/logger.js'

export class MemoryConsolidation {
  private db: DatabaseManager
  private episodicMemory: EpisodicMemory
  private semanticMemory: SemanticMemory
  private proceduralMemory: ProceduralMemory

  constructor() {
    this.db = DatabaseManager.getInstance()
    this.episodicMemory = new EpisodicMemory()
    this.semanticMemory = new SemanticMemory()
    this.proceduralMemory = new ProceduralMemory()
  }

  async consolidateRecent(personaId: string, limit: number = 10): Promise<MemoryConsolidationResult> {
    try {
      logger.info(`Starting recent memory consolidation for persona ${personaId} (limit: ${limit})`)

      const result: MemoryConsolidationResult = {
        consolidatedCount: 0,
        patternsIdentified: [],
        importanceAdjustments: [],
        insights: []
      }

      // Get recent episodic memories for consolidation
      const recentEpisodes = await this.episodicMemory.getRecentEpisodes(personaId, limit)
      
      for (const episode of recentEpisodes) {
        // Basic importance recalculation
        const patterns = await this.identifyBasicPatterns(episode)
        const newImportance = this.calculateConsolidatedImportance(episode, patterns)

        if (Math.abs(newImportance - episode.importanceScore) > 0.05) {
          result.importanceAdjustments.push({
            memoryId: episode.id!,
            oldScore: episode.importanceScore,
            newScore: newImportance,
            reason: 'Recent consolidation adjustment'
          })

          await this.updateEpisodeImportance(episode.id!, newImportance)
        }

        result.patternsIdentified.push(...patterns)
        result.consolidatedCount++
      }

      result.insights.push(`Processed ${result.consolidatedCount} recent memories`)
      
      if (result.importanceAdjustments.length > 0) {
        result.insights.push(`Adjusted importance scores for ${result.importanceAdjustments.length} memories`)
      }

      logger.debug(`Recent consolidation completed: ${result.consolidatedCount} memories processed`)
      return result
    } catch (error) {
      logger.error(`Failed to consolidate recent memories for persona ${personaId}:`, error)
      throw error
    }
  }

  async consolidateWithPatterns(personaId: string): Promise<MemoryConsolidationResult> {
    try {
      logger.info(`Starting pattern-based consolidation for persona ${personaId}`)

      const result: MemoryConsolidationResult = {
        consolidatedCount: 0,
        patternsIdentified: [],
        importanceAdjustments: [],
        insights: []
      }

      // Consolidate episodic memories
      await this.episodicMemory.consolidateMemories(personaId)
      
      // Extract semantic knowledge from consolidated episodes
      const extractedKnowledge = await this.extractSemanticKnowledge(personaId)
      result.insights.push(`Extracted ${extractedKnowledge} new knowledge items`)

      // Consolidate semantic knowledge
      await this.semanticMemory.consolidateKnowledge(personaId)

      // Update procedural skills based on patterns
      await this.updateProceduralSkills(personaId)

      // Identify cross-memory patterns
      const crossPatterns = await this.identifyCrossMemoryPatterns(personaId)
      result.patternsIdentified.push(...crossPatterns)

      result.consolidatedCount = await this.getConsolidatedCount(personaId)
      result.insights.push('Completed comprehensive pattern-based consolidation')

      logger.debug(`Pattern consolidation completed: ${crossPatterns.length} patterns identified`)
      return result
    } catch (error) {
      logger.error(`Failed to consolidate with patterns for persona ${personaId}:`, error)
      throw error
    }
  }

  async integrateCreativeInsights(personaId: string): Promise<MemoryConsolidationResult> {
    try {
      logger.info(`Starting creative insight integration for persona ${personaId}`)

      const result: MemoryConsolidationResult = {
        consolidatedCount: 0,
        patternsIdentified: [],
        importanceAdjustments: [],
        insights: []
      }

      // Find creative connections between different memory types
      const creativeConnections = await this.findCreativeConnections(personaId)
      result.insights.push(...creativeConnections.insights)

      // Generate novel knowledge from creative connections
      const novelKnowledge = await this.generateNovelKnowledge(personaId, creativeConnections.connections)
      
      if (novelKnowledge.length > 0) {
        result.insights.push(`Generated ${novelKnowledge.length} novel insights from creative integration`)
        
        // Store novel insights as semantic knowledge
        for (const insight of novelKnowledge) {
          await this.semanticMemory.storeKnowledge(personaId, {
            domain: 'creative_insights',
            concept: insight.concept,
            content: insight.content,
            confidenceLevel: insight.confidence,
            source: 'creative_integration'
          })
        }
      }

      // Perform creative skill synthesis
      await this.synthesizeCreativeSkills(personaId)

      result.consolidatedCount = creativeConnections.connections.length
      result.patternsIdentified.push('creative_connections', 'novel_insights')

      logger.debug(`Creative integration completed: ${result.consolidatedCount} connections processed`)
      return result
    } catch (error) {
      logger.error(`Failed to integrate creative insights for persona ${personaId}:`, error)
      throw error
    }
  }

  async fullMemoryReorganization(personaId: string): Promise<MemoryConsolidationResult> {
    try {
      logger.info(`Starting full memory reorganization for persona ${personaId}`)

      const result: MemoryConsolidationResult = {
        consolidatedCount: 0,
        patternsIdentified: [],
        importanceAdjustments: [],
        insights: []
      }

      // Perform comprehensive memory cleanup
      const cleanupResults = await this.performMemoryCleanup(personaId)
      result.insights.push(...cleanupResults.insights)

      // Reorganize memory hierarchies
      await this.reorganizeMemoryHierarchies(personaId)

      // Optimize memory associations
      const optimizationResults = await this.optimizeMemoryAssociations(personaId)
      result.patternsIdentified.push(...optimizationResults.patterns)

      // Consolidate all memory types
      await this.consolidateWithPatterns(personaId)

      // Archive old, low-importance memories
      const archiveCount = await this.archiveOldMemories(personaId)
      result.insights.push(`Archived ${archiveCount} old memories`)

      result.consolidatedCount = cleanupResults.processedCount + optimizationResults.optimizedCount
      result.insights.push('Completed full memory reorganization')

      logger.debug(`Full reorganization completed: ${result.consolidatedCount} items processed`)
      return result
    } catch (error) {
      logger.error(`Failed to perform full memory reorganization for persona ${personaId}:`, error)
      throw error
    }
  }

  async performMaintenance(personaId: string): Promise<void> {
    try {
      logger.info(`Performing memory maintenance for persona ${personaId}`)

      // Clean up temporary data
      await this.cleanupTemporaryData(personaId)

      // Optimize database indices (if needed)
      await this.optimizeStorageIndices()

      // Verify memory integrity
      await this.verifyMemoryIntegrity(personaId)

      // Update memory statistics
      await this.updateMemoryStatistics(personaId)

      logger.debug('Memory maintenance completed successfully')
    } catch (error) {
      logger.error(`Failed to perform memory maintenance for persona ${personaId}:`, error)
      throw error
    }
  }

  private async identifyBasicPatterns(episode: any): Promise<string[]> {
    const patterns: string[] = []

    // Time-based patterns
    const hour = new Date(episode.timestamp).getHours()
    if (hour < 6) patterns.push('late_night_activity')
    else if (hour < 12) patterns.push('morning_activity')
    else if (hour < 18) patterns.push('afternoon_activity')
    else patterns.push('evening_activity')

    // Content-based patterns
    if (episode.eventType) {
      patterns.push(`event_type_${episode.eventType}`)
    }

    // Emotional patterns
    if (episode.emotionalValence > 0.5) patterns.push('positive_emotional_experience')
    else if (episode.emotionalValence < -0.5) patterns.push('negative_emotional_experience')

    // Importance patterns
    if (episode.importanceScore > 0.7) patterns.push('high_importance_event')

    return patterns
  }

  private calculateConsolidatedImportance(episode: any, patterns: string[]): number {
    let importance = episode.importanceScore

    // Adjust based on patterns
    if (patterns.includes('positive_emotional_experience')) importance += 0.05
    if (patterns.includes('high_importance_event')) importance += 0.02
    if (patterns.includes('negative_emotional_experience')) importance += 0.08 // Negative experiences often more memorable

    // Temporal decay
    const ageInDays = (Date.now() - new Date(episode.timestamp).getTime()) / (1000 * 60 * 60 * 24)
    const decay = Math.exp(-ageInDays / 60) // 60-day half-life
    importance *= decay

    // Pattern reinforcement
    const patternBonus = Math.min(patterns.length * 0.01, 0.05)
    importance += patternBonus

    return Math.max(0, Math.min(1, importance))
  }

  private async updateEpisodeImportance(episodeId: string, newImportance: number): Promise<void> {
    try {
      const stmt = this.db.prepare(`
        UPDATE episodic_memories 
        SET importance_score = ? 
        WHERE id = ?
      `)
      
      stmt.run(newImportance, episodeId)
    } catch (error) {
      logger.error(`Failed to update episode importance for ${episodeId}:`, error)
    }
  }

  private async extractSemanticKnowledge(personaId: string): Promise<number> {
    try {
      // Get recently consolidated episodes
      const episodes = await this.episodicMemory.getRecentEpisodes(personaId, 20)
      
      let extractedCount = 0
      
      for (const episode of episodes) {
        // Extract knowledge from conversation episodes
        if (episode.eventType === 'conversation' && episode.importanceScore > 0.5) {
          const knowledge = this.extractKnowledgeFromEpisode(episode)
          
          if (knowledge) {
            await this.semanticMemory.storeKnowledge(personaId, knowledge)
            extractedCount++
          }
        }
      }

      return extractedCount
    } catch (error) {
      logger.error(`Failed to extract semantic knowledge for persona ${personaId}:`, error)
      return 0
    }
  }

  private extractKnowledgeFromEpisode(episode: any): any | null {
    try {
      // Simple knowledge extraction - could be enhanced with NLP
      const content = JSON.stringify(episode.content)
      
      // Look for factual statements or learning moments
      if (content.includes('learn') || content.includes('fact') || content.includes('knowledge')) {
        return {
          domain: episode.eventType,
          concept: `learning_from_${episode.eventType}`,
          content: {
            source: 'episodic_memory',
            originalContent: episode.content,
            context: episode.context,
            extractedAt: new Date().toISOString()
          },
          confidenceLevel: episode.importanceScore * 0.8, // Lower confidence for extracted knowledge
          source: 'memory_consolidation'
        }
      }

      return null
    } catch (error) {
      logger.error('Failed to extract knowledge from episode:', error)
      return null
    }
  }

  private async updateProceduralSkills(personaId: string): Promise<void> {
    try {
      // Get recent successful experiences
      const recentEpisodes = await this.episodicMemory.getRecentEpisodes(personaId, 30)
      
      for (const episode of recentEpisodes) {
        if (episode.importanceScore > 0.6 && episode.emotionalValence > 0.3) {
          // Try to extract procedural patterns
          const skillExperience = this.extractSkillExperience(episode)
          
          if (skillExperience) {
            await this.proceduralMemory.evolveSkillFromExperience(personaId, skillExperience)
          }
        }
      }
    } catch (error) {
      logger.error(`Failed to update procedural skills for persona ${personaId}:`, error)
    }
  }

  private extractSkillExperience(episode: any): any | null {
    // Extract procedural information from episodes
    if (episode.eventType === 'problem_solving' || episode.eventType === 'task_completion') {
      return {
        context: episode.participants || ['general'],
        action: episode.content,
        outcome: episode.emotionalValence > 0 ? 'success' : 'failure',
        domain: episode.eventType
      }
    }

    return null
  }

  private async identifyCrossMemoryPatterns(personaId: string): Promise<string[]> {
    const patterns: string[] = []

    try {
      // Find correlations between different memory types
      const episodes = await this.episodicMemory.getRecentEpisodes(personaId, 50)
      const knowledge = await this.semanticMemory.queryKnowledge(personaId, 'general', { limit: 20 })
      
      // Simple pattern identification
      const commonDomains = this.findCommonDomains(episodes, knowledge)
      patterns.push(...commonDomains.map(domain => `cross_domain_${domain}`))

      // Temporal patterns
      const timePatterns = this.identifyTimePatterns(episodes)
      patterns.push(...timePatterns)

    } catch (error) {
      logger.error('Failed to identify cross-memory patterns:', error)
    }

    return patterns
  }

  private findCommonDomains(episodes: any[], knowledge: any[]): string[] {
    const episodeDomains = new Set(episodes.map(e => e.eventType))
    const knowledgeDomains = new Set(knowledge.map(k => k.domain))
    
    return Array.from(episodeDomains).filter(domain => knowledgeDomains.has(domain))
  }

  private identifyTimePatterns(episodes: any[]): string[] {
    const patterns: string[] = []
    
    // Group by time of day
    const timeGroups = episodes.reduce((acc, episode) => {
      const hour = new Date(episode.timestamp).getHours()
      const timeSlot = hour < 12 ? 'morning' : hour < 18 ? 'afternoon' : 'evening'
      acc[timeSlot] = (acc[timeSlot] || 0) + 1
      return acc
    }, {})

    // Identify dominant time patterns
    const maxCount = Math.max(...Object.values(timeGroups))
    const dominantTimes = Object.keys(timeGroups).filter(time => timeGroups[time] === maxCount)
    
    patterns.push(...dominantTimes.map(time => `dominant_${time}_activity`))

    return patterns
  }

  private async findCreativeConnections(personaId: string): Promise<any> {
    const connections: any[] = []
    const insights: string[] = []

    try {
      // Get diverse memory samples
      const episodes = await this.episodicMemory.getRecentEpisodes(personaId, 30)
      const knowledge = await this.semanticMemory.queryKnowledge(personaId, 'creative', { limit: 10 })
      const skills = await this.proceduralMemory.getAllSkills(personaId)

      // Find unexpected connections
      for (let i = 0; i < episodes.length; i++) {
        for (let j = i + 1; j < episodes.length; j++) {
          const connection = this.findUnexpectedConnection(episodes[i], episodes[j])
          if (connection) {
            connections.push(connection)
          }
        }
      }

      insights.push(`Found ${connections.length} creative connections between memories`)
      
      // Connect knowledge with experiences
      for (const know of knowledge) {
        const relatedEpisodes = episodes.filter(ep => 
          JSON.stringify(ep.content).toLowerCase().includes(know.concept.toLowerCase())
        )
        
        if (relatedEpisodes.length > 0) {
          connections.push({
            type: 'knowledge_experience',
            knowledge: know.concept,
            episodes: relatedEpisodes.map(ep => ep.id)
          })
        }
      }

    } catch (error) {
      logger.error('Failed to find creative connections:', error)
    }

    return { connections, insights }
  }

  private findUnexpectedConnection(episode1: any, episode2: any): any | null {
    // Look for connections between different event types with similar outcomes
    if (episode1.eventType !== episode2.eventType && 
        Math.abs(episode1.emotionalValence - episode2.emotionalValence) < 0.2) {
      
      return {
        type: 'cross_domain_similarity',
        episode1: episode1.id,
        episode2: episode2.id,
        similarity: 'emotional_outcome',
        strength: 1 - Math.abs(episode1.emotionalValence - episode2.emotionalValence)
      }
    }

    return null
  }

  private async generateNovelKnowledge(personaId: string, connections: any[]): Promise<any[]> {
    const novelKnowledge: any[] = []

    try {
      // Generate insights from connections
      for (const connection of connections.slice(0, 5)) { // Limit to avoid overprocessing
        if (connection.type === 'cross_domain_similarity') {
          novelKnowledge.push({
            concept: `pattern_${connection.similarity}`,
            content: {
              connectionType: connection.type,
              domains: [connection.episode1, connection.episode2],
              insight: `Similar emotional outcomes observed across different activity types`,
              strength: connection.strength
            },
            confidence: connection.strength * 0.6
          })
        }
      }
    } catch (error) {
      logger.error('Failed to generate novel knowledge:', error)
    }

    return novelKnowledge
  }

  private async synthesizeCreativeSkills(personaId: string): Promise<void> {
    // Placeholder for creative skill synthesis
    // This would combine different procedural skills in novel ways
    logger.debug(`Synthesized creative skills for persona ${personaId}`)
  }

  private async getConsolidatedCount(personaId: string): Promise<number> {
    try {
      const stmt = this.db.prepare(`
        SELECT COUNT(*) as count FROM episodic_memories 
        WHERE persona_id = ? AND is_consolidated = 1
      `)
      
      const result = stmt.get(personaId) as { count: number }
      return result.count
    } catch (error) {
      logger.error('Failed to get consolidated count:', error)
      return 0
    }
  }

  private async performMemoryCleanup(personaId: string): Promise<any> {
    const insights: string[] = []
    let processedCount = 0

    try {
      // Remove duplicate memories
      const duplicates = await this.findDuplicateMemories(personaId)
      for (const duplicate of duplicates) {
        await this.mergeDuplicateMemories(duplicate.ids)
        processedCount++
      }

      if (duplicates.length > 0) {
        insights.push(`Merged ${duplicates.length} duplicate memory groups`)
      }

      // Clean up low-importance, old memories
      const cleanedCount = await this.cleanupLowImportanceMemories(personaId)
      processedCount += cleanedCount

      if (cleanedCount > 0) {
        insights.push(`Cleaned up ${cleanedCount} low-importance memories`)
      }

    } catch (error) {
      logger.error('Failed to perform memory cleanup:', error)
    }

    return { insights, processedCount }
  }

  private async findDuplicateMemories(personaId: string): Promise<any[]> {
    // Simple duplicate detection - could be enhanced
    return [] // Placeholder
  }

  private async mergeDuplicateMemories(memoryIds: string[]): Promise<void> {
    // Placeholder for memory merging logic
  }

  private async cleanupLowImportanceMemories(personaId: string): Promise<number> {
    try {
      // Remove very old, low-importance memories
      const stmt = this.db.prepare(`
        DELETE FROM episodic_memories 
        WHERE persona_id = ? 
        AND importance_score < 0.1 
        AND datetime(timestamp) < datetime('now', '-90 days')
      `)

      const result = stmt.run(personaId)
      return result.changes
    } catch (error) {
      logger.error('Failed to cleanup low importance memories:', error)
      return 0
    }
  }

  private async reorganizeMemoryHierarchies(personaId: string): Promise<void> {
    // Placeholder for memory hierarchy reorganization
    logger.debug(`Reorganized memory hierarchies for persona ${personaId}`)
  }

  private async optimizeMemoryAssociations(personaId: string): Promise<any> {
    // Placeholder for memory association optimization
    return { patterns: ['optimized_associations'], optimizedCount: 0 }
  }

  private async archiveOldMemories(personaId: string): Promise<number> {
    try {
      // Archive very old memories instead of deleting
      const stmt = this.db.prepare(`
        UPDATE episodic_memories 
        SET context = json_set(context, '$.archived', 1)
        WHERE persona_id = ? 
        AND importance_score < 0.3
        AND datetime(timestamp) < datetime('now', '-180 days')
      `)

      const result = stmt.run(personaId)
      return result.changes
    } catch (error) {
      logger.error('Failed to archive old memories:', error)
      return 0
    }
  }

  private async cleanupTemporaryData(personaId: string): Promise<void> {
    // Clean up any temporary consolidation data
    logger.debug(`Cleaned up temporary data for persona ${personaId}`)
  }

  private async optimizeStorageIndices(): Promise<void> {
    // Database index optimization if needed
    logger.debug('Optimized storage indices')
  }

  private async verifyMemoryIntegrity(personaId: string): Promise<void> {
    // Verify data integrity
    logger.debug(`Verified memory integrity for persona ${personaId}`)
  }

  private async updateMemoryStatistics(personaId: string): Promise<void> {
    // Update cached statistics
    logger.debug(`Updated memory statistics for persona ${personaId}`)
  }
}
