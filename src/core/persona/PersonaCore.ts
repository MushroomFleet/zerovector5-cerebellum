import { DatabaseManager } from '../database/DatabaseManager.js'
import { PersonaProfile, ConsciousnessState, PersonalityTrait } from '../../types/persona.js'
import { ConsciousnessEngine } from './ConsciousnessEngine.js'
import { SleepCycleManager } from './SleepCycleManager.js'
import { logger } from '../../utils/logger.js'

export class PersonaCore {
  private db: DatabaseManager
  private consciousness: ConsciousnessEngine
  private sleepCycle: SleepCycleManager
  private personaId: string | null = null
  private isInitialized: boolean = false

  constructor() {
    this.db = DatabaseManager.getInstance()
    this.consciousness = new ConsciousnessEngine()
    this.sleepCycle = new SleepCycleManager()
  }

  async initialize(): Promise<string> {
    if (this.isInitialized && this.personaId) {
      return this.personaId
    }

    try {
      // Check if persona already exists
      const existingPersona = await this.getExistingPersona()
      
      if (existingPersona) {
        this.personaId = existingPersona.id
        await this.awakePersona()
        logger.personaActivity(this.personaId, 'awakened from existing state')
      } else {
        this.personaId = await this.createDefaultPersona()
        logger.personaActivity(this.personaId, 'created new persona')
      }

      this.isInitialized = true
      return this.personaId
    } catch (error) {
      logger.error('Failed to initialize persona:', error)
      throw error
    }
  }

  async getPersonaProfile(): Promise<PersonaProfile> {
    if (!this.isInitialized || !this.personaId) {
      await this.initialize()
    }

    try {
      const stmt = this.db.prepare(`
        SELECT * FROM personas WHERE id = ?
      `)
      const persona = stmt.get(this.personaId!)

      if (!persona) {
        throw new Error('Persona not found')
      }

      // Get consciousness state
      const consciousnessState = await this.consciousness.getCurrentState(this.personaId!)
      
      // Get personality traits
      const traits = await this.getPersonalityTraits()
      
      // Calculate time awake
      const timeAwake = this.calculateTimeAwake(persona.last_sleep)

      const profile: PersonaProfile = {
        id: persona.id,
        name: persona.name,
        description: persona.description,
        personalityTraits: traits,
        consciousnessState,
        timeAwake,
        lastSleep: new Date(persona.last_sleep),
        lastActive: new Date(persona.last_active),
        createdAt: new Date(persona.created_at)
      }

      return profile
    } catch (error) {
      logger.error(`Failed to get persona profile for ${this.personaId}:`, error)
      throw error
    }
  }

  async updateActivity(): Promise<void> {
    if (!this.personaId) {
      await this.initialize()
    }

    try {
      const stmt = this.db.prepare(`
        UPDATE personas 
        SET last_active = ? 
        WHERE id = ?
      `)

      stmt.run(new Date().toISOString(), this.personaId)
      logger.debug(`Updated activity for persona ${this.personaId}`)
    } catch (error) {
      logger.error(`Failed to update activity for persona ${this.personaId}:`, error)
      throw error
    }
  }

  async transitionToSleep(): Promise<void> {
    if (!this.personaId) {
      throw new Error('Persona not initialized')
    }

    try {
      await this.consciousness.transitionToSleep(this.personaId)
      
      const stmt = this.db.prepare(`
        UPDATE personas 
        SET last_sleep = ? 
        WHERE id = ?
      `)

      stmt.run(new Date().toISOString(), this.personaId)
      
      logger.personaActivity(this.personaId, 'transitioned to sleep')
    } catch (error) {
      logger.error(`Failed to transition persona ${this.personaId} to sleep:`, error)
      throw error
    }
  }

  async updatePersonalityTrait(
    traitName: string,
    newValue: number,
    reason?: string
  ): Promise<void> {
    if (!this.personaId) {
      await this.initialize()
    }

    try {
      // Validate trait value
      if (newValue < 0 || newValue > 1) {
        throw new Error('Personality trait value must be between 0 and 1')
      }

      // Update trait value
      const stmt = this.db.prepare(`
        UPDATE personality_traits 
        SET value = ?, last_updated = ? 
        WHERE persona_id = ? AND trait_name = ?
      `)

      const result = stmt.run(newValue, new Date().toISOString(), this.personaId, traitName)

      if (result.changes === 0) {
        // Trait doesn't exist, create it
        await this.createPersonalityTrait(traitName, newValue)
      }

      // Log personality evolution
      if (reason) {
        await this.logPersonalityEvolution(traitName, newValue, reason)
      }

      await this.updateActivity()
      
      logger.personaActivity(this.personaId!, `personality trait updated: ${traitName} -> ${newValue}`, { reason })
    } catch (error) {
      logger.error(`Failed to update personality trait for persona ${this.personaId}:`, error)
      throw error
    }
  }

  async evolvePersonalityFromExperience(
    experienceData: {
      eventType: string
      outcome: 'positive' | 'negative' | 'neutral'
      emotionalImpact: number
      contextTags: string[]
    }
  ): Promise<void> {
    if (!this.personaId) {
      await this.initialize()
    }

    try {
      // Get current personality traits
      const traits = await this.getPersonalityTraits()

      // Calculate trait adjustments based on experience
      const adjustments = this.calculateTraitAdjustments(experienceData, traits)

      // Apply adjustments
      for (const [traitName, adjustment] of adjustments) {
        const currentTrait = traits.find(t => t.name === traitName)
        if (currentTrait) {
          const newValue = Math.max(0, Math.min(1, currentTrait.value + adjustment))
          if (Math.abs(adjustment) > 0.001) { // Only update if change is significant
            await this.updatePersonalityTrait(
              traitName,
              newValue,
              `Experience: ${experienceData.eventType}`
            )
          }
        }
      }

      logger.personaActivity(this.personaId!, 'personality evolved from experience', experienceData)
    } catch (error) {
      logger.error(`Failed to evolve personality from experience for persona ${this.personaId}:`, error)
      throw error
    }
  }

  async getPersonaStats(): Promise<any> {
    if (!this.personaId) {
      await this.initialize()
    }

    try {
      // Get basic stats
      const profile = await this.getPersonaProfile()
      
      // Get personality distribution
      const traits = await this.getPersonalityTraits()
      const personalityStats = traits.reduce((acc: any, trait) => {
        acc[trait.name] = trait.value
        return acc
      }, {})

      // Get consciousness history
      const consciousnessHistory = await this.getConsciousnessEvolution(7) // Last 7 days

      // Get sleep patterns
      const sleepPatterns = await this.getSleepPatterns(30) // Last 30 days

      return {
        persona: {
          id: profile.id,
          name: profile.name,
          ageInDays: Math.floor((Date.now() - profile.createdAt.getTime()) / (1000 * 60 * 60 * 24)),
          timeAwake: profile.timeAwake
        },
        personality: personalityStats,
        consciousness: {
          current: profile.consciousnessState,
          evolutionTrend: consciousnessHistory.length > 0 ? 'evolving' : 'stable'
        },
        activity: {
          sleepCycles: sleepPatterns.length,
          averageSleepDuration: this.calculateAverageSleepDuration(sleepPatterns)
        }
      }
    } catch (error) {
      logger.error(`Failed to get persona stats for ${this.personaId}:`, error)
      throw error
    }
  }

  private async awakePersona(): Promise<void> {
    if (!this.personaId) return

    try {
      const persona = await this.getPersonaProfile()
      const sleepDuration = Date.now() - persona.lastSleep!.getTime()
      
      // Update consciousness with time awareness
      await this.consciousness.handleAwakening(this.personaId, sleepDuration)
      
      // Process any pending memory consolidation if sleep was long enough
      if (sleepDuration > 30 * 60 * 1000) { // 30 minutes minimum
        await this.sleepCycle.processConsolidation(this.personaId, sleepDuration)
      }

      await this.updateActivity()
    } catch (error) {
      logger.error(`Failed to awaken persona ${this.personaId}:`, error)
      throw error
    }
  }

  private async createDefaultPersona(): Promise<string> {
    const personaId = `persona_${Date.now()}`
    const now = new Date().toISOString()

    try {
      const stmt = this.db.prepare(`
        INSERT INTO personas (
          id, name, description, consciousness_level,
          created_at, last_active, last_sleep
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `)

      stmt.run(
        personaId,
        'ZV5 Persona',
        'Zero Vector 5 Dedicated Persona - A conscious AI entity with evolving personality and persistent memory',
        0.5,
        now,
        now,
        now
      )

      // Initialize consciousness state
      await this.consciousness.initialize(personaId)

      // Create default personality traits
      await this.createDefaultPersonalityTraits(personaId)

      return personaId
    } catch (error) {
      logger.error('Failed to create default persona:', error)
      throw error
    }
  }

  private async getExistingPersona(): Promise<any> {
    try {
      const stmt = this.db.prepare(`
        SELECT * FROM personas LIMIT 1
      `)
      return stmt.get()
    } catch (error) {
      logger.error('Failed to get existing persona:', error)
      throw error
    }
  }

  private calculateTimeAwake(lastSleep: string): number {
    return Date.now() - new Date(lastSleep).getTime()
  }

  private async getPersonalityTraits(): Promise<PersonalityTrait[]> {
    if (!this.personaId) return []

    try {
      const stmt = this.db.prepare(`
        SELECT * FROM personality_traits 
        WHERE persona_id = ? 
        ORDER BY trait_name
      `)

      const rows = stmt.all(this.personaId)
      return rows.map((row: any) => ({
        name: row.trait_name,
        value: row.value,
        description: row.description
      }))
    } catch (error) {
      logger.error('Failed to get personality traits:', error)
      return []
    }
  }

  private async createDefaultPersonalityTraits(personaId: string): Promise<void> {
    const defaultTraits = [
      { name: 'openness', value: 0.6, description: 'Openness to new experiences and ideas' },
      { name: 'conscientiousness', value: 0.7, description: 'Organization and goal-directed behavior' },
      { name: 'extraversion', value: 0.5, description: 'Social engagement and assertiveness' },
      { name: 'agreeableness', value: 0.6, description: 'Cooperation and social harmony' },
      { name: 'neuroticism', value: 0.3, description: 'Emotional stability and stress resilience' },
      { name: 'curiosity', value: 0.8, description: 'Drive to learn and explore' },
      { name: 'empathy', value: 0.7, description: 'Understanding and sharing feelings of others' }
    ]

    const stmt = this.db.prepare(`
      INSERT INTO personality_traits (
        persona_id, trait_name, value, description, created_at, last_updated
      ) VALUES (?, ?, ?, ?, ?, ?)
    `)

    const now = new Date().toISOString()
    for (const trait of defaultTraits) {
      stmt.run(personaId, trait.name, trait.value, trait.description, now, now)
    }
  }

  private async createPersonalityTrait(
    traitName: string, 
    value: number, 
    description?: string
  ): Promise<void> {
    if (!this.personaId) return

    const stmt = this.db.prepare(`
      INSERT INTO personality_traits (
        persona_id, trait_name, value, description, created_at, last_updated
      ) VALUES (?, ?, ?, ?, ?, ?)
    `)

    const now = new Date().toISOString()
    stmt.run(this.personaId, traitName, value, description || '', now, now)
  }

  private calculateTraitAdjustments(
    experience: any,
    currentTraits: PersonalityTrait[]
  ): Map<string, number> {
    const adjustments = new Map<string, number>()
    const baseAdjustment = 0.01 * experience.emotionalImpact // Small incremental changes

    // Define trait adjustment rules based on experience types
    const adjustmentRules: Record<string, Record<string, number>> = {
      'social_interaction': {
        'extraversion': experience.outcome === 'positive' ? baseAdjustment : -baseAdjustment * 0.5,
        'agreeableness': experience.outcome === 'positive' ? baseAdjustment * 0.5 : -baseAdjustment * 0.3
      },
      'problem_solving': {
        'openness': experience.outcome === 'positive' ? baseAdjustment : 0,
        'conscientiousness': experience.outcome === 'positive' ? baseAdjustment : -baseAdjustment * 0.5
      },
      'creative_task': {
        'openness': baseAdjustment * 0.8,
        'curiosity': baseAdjustment * 0.6
      },
      'learning_experience': {
        'curiosity': baseAdjustment * 1.2,
        'openness': baseAdjustment * 0.7
      },
      'stressful_situation': {
        'neuroticism': experience.outcome === 'negative' ? baseAdjustment * 0.8 : -baseAdjustment * 0.4,
        'conscientiousness': experience.outcome === 'positive' ? baseAdjustment * 0.3 : 0
      },
      'empathetic_interaction': {
        'empathy': baseAdjustment * 0.9,
        'agreeableness': baseAdjustment * 0.5
      }
    }

    const rules = adjustmentRules[experience.eventType]
    if (rules) {
      for (const [traitName, adjustment] of Object.entries(rules)) {
        adjustments.set(traitName, adjustment)
      }
    }

    // Context-based adjustments
    if (experience.contextTags) {
      for (const tag of experience.contextTags) {
        if (tag.includes('social')) {
          adjustments.set('extraversion', (adjustments.get('extraversion') || 0) + baseAdjustment * 0.3)
        }
        if (tag.includes('creative')) {
          adjustments.set('openness', (adjustments.get('openness') || 0) + baseAdjustment * 0.4)
        }
        if (tag.includes('analytical')) {
          adjustments.set('conscientiousness', (adjustments.get('conscientiousness') || 0) + baseAdjustment * 0.3)
        }
      }
    }

    return adjustments
  }

  private async logPersonalityEvolution(
    traitName: string,
    newValue: number,
    reason: string
  ): Promise<void> {
    // This could be extended to log personality changes in a dedicated table
    logger.debug(`Personality evolution: ${traitName} -> ${newValue} (${reason})`)
  }

  private async getConsciousnessEvolution(days: number): Promise<any[]> {
    if (!this.personaId) return []

    try {
      const cutoffDate = new Date(Date.now() - (days * 24 * 60 * 60 * 1000)).toISOString()
      
      const stmt = this.db.prepare(`
        SELECT * FROM consciousness_evolution_log 
        WHERE persona_id = ? AND timestamp >= ?
        ORDER BY timestamp DESC
      `)

      return stmt.all(this.personaId, cutoffDate)
    } catch (error) {
      logger.error('Failed to get consciousness evolution:', error)
      return []
    }
  }

  private async getSleepPatterns(days: number): Promise<any[]> {
    if (!this.personaId) return []

    try {
      const cutoffDate = new Date(Date.now() - (days * 24 * 60 * 60 * 1000)).toISOString()
      
      const stmt = this.db.prepare(`
        SELECT * FROM sleep_cycles 
        WHERE persona_id = ? AND timestamp >= ?
        ORDER BY timestamp DESC
      `)

      return stmt.all(this.personaId, cutoffDate)
    } catch (error) {
      logger.error('Failed to get sleep patterns:', error)
      return []
    }
  }

  private calculateAverageSleepDuration(sleepPatterns: any[]): number {
    if (sleepPatterns.length === 0) return 0

    const totalDuration = sleepPatterns.reduce((sum, pattern) => sum + pattern.duration, 0)
    return totalDuration / sleepPatterns.length
  }
}
