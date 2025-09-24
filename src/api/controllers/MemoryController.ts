import { Request, Response } from 'express'
import { EpisodicMemory } from '../../core/memory/EpisodicMemory.js'
import { SemanticMemory } from '../../core/memory/SemanticMemory.js'
import { ProceduralMemory } from '../../core/memory/ProceduralMemory.js'
import { MemoryConsolidation } from '../../core/memory/MemoryConsolidation.js'
import { logger } from '../../utils/logger.js'

export class MemoryController {
  private episodicMemory: EpisodicMemory
  private semanticMemory: SemanticMemory
  private proceduralMemory: ProceduralMemory
  private memoryConsolidation: MemoryConsolidation

  constructor() {
    this.episodicMemory = new EpisodicMemory()
    this.semanticMemory = new SemanticMemory()
    this.proceduralMemory = new ProceduralMemory()
    this.memoryConsolidation = new MemoryConsolidation()
  }

  async storeEpisode(req: Request, res: Response): Promise<void> {
    try {
      const { personaId, episode } = req.body

      if (!personaId || !episode) {
        res.status(400).json({
          success: false,
          error: 'personaId and episode data are required'
        })
        return
      }

      // Convert timestamp if provided as string
      if (episode.timestamp && typeof episode.timestamp === 'string') {
        episode.timestamp = new Date(episode.timestamp)
      } else if (!episode.timestamp) {
        episode.timestamp = new Date()
      }

      const episodeId = await this.episodicMemory.storeEpisode(personaId, {
        eventType: episode.eventType || 'interaction',
        content: episode.content,
        context: episode.context || {},
        emotionalValence: episode.emotionalValence || 0,
        importanceScore: episode.importanceScore || 0.5,
        participants: episode.participants || [],
        location: episode.location,
        timestamp: episode.timestamp
      })

      res.json({
        success: true,
        data: {
          episodeId,
          personaId,
          timestamp: new Date().toISOString()
        }
      })
    } catch (error) {
      logger.error('Failed to store episode:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to store episode'
      })
    }
  }

  async searchEpisodes(req: Request, res: Response): Promise<void> {
    try {
      const { personaId, query, limit, timeRange, eventTypes, minImportance } = req.body

      if (!personaId || !query) {
        res.status(400).json({
          success: false,
          error: 'personaId and query are required'
        })
        return
      }

      const options: any = {
        limit: limit || 10
      }

      if (timeRange) {
        options.timeRange = {
          start: new Date(timeRange.start),
          end: new Date(timeRange.end)
        }
      }

      if (eventTypes) {
        options.eventTypes = eventTypes
      }

      if (minImportance !== undefined) {
        options.minImportance = minImportance
      }

      const results = await this.episodicMemory.searchEpisodes(personaId, query, options)

      res.json({
        success: true,
        data: results,
        meta: {
          query,
          resultCount: results.length,
          personaId
        }
      })
    } catch (error) {
      logger.error('Failed to search episodes:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to search episodes'
      })
    }
  }

  async getRecentEpisodes(req: Request, res: Response): Promise<void> {
    try {
      const { personaId } = req.params
      const limit = parseInt(req.query.limit as string) || 20

      if (!personaId) {
        res.status(400).json({
          success: false,
          error: 'personaId is required'
        })
        return
      }

      const episodes = await this.episodicMemory.getRecentEpisodes(personaId, limit)

      res.json({
        success: true,
        data: episodes,
        meta: {
          personaId,
          count: episodes.length,
          limit
        }
      })
    } catch (error) {
      logger.error('Failed to get recent episodes:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve recent episodes'
      })
    }
  }

  async storeKnowledge(req: Request, res: Response): Promise<void> {
    try {
      const { personaId, knowledge } = req.body

      if (!personaId || !knowledge) {
        res.status(400).json({
          success: false,
          error: 'personaId and knowledge data are required'
        })
        return
      }

      const knowledgeId = await this.semanticMemory.storeKnowledge(personaId, {
        domain: knowledge.domain,
        concept: knowledge.concept,
        content: knowledge.content,
        confidenceLevel: knowledge.confidenceLevel || 0.5,
        source: knowledge.source || 'api',
        relationships: knowledge.relationships || []
      })

      res.json({
        success: true,
        data: {
          knowledgeId,
          personaId,
          timestamp: new Date().toISOString()
        }
      })
    } catch (error) {
      logger.error('Failed to store knowledge:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to store knowledge'
      })
    }
  }

  async queryKnowledge(req: Request, res: Response): Promise<void> {
    try {
      const { personaId, query, domain, limit, minConfidence } = req.body

      if (!personaId || !query) {
        res.status(400).json({
          success: false,
          error: 'personaId and query are required'
        })
        return
      }

      const options: any = {
        limit: limit || 10
      }

      if (domain) options.domain = domain
      if (minConfidence !== undefined) options.minConfidence = minConfidence

      const results = await this.semanticMemory.queryKnowledge(personaId, query, options)

      res.json({
        success: true,
        data: results,
        meta: {
          query,
          domain,
          resultCount: results.length,
          personaId
        }
      })
    } catch (error) {
      logger.error('Failed to query knowledge:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to query knowledge'
      })
    }
  }

  async getKnowledgeGraph(req: Request, res: Response): Promise<void> {
    try {
      const { personaId } = req.params

      if (!personaId) {
        res.status(400).json({
          success: false,
          error: 'personaId is required'
        })
        return
      }

      const graph = await this.semanticMemory.buildKnowledgeGraph(personaId)

      res.json({
        success: true,
        data: graph,
        meta: {
          personaId,
          nodeCount: graph.length
        }
      })
    } catch (error) {
      logger.error('Failed to get knowledge graph:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve knowledge graph'
      })
    }
  }

  async storeSkill(req: Request, res: Response): Promise<void> {
    try {
      const { personaId, skill } = req.body

      if (!personaId || !skill) {
        res.status(400).json({
          success: false,
          error: 'personaId and skill data are required'
        })
        return
      }

      // Convert lastUsed if provided as string
      if (skill.lastUsed && typeof skill.lastUsed === 'string') {
        skill.lastUsed = new Date(skill.lastUsed)
      } else if (!skill.lastUsed) {
        skill.lastUsed = new Date()
      }

      const skillId = await this.proceduralMemory.storeSkillPattern(personaId, {
        name: skill.name,
        domain: skill.domain,
        pattern: skill.pattern,
        successRate: skill.successRate || 0.5,
        contextConditions: skill.contextConditions || [],
        lastUsed: skill.lastUsed
      })

      res.json({
        success: true,
        data: {
          skillId,
          personaId,
          timestamp: new Date().toISOString()
        }
      })
    } catch (error) {
      logger.error('Failed to store skill:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to store skill'
      })
    }
  }

  async getApplicableSkills(req: Request, res: Response): Promise<void> {
    try {
      const { personaId, context } = req.params
      const domain = req.query.domain as string

      if (!personaId || !context) {
        res.status(400).json({
          success: false,
          error: 'personaId and context are required'
        })
        return
      }

      const contextArray = context.split(',').map(c => c.trim())
      const skills = await this.proceduralMemory.getApplicableSkills(personaId, contextArray, domain)

      res.json({
        success: true,
        data: skills,
        meta: {
          personaId,
          context: contextArray,
          domain,
          skillCount: skills.length
        }
      })
    } catch (error) {
      logger.error('Failed to get applicable skills:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve applicable skills'
      })
    }
  }

  async consolidateMemories(req: Request, res: Response): Promise<void> {
    try {
      const { personaId } = req.params
      const { consolidationType } = req.body

      if (!personaId) {
        res.status(400).json({
          success: false,
          error: 'personaId is required'
        })
        return
      }

      let result
      const type = consolidationType || 'recent'

      switch (type) {
        case 'recent':
          result = await this.memoryConsolidation.consolidateRecent(personaId, 20)
          break
        case 'patterns':
          result = await this.memoryConsolidation.consolidateWithPatterns(personaId)
          break
        case 'creative':
          result = await this.memoryConsolidation.integrateCreativeInsights(personaId)
          break
        case 'full':
          result = await this.memoryConsolidation.fullMemoryReorganization(personaId)
          break
        default:
          result = await this.memoryConsolidation.consolidateRecent(personaId, 20)
      }

      res.json({
        success: true,
        data: result,
        meta: {
          personaId,
          consolidationType: type,
          timestamp: new Date().toISOString()
        }
      })
    } catch (error) {
      logger.error('Failed to consolidate memories:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to consolidate memories'
      })
    }
  }

  async getMemoryStatistics(req: Request, res: Response): Promise<void> {
    try {
      const { personaId } = req.params

      if (!personaId) {
        res.status(400).json({
          success: false,
          error: 'personaId is required'
        })
        return
      }

      const [episodicStats, semanticStats, proceduralStats] = await Promise.all([
        this.episodicMemory.getMemoryStatistics(personaId),
        this.semanticMemory.getKnowledgeStatistics(personaId),
        this.proceduralMemory.getSkillStatistics(personaId)
      ])

      res.json({
        success: true,
        data: {
          episodic: episodicStats,
          semantic: semanticStats,
          procedural: proceduralStats,
          summary: {
            totalEpisodes: episodicStats.overall?.total || 0,
            totalKnowledge: semanticStats.overall?.total || 0,
            totalSkills: proceduralStats.overall?.total || 0
          }
        },
        meta: {
          personaId,
          timestamp: new Date().toISOString()
        }
      })
    } catch (error) {
      logger.error('Failed to get memory statistics:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve memory statistics'
      })
    }
  }
}
