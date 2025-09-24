import { DatabaseManager } from '../database/DatabaseManager.js'
import { VectorDatabase } from '../vectorstore/VectorDatabase.js'
import { EmbeddingGenerator } from '../vectorstore/EmbeddingGenerator.js'
import { SemanticKnowledge, KnowledgeNode } from '../../types/memory.js'
import { logger } from '../../utils/logger.js'

export class SemanticMemory {
  private db: DatabaseManager
  private vectorDb: VectorDatabase
  private embeddings: EmbeddingGenerator
  
  constructor() {
    this.db = DatabaseManager.getInstance()
    this.vectorDb = VectorDatabase.getInstance()
    this.embeddings = EmbeddingGenerator.getInstance()
  }

  async storeKnowledge(
    personaId: string, 
    knowledge: SemanticKnowledge
  ): Promise<string> {
    const knowledgeId = knowledge.id || this.generateKnowledgeId()

    try {
      // Generate embedding for knowledge content
      const embedding = await this.embeddings.generateEmbedding(
        this.combineKnowledgeContent(knowledge)
      )

      // Store in database
      const stmt = this.db.prepare(`
        INSERT INTO semantic_knowledge (
          id, persona_id, domain, concept, content, 
          confidence_level, source, relationships, 
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)

      const now = new Date().toISOString()
      stmt.run(
        knowledgeId,
        personaId,
        knowledge.domain,
        knowledge.concept,
        JSON.stringify(knowledge.content),
        knowledge.confidenceLevel,
        knowledge.source || 'experience',
        JSON.stringify(knowledge.relationships || []),
        now,
        now
      )

      // Store in vector database
      await this.vectorDb.upsert({
        id: knowledgeId,
        embedding,
        metadata: {
          type: 'semantic',
          personaId,
          domain: knowledge.domain,
          concept: knowledge.concept,
          confidenceLevel: knowledge.confidenceLevel
        }
      })

      logger.memoryOperation('Store', personaId, 'semantic knowledge', 1)
      return knowledgeId
    } catch (error) {
      logger.error(`Failed to store knowledge for persona ${personaId}:`, error)
      throw error
    }
  }

  async queryKnowledge(
    personaId: string,
    query: string,
    options: {
      domain?: string
      limit?: number
      minConfidence?: number
    } = {}
  ): Promise<SemanticKnowledge[]> {
    
    try {
      const queryEmbedding = await this.embeddings.generateEmbedding(query)

      const results = await this.vectorDb.search({
        embedding: queryEmbedding,
        limit: options.limit || 10,
        filter: {
          type: 'semantic',
          personaId,
          ...(options.domain && { domain: options.domain })
        }
      })

      // Retrieve full knowledge entries
      const knowledgeIds = results.map(r => r.id)
      const knowledge = await this.getKnowledgeByIds(knowledgeIds, options.minConfidence)

      logger.memoryOperation('Query', personaId, 'semantic knowledge', knowledge.length)
      return knowledge
    } catch (error) {
      logger.error(`Failed to query knowledge for persona ${personaId}:`, error)
      throw error
    }
  }

  async buildKnowledgeGraph(personaId: string): Promise<KnowledgeNode[]> {
    try {
      // Get all knowledge for persona
      const stmt = this.db.prepare(`
        SELECT * FROM semantic_knowledge 
        WHERE persona_id = ? 
        ORDER BY confidence_level DESC
      `)

      const knowledge = stmt.all(personaId).map(this.mapRowToKnowledge)

      // Build graph with relationships
      const graph = await this.constructKnowledgeGraph(knowledge)
      
      logger.memoryOperation('Build Graph', personaId, 'knowledge graph', graph.length)
      return graph
    } catch (error) {
      logger.error(`Failed to build knowledge graph for persona ${personaId}:`, error)
      throw error
    }
  }

  async updateKnowledgeConfidence(
    knowledgeId: string, 
    newConfidence: number,
    reinforcingExperience?: string
  ): Promise<void> {
    try {
      const stmt = this.db.prepare(`
        UPDATE semantic_knowledge 
        SET confidence_level = ?, updated_at = ? 
        WHERE id = ?
      `)

      stmt.run(newConfidence, new Date().toISOString(), knowledgeId)

      // Log reinforcing experience if provided
      if (reinforcingExperience) {
        await this.logKnowledgeReinforcement(knowledgeId, reinforcingExperience)
      }

      logger.debug(`Updated knowledge confidence: ${knowledgeId} -> ${newConfidence}`)
    } catch (error) {
      logger.error(`Failed to update knowledge confidence for ${knowledgeId}:`, error)
      throw error
    }
  }

  async findRelatedKnowledge(
    personaId: string,
    conceptOrId: string,
    maxDepth: number = 2
  ): Promise<SemanticKnowledge[]> {
    try {
      const relatedIds = new Set<string>()
      const toProcess = [conceptOrId]
      let currentDepth = 0

      while (toProcess.length > 0 && currentDepth < maxDepth) {
        const currentBatch = [...toProcess]
        toProcess.length = 0

        for (const item of currentBatch) {
          const related = await this.findDirectlyRelated(personaId, item)
          related.forEach(id => {
            if (!relatedIds.has(id)) {
              relatedIds.add(id)
              toProcess.push(id)
            }
          })
        }

        currentDepth++
      }

      // Get full knowledge entries
      const knowledgeList = await this.getKnowledgeByIds(Array.from(relatedIds))
      
      logger.memoryOperation('Find Related', personaId, 'related knowledge', knowledgeList.length)
      return knowledgeList
    } catch (error) {
      logger.error(`Failed to find related knowledge for persona ${personaId}:`, error)
      throw error
    }
  }

  async consolidateKnowledge(personaId: string): Promise<void> {
    try {
      // Find similar concepts that could be merged
      const allKnowledge = await this.getAllKnowledge(personaId)
      const consolidationCandidates = await this.findConsolidationCandidates(allKnowledge)
      
      let consolidatedCount = 0

      for (const candidates of consolidationCandidates) {
        if (candidates.length > 1) {
          await this.mergeKnowledgeEntries(candidates)
          consolidatedCount++
        }
      }

      logger.memoryOperation('Consolidate', personaId, 'semantic knowledge', consolidatedCount)
    } catch (error) {
      logger.error(`Failed to consolidate knowledge for persona ${personaId}:`, error)
      throw error
    }
  }

  async getKnowledgeStatistics(personaId: string): Promise<any> {
    try {
      const stmt = this.db.prepare(`
        SELECT 
          COUNT(*) as total,
          AVG(confidence_level) as avg_confidence,
          domain,
          COUNT(*) as domain_count
        FROM semantic_knowledge 
        WHERE persona_id = ?
        GROUP BY domain
        ORDER BY domain_count DESC
      `)

      const domainStats = stmt.all(personaId)
      
      const overallStmt = this.db.prepare(`
        SELECT 
          COUNT(*) as total,
          AVG(confidence_level) as avg_confidence,
          COUNT(DISTINCT domain) as total_domains,
          COUNT(DISTINCT concept) as total_concepts
        FROM semantic_knowledge 
        WHERE persona_id = ?
      `)

      const overall = overallStmt.get(personaId)

      return {
        overall,
        byDomain: domainStats,
        knowledgeDistribution: await this.getKnowledgeDistribution(personaId)
      }
    } catch (error) {
      logger.error(`Failed to get knowledge statistics for persona ${personaId}:`, error)
      throw error
    }
  }

  private combineKnowledgeContent(knowledge: SemanticKnowledge): string {
    return [
      knowledge.domain,
      knowledge.concept,
      JSON.stringify(knowledge.content),
      knowledge.source || ''
    ].join(' ')
  }

  private generateKnowledgeId(): string {
    return `know_${Date.now()}_${Math.random().toString(36).substring(7)}`
  }

  private mapRowToKnowledge(row: any): SemanticKnowledge {
    return {
      id: row.id,
      domain: row.domain,
      concept: row.concept,
      content: JSON.parse(row.content),
      confidenceLevel: row.confidence_level,
      source: row.source,
      relationships: JSON.parse(row.relationships || '[]')
    }
  }

  private async getKnowledgeByIds(
    knowledgeIds: string[], 
    minConfidence?: number
  ): Promise<SemanticKnowledge[]> {
    if (knowledgeIds.length === 0) return []

    try {
      let query = `
        SELECT * FROM semantic_knowledge 
        WHERE id IN (${knowledgeIds.map(() => '?').join(',')})
      `
      const params: any[] = [...knowledgeIds]

      if (minConfidence !== undefined) {
        query += ` AND confidence_level >= ?`
        params.push(minConfidence)
      }

      query += ` ORDER BY confidence_level DESC`

      const stmt = this.db.prepare(query)
      const rows = stmt.all(...params)
      
      return rows.map(this.mapRowToKnowledge)
    } catch (error) {
      logger.error('Failed to get knowledge by IDs:', error)
      throw error
    }
  }

  private async constructKnowledgeGraph(knowledge: SemanticKnowledge[]): Promise<KnowledgeNode[]> {
    const nodes: KnowledgeNode[] = []
    const conceptMap = new Map<string, string[]>() // concept -> related concepts

    // Build concept relationship map
    for (const item of knowledge) {
      if (!conceptMap.has(item.concept)) {
        conceptMap.set(item.concept, [])
      }
      
      if (item.relationships) {
        conceptMap.get(item.concept)!.push(...item.relationships)
      }
    }

    // Create nodes with connections
    for (const item of knowledge) {
      const connections = conceptMap.get(item.concept) || []
      
      // Calculate connection strength based on confidence and frequency
      const connectionStrength = this.calculateConnectionStrength(item, connections.length)

      nodes.push({
        id: item.id!,
        concept: item.concept,
        domain: item.domain,
        content: item.content,
        connections: connections,
        strength: connectionStrength
      })
    }

    return nodes
  }

  private calculateConnectionStrength(knowledge: SemanticKnowledge, connectionCount: number): number {
    // Base strength on confidence level
    let strength = knowledge.confidenceLevel

    // Boost strength based on number of connections
    const connectionBoost = Math.min(connectionCount * 0.1, 0.3)
    strength += connectionBoost

    // Adjust for knowledge age (newer knowledge might be more relevant)
    // This would require tracking creation/update dates more sophisticatedly

    return Math.min(1, strength)
  }

  private async findDirectlyRelated(personaId: string, conceptOrId: string): Promise<string[]> {
    // Search both by concept name and by relationships
    const stmt = this.db.prepare(`
      SELECT id, relationships FROM semantic_knowledge 
      WHERE persona_id = ? 
      AND (concept = ? OR id = ? OR relationships LIKE ?)
    `)

    const rows = stmt.all(
      personaId, 
      conceptOrId, 
      conceptOrId, 
      `%"${conceptOrId}"%`
    )

    const relatedIds: string[] = []
    
    rows.forEach(row => {
      relatedIds.push(row.id)
      
      // Parse relationships to find more connections
      try {
        const relationships = JSON.parse(row.relationships || '[]')
        relatedIds.push(...relationships)
      } catch (e) {
        // Ignore parsing errors
      }
    })

    return [...new Set(relatedIds)] // Remove duplicates
  }

  private async getAllKnowledge(personaId: string): Promise<SemanticKnowledge[]> {
    const stmt = this.db.prepare(`
      SELECT * FROM semantic_knowledge 
      WHERE persona_id = ?
    `)

    const rows = stmt.all(personaId)
    return rows.map(this.mapRowToKnowledge)
  }

  private async findConsolidationCandidates(
    knowledge: SemanticKnowledge[]
  ): Promise<SemanticKnowledge[][]> {
    const candidates: SemanticKnowledge[][] = []
    const processed = new Set<string>()

    for (const item of knowledge) {
      if (processed.has(item.id!)) continue

      const similar: SemanticKnowledge[] = [item]
      processed.add(item.id!)

      // Find similar concepts in the same domain
      for (const other of knowledge) {
        if (processed.has(other.id!) || other.domain !== item.domain) continue

        const similarity = this.calculateConceptSimilarity(item, other)
        if (similarity > 0.8) { // High similarity threshold
          similar.push(other)
          processed.add(other.id!)
        }
      }

      if (similar.length > 1) {
        candidates.push(similar)
      }
    }

    return candidates
  }

  private calculateConceptSimilarity(k1: SemanticKnowledge, k2: SemanticKnowledge): number {
    // Simple similarity based on concept name and content overlap
    const conceptSimilarity = k1.concept.toLowerCase() === k2.concept.toLowerCase() ? 1 : 0
    
    // Check for content overlap (basic implementation)
    const content1 = JSON.stringify(k1.content).toLowerCase()
    const content2 = JSON.stringify(k2.content).toLowerCase()
    
    const commonWords = this.findCommonWords(content1, content2)
    const contentSimilarity = commonWords.length / Math.max(
      content1.split(' ').length,
      content2.split(' ').length
    )

    return (conceptSimilarity * 0.7) + (contentSimilarity * 0.3)
  }

  private findCommonWords(text1: string, text2: string): string[] {
    const words1 = new Set(text1.split(/\W+/).filter(w => w.length > 3))
    const words2 = new Set(text2.split(/\W+/).filter(w => w.length > 3))
    
    return Array.from(words1).filter(word => words2.has(word))
  }

  private async mergeKnowledgeEntries(entries: SemanticKnowledge[]): Promise<void> {
    if (entries.length < 2) return

    // Merge into the entry with highest confidence
    const primary = entries.reduce((prev, current) => 
      current.confidenceLevel > prev.confidenceLevel ? current : prev
    )

    const others = entries.filter(e => e.id !== primary.id)

    // Merge content and relationships
    const mergedContent = {
      primary: primary.content,
      additional: others.map(e => e.content)
    }

    const allRelationships = new Set([
      ...(primary.relationships || []),
      ...others.flatMap(e => e.relationships || [])
    ])

    // Update primary entry
    const stmt = this.db.prepare(`
      UPDATE semantic_knowledge 
      SET 
        content = ?, 
        relationships = ?,
        confidence_level = ?,
        updated_at = ?
      WHERE id = ?
    `)

    // Boost confidence from consolidation
    const newConfidence = Math.min(1, primary.confidenceLevel + (others.length * 0.05))

    stmt.run(
      JSON.stringify(mergedContent),
      JSON.stringify(Array.from(allRelationships)),
      newConfidence,
      new Date().toISOString(),
      primary.id
    )

    // Delete the other entries
    const deleteStmt = this.db.prepare(`DELETE FROM semantic_knowledge WHERE id = ?`)
    for (const other of others) {
      deleteStmt.run(other.id)
      await this.vectorDb.delete(other.id!)
    }

    logger.debug(`Merged ${others.length} knowledge entries into ${primary.id}`)
  }

  private async logKnowledgeReinforcement(
    knowledgeId: string, 
    experience: string
  ): Promise<void> {
    // This could be extended to track how knowledge is reinforced
    logger.debug(`Knowledge ${knowledgeId} reinforced by: ${experience}`)
  }

  private async getKnowledgeDistribution(personaId: string): Promise<any> {
    const stmt = this.db.prepare(`
      SELECT 
        CASE 
          WHEN confidence_level >= 0.8 THEN 'high'
          WHEN confidence_level >= 0.5 THEN 'medium'
          ELSE 'low'
        END as confidence_tier,
        COUNT(*) as count
      FROM semantic_knowledge 
      WHERE persona_id = ?
      GROUP BY confidence_tier
    `)

    const distribution = stmt.all(personaId)
    
    const result: any = { high: 0, medium: 0, low: 0 }
    distribution.forEach(row => {
      result[row.confidence_tier] = row.count
    })

    return result
  }
}
