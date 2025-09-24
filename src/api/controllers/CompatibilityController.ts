import { Request, Response } from 'express'
import { PersonaWrapper } from '../../core/persona/PersonaWrapper.js'
import { EpisodicMemory } from '../../core/memory/EpisodicMemory.js'
import { logger } from '../../utils/logger.js'

export class CompatibilityController {
  private personaWrapper: PersonaWrapper
  private episodicMemory: EpisodicMemory

  constructor() {
    this.personaWrapper = new PersonaWrapper()
    this.episodicMemory = new EpisodicMemory()
  }

  async initializeSession(req: Request, res: Response): Promise<void> {
    try {
      const { sessionId } = req.body
      
      await this.personaWrapper.initialize()
      const personaState = await this.personaWrapper.getPersonaState()

      // Map to frontend expected format
      res.json({
        persona: {
          id: personaState.persona.id,
          name: personaState.persona.name,
          personality: personaState.persona.description,
          coreMemories: personaState.memoryContext.recentEpisodes.slice(0, 5).map(ep => 
            typeof ep.content === 'string' ? ep.content : JSON.stringify(ep.content)
          ),
          preferences: {},
          lastActive: personaState.persona.lastActive
        },
        memoryContext: {
          shortTerm: personaState.memoryContext.recentEpisodes.slice(0, 5).map(this.mapToMemoryEntry),
          longTerm: [], // Loaded on demand
          dreamState: [], // Populated during sleep cycles
          reflections: [] // Generated on request
        }
      })
    } catch (error) {
      logger.error('Session initialization failed:', error)
      res.status(500).json({ 
        success: false,
        error: 'Failed to initialize session' 
      })
    }
  }

  async getActivePersona(req: Request, res: Response): Promise<void> {
    try {
      const personaState = await this.personaWrapper.getPersonaState()
      
      res.json({
        persona: {
          id: personaState.persona.id,
          name: personaState.persona.name,
          personality: personaState.persona.description,
          coreMemories: personaState.memoryContext.recentEpisodes.slice(0, 5).map(ep => 
            typeof ep.content === 'string' ? ep.content : JSON.stringify(ep.content)
          ),
          preferences: {},
          lastActive: personaState.persona.lastActive
        },
        memoryContext: {
          shortTerm: personaState.memoryContext.recentEpisodes.slice(0, 5).map(this.mapToMemoryEntry),
          longTerm: [],
          dreamState: [],
          reflections: []
        }
      })
    } catch (error) {
      logger.error('Failed to get active persona:', error)
      res.status(500).json({ 
        success: false,
        error: 'Failed to retrieve active persona' 
      })
    }
  }

  async updateMemory(req: Request, res: Response): Promise<void> {
    try {
      const { newMemory, context, sessionId } = req.body
      
      if (!newMemory || !newMemory.content) {
        res.status(400).json({
          success: false,
          error: 'newMemory with content is required'
        })
        return
      }

      const experienceData = {
        type: 'user_interaction',
        content: newMemory.content,
        context: { originalContext: context, sessionId },
        importance: newMemory.importance || 0.5,
        emotionalValence: 0,
        tags: newMemory.tags || []
      }

      const episodeId = await this.personaWrapper.storeExperience(experienceData)
      
      res.json({
        success: true,
        memoryId: episodeId,
        timestamp: new Date().toISOString()
      })
    } catch (error) {
      logger.error('Memory update failed:', error)
      res.status(500).json({ 
        success: false,
        error: 'Failed to update memory' 
      })
    }
  }

  async searchMemory(req: Request, res: Response): Promise<void> {
    try {
      const { query, limit, sessionId } = req.body
      
      if (!query) {
        res.status(400).json({
          success: false,
          error: 'query is required'
        })
        return
      }

      const memories = await this.personaWrapper.recallMemories(query, { limit: limit || 10 })
      
      // Convert to frontend expected format
      const memoryEntries = [
        ...memories.episodes.map(this.mapEpisodeToMemoryEntry),
        ...memories.knowledge.map(this.mapKnowledgeToMemoryEntry)
      ]

      res.json(memoryEntries.slice(0, limit || 10))
    } catch (error) {
      logger.error('Memory search failed:', error)
      res.status(500).json({ 
        success: false,
        error: 'Failed to search memory' 
      })
    }
  }

  async generateReflection(req: Request, res: Response): Promise<void> {
    try {
      const { context, sessionId } = req.body
      
      if (!context) {
        res.status(400).json({
          success: false,
          error: 'context is required'
        })
        return
      }

      // Use memory contemplation as basis for reflection
      const contemplation = await this.personaWrapper.contemplateMemories(context)
      
      // Generate reflection based on memories and consciousness state
      const reflection = this.synthesizeReflection(contemplation, context)
      
      res.json({ reflection })
    } catch (error) {
      logger.error('Reflection generation failed:', error)
      res.status(500).json({ 
        success: false,
        error: 'Failed to generate reflection' 
      })
    }
  }

  async processInteraction(req: Request, res: Response): Promise<void> {
    try {
      const { userInput, sessionContext } = req.body
      
      if (!userInput) {
        res.status(400).json({
          success: false,
          error: 'userInput is required'
        })
        return
      }

      const responseContext = await this.personaWrapper.processInteraction(
        userInput, 
        sessionContext || {}
      )

      res.json({
        success: true,
        data: responseContext,
        meta: {
          timestamp: new Date().toISOString()
        }
      })
    } catch (error) {
      logger.error('Interaction processing failed:', error)
      res.status(500).json({ 
        success: false,
        error: 'Failed to process interaction' 
      })
    }
  }

  private mapToMemoryEntry(episode: any): any {
    return {
      id: episode.id,
      content: typeof episode.content === 'string' ? episode.content : JSON.stringify(episode.content),
      timestamp: episode.timestamp,
      importance: episode.importanceScore || 0.5,
      tags: episode.context?.tags || []
    }
  }

  private mapEpisodeToMemoryEntry(episode: any): any {
    return {
      id: episode.id,
      content: typeof episode.content === 'string' ? episode.content : JSON.stringify(episode.content),
      timestamp: episode.timestamp,
      importance: episode.importanceScore || 0.5,
      tags: ['episode']
    }
  }

  private mapKnowledgeToMemoryEntry(knowledge: any): any {
    return {
      id: knowledge.id,
      content: `${knowledge.concept}: ${JSON.stringify(knowledge.content)}`,
      timestamp: knowledge.createdAt || new Date(),
      importance: knowledge.confidenceLevel,
      tags: ['knowledge', knowledge.domain]
    }
  }

  private synthesizeReflection(contemplation: any, context: string): string {
    const memoryCount = Object.values(contemplation.memories).flat().length
    const consciousnessLevel = contemplation.consciousnessState?.selfAwareness || 0.5
    
    if (memoryCount === 0) {
      return `Reflecting on "${context}" - this appears to be a new experience for me. I don't have strong memories related to this topic yet.`
    }

    const insightCount = contemplation.contemplationContext?.insights?.length || 0
    let reflection = `Reflecting on "${context}" - I can draw from ${memoryCount} related memories and experiences. `
    
    if (insightCount > 0) {
      reflection += `Based on my contemplation, I've identified ${insightCount} key insights. `
    }
    
    reflection += `My current state of awareness (${Math.round(consciousnessLevel * 100)}%) allows me to see patterns and connections that inform my understanding.`

    return reflection
  }
}
