import { Request, Response } from 'express'
import { PersonaWrapper } from '../../core/persona/PersonaWrapper.js'
import { PersonaCore } from '../../core/persona/PersonaCore.js'
import { ConsciousnessEngine } from '../../core/persona/ConsciousnessEngine.js'
import { logger } from '../../utils/logger.js'

export class PersonaController {
  private personaWrapper: PersonaWrapper
  private personaCore: PersonaCore
  private consciousness: ConsciousnessEngine

  constructor() {
    this.personaWrapper = new PersonaWrapper()
    this.personaCore = new PersonaCore()
    this.consciousness = new ConsciousnessEngine()
  }

  async getActivePersona(req: Request, res: Response): Promise<void> {
    try {
      // Initialize the persona wrapper first
      await this.personaWrapper.initialize()
      
      // Get the persona state
      const personaState = await this.personaWrapper.getPersonaState()
      
      res.json({
        success: true,
        data: personaState,
        meta: {
          timestamp: new Date().toISOString(),
          serverInstance: 'single_persona'
        }
      })
    } catch (error) {
      logger.error('Failed to get active persona:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve persona state'
      })
    }
  }

  async getPersonaProfile(req: Request, res: Response): Promise<void> {
    try {
      const { personaId } = req.params

      if (!personaId) {
        res.status(400).json({
          success: false,
          error: 'personaId is required'
        })
        return
      }

      const profile = await this.personaCore.getPersonaProfile()

      res.json({
        success: true,
        data: profile,
        meta: {
          personaId,
          timestamp: new Date().toISOString()
        }
      })
    } catch (error) {
      logger.error('Failed to get persona profile:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve persona profile'
      })
    }
  }

  async updatePersonalityTrait(req: Request, res: Response): Promise<void> {
    try {
      const { personaId } = req.params
      const { traitName, newValue, reason } = req.body

      if (!personaId || !traitName || newValue === undefined) {
        res.status(400).json({
          success: false,
          error: 'personaId, traitName, and newValue are required'
        })
        return
      }

      if (newValue < 0 || newValue > 1) {
        res.status(400).json({
          success: false,
          error: 'newValue must be between 0 and 1'
        })
        return
      }

      await this.personaCore.updatePersonalityTrait(traitName, newValue, reason)

      res.json({
        success: true,
        data: {
          personaId,
          traitName,
          newValue,
          reason,
          timestamp: new Date().toISOString()
        }
      })
    } catch (error) {
      logger.error('Failed to update personality trait:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to update personality trait'
      })
    }
  }

  async evolvePersonalityFromExperience(req: Request, res: Response): Promise<void> {
    try {
      const { personaId } = req.params
      const { experienceData } = req.body

      if (!personaId || !experienceData) {
        res.status(400).json({
          success: false,
          error: 'personaId and experienceData are required'
        })
        return
      }

      if (!experienceData.eventType || !experienceData.outcome || experienceData.emotionalImpact === undefined) {
        res.status(400).json({
          success: false,
          error: 'experienceData must include eventType, outcome, and emotionalImpact'
        })
        return
      }

      await this.personaCore.evolvePersonalityFromExperience({
        eventType: experienceData.eventType,
        outcome: experienceData.outcome,
        emotionalImpact: experienceData.emotionalImpact,
        contextTags: experienceData.contextTags || []
      })

      res.json({
        success: true,
        data: {
          personaId,
          evolutionApplied: true,
          experienceType: experienceData.eventType,
          timestamp: new Date().toISOString()
        }
      })
    } catch (error) {
      logger.error('Failed to evolve personality:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to evolve personality from experience'
      })
    }
  }

  async updateConsciousnessState(req: Request, res: Response): Promise<void> {
    try {
      const { personaId } = req.params
      const updates = req.body

      if (!personaId) {
        res.status(400).json({
          success: false,
          error: 'personaId is required'
        })
        return
      }

      await this.consciousness.updateConsciousnessLevel(personaId, updates)

      res.json({
        success: true,
        data: {
          personaId,
          updates,
          timestamp: new Date().toISOString()
        }
      })
    } catch (error) {
      logger.error('Failed to update consciousness state:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to update consciousness state'
      })
    }
  }

  async getConsciousnessState(req: Request, res: Response): Promise<void> {
    try {
      const { personaId } = req.params

      if (!personaId) {
        res.status(400).json({
          success: false,
          error: 'personaId is required'
        })
        return
      }

      const state = await this.consciousness.getCurrentState(personaId)

      res.json({
        success: true,
        data: state,
        meta: {
          personaId,
          timestamp: new Date().toISOString()
        }
      })
    } catch (error) {
      logger.error('Failed to get consciousness state:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve consciousness state'
      })
    }
  }

  async getConsciousnessMetrics(req: Request, res: Response): Promise<void> {
    try {
      const { personaId } = req.params

      if (!personaId) {
        res.status(400).json({
          success: false,
          error: 'personaId is required'
        })
        return
      }

      const metrics = await this.consciousness.getConsciousnessMetrics(personaId)

      res.json({
        success: true,
        data: metrics,
        meta: {
          personaId,
          timestamp: new Date().toISOString()
        }
      })
    } catch (error) {
      logger.error('Failed to get consciousness metrics:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve consciousness metrics'
      })
    }
  }

  async processExperience(req: Request, res: Response): Promise<void> {
    try {
      const { personaId } = req.params
      const { experienceData } = req.body

      if (!personaId || !experienceData) {
        res.status(400).json({
          success: false,
          error: 'personaId and experienceData are required'
        })
        return
      }

      const experienceId = await this.personaWrapper.storeExperience({
        type: experienceData.type || 'interaction',
        content: experienceData.content,
        context: experienceData.context,
        importance: experienceData.importance,
        emotionalValence: experienceData.emotionalValence,
        tags: experienceData.tags,
        knowledge: experienceData.knowledge
      })

      res.json({
        success: true,
        data: {
          experienceId,
          personaId,
          timestamp: new Date().toISOString()
        }
      })
    } catch (error) {
      logger.error('Failed to process experience:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to process experience'
      })
    }
  }

  async generateReflection(req: Request, res: Response): Promise<void> {
    try {
      const { personaId } = req.params
      const { context, depth } = req.body

      if (!personaId || !context) {
        res.status(400).json({
          success: false,
          error: 'personaId and context are required'
        })
        return
      }

      const reflection = await this.personaWrapper.generateReflection(
        context, 
        depth === 'deep' ? 'deep' : 'shallow'
      )

      res.json({
        success: true,
        data: {
          reflection,
          context,
          depth: depth || 'shallow',
          personaId,
          timestamp: new Date().toISOString()
        }
      })
    } catch (error) {
      logger.error('Failed to generate reflection:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to generate reflection'
      })
    }
  }

  async getPersonaInsights(req: Request, res: Response): Promise<void> {
    try {
      const { personaId } = req.params

      if (!personaId) {
        res.status(400).json({
          success: false,
          error: 'personaId is required'
        })
        return
      }

      const insights = await this.personaWrapper.getPersonaInsights()

      res.json({
        success: true,
        data: insights,
        meta: {
          personaId,
          timestamp: new Date().toISOString()
        }
      })
    } catch (error) {
      logger.error('Failed to get persona insights:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve persona insights'
      })
    }
  }

  async prepareSleep(req: Request, res: Response): Promise<void> {
    try {
      const { personaId } = req.params

      if (!personaId) {
        res.status(400).json({
          success: false,
          error: 'personaId is required'
        })
        return
      }

      await this.personaWrapper.prepareSleep()

      res.json({
        success: true,
        data: {
          personaId,
          sleepPrepared: true,
          timestamp: new Date().toISOString()
        }
      })
    } catch (error) {
      logger.error('Failed to prepare sleep:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to prepare for sleep'
      })
    }
  }

  async getPersonaStats(req: Request, res: Response): Promise<void> {
    try {
      const { personaId } = req.params

      if (!personaId) {
        res.status(400).json({
          success: false,
          error: 'personaId is required'
        })
        return
      }

      const stats = await this.personaCore.getPersonaStats()

      res.json({
        success: true,
        data: stats,
        meta: {
          personaId,
          timestamp: new Date().toISOString()
        }
      })
    } catch (error) {
      logger.error('Failed to get persona stats:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve persona statistics'
      })
    }
  }
}
