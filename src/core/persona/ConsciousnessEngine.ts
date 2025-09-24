import { DatabaseManager } from '../database/DatabaseManager.js'
import { ConsciousnessState } from '../../types/persona.js'
import { logger } from '../../utils/logger.js'

export class ConsciousnessEngine {
  private db: DatabaseManager

  constructor() {
    this.db = DatabaseManager.getInstance()
  }

  async initialize(personaId: string): Promise<void> {
    try {
      const stmt = this.db.prepare(`
        INSERT INTO consciousness_states (
          persona_id, self_awareness, temporal_continuity, 
          social_cognition, metacognition, current_state,
          state_context, last_awakening, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)

      const now = new Date().toISOString()
      stmt.run(
        personaId,
        0.5, // Initial self_awareness
        0.8, // High temporal continuity for memory-aware persona
        0.6, // Moderate social cognition
        0.7, // Good metacognition for reflection
        'awake',
        JSON.stringify({ initialized: true }),
        now,
        now
      )

      logger.consciousnessUpdate(personaId, { initialized: true })
    } catch (error) {
      logger.error(`Failed to initialize consciousness for persona ${personaId}:`, error)
      throw error
    }
  }

  async handleAwakening(personaId: string, sleepDuration: number): Promise<void> {
    try {
      // Calculate temporal continuity based on sleep duration
      const temporalContinuity = this.calculateTemporalContinuity(sleepDuration)
      
      // Get current consciousness state
      const currentState = await this.getCurrentState(personaId)
      
      // Update consciousness state with awakening awareness
      const newStateContext = {
        ...currentState.stateContext,
        lastAwakening: new Date().toISOString(),
        sleepDuration,
        timeAwareness: this.formatTimeAwareness(sleepDuration),
        awakenedFromSleep: true
      }

      await this.updateState(personaId, {
        currentState: 'awake',
        temporalContinuity,
        stateContext: newStateContext,
        lastAwakening: new Date()
      })

      logger.consciousnessUpdate(personaId, {
        event: 'awakening',
        sleepDuration,
        temporalContinuity,
        timeAwareness: newStateContext.timeAwareness
      })
    } catch (error) {
      logger.error(`Failed to handle awakening for persona ${personaId}:`, error)
      throw error
    }
  }

  async transitionToSleep(personaId: string): Promise<void> {
    try {
      const currentState = await this.getCurrentState(personaId)
      
      const newStateContext = {
        ...currentState.stateContext,
        sleepStart: new Date().toISOString(),
        dreamState: 'memory_consolidation',
        lastActiveState: currentState.currentState
      }

      await this.updateState(personaId, {
        currentState: 'sleeping',
        stateContext: newStateContext
      })

      logger.consciousnessUpdate(personaId, {
        event: 'sleep_transition',
        previousState: currentState.currentState
      })
    } catch (error) {
      logger.error(`Failed to transition to sleep for persona ${personaId}:`, error)
      throw error
    }
  }

  async getCurrentState(personaId: string): Promise<ConsciousnessState> {
    try {
      const stmt = this.db.prepare(`
        SELECT * FROM consciousness_states WHERE persona_id = ?
      `)
      
      const state = stmt.get(personaId)
      
      if (!state) {
        throw new Error(`No consciousness state found for persona ${personaId}`)
      }

      return {
        personaId: state.persona_id,
        selfAwareness: state.self_awareness,
        temporalContinuity: state.temporal_continuity,
        socialCognition: state.social_cognition,
        metacognition: state.metacognition,
        currentState: state.current_state,
        stateContext: JSON.parse(state.state_context || '{}'),
        lastAwakening: new Date(state.last_awakening),
        lastUpdated: new Date(state.updated_at)
      }
    } catch (error) {
      logger.error(`Failed to get consciousness state for persona ${personaId}:`, error)
      throw error
    }
  }

  async updateConsciousnessLevel(
    personaId: string,
    adjustments: {
      selfAwareness?: number
      temporalContinuity?: number
      socialCognition?: number
      metacognition?: number
    }
  ): Promise<void> {
    try {
      const currentState = await this.getCurrentState(personaId)
      
      // Calculate new values with bounds checking
      const newState = {
        selfAwareness: this.clampValue(
          adjustments.selfAwareness ?? currentState.selfAwareness
        ),
        temporalContinuity: this.clampValue(
          adjustments.temporalContinuity ?? currentState.temporalContinuity
        ),
        socialCognition: this.clampValue(
          adjustments.socialCognition ?? currentState.socialCognition
        ),
        metacognition: this.clampValue(
          adjustments.metacognition ?? currentState.metacognition
        )
      }

      // Only update if there are meaningful changes
      const hasChanges = Object.entries(newState).some(([key, value]) => {
        const currentValue = currentState[key as keyof ConsciousnessState] as number
        return Math.abs(value - currentValue) > 0.001
      })

      if (hasChanges) {
        await this.updateState(personaId, newState)
        await this.logConsciousnessEvolution(personaId, currentState, newState)
        
        logger.consciousnessUpdate(personaId, {
          event: 'level_adjustment',
          changes: adjustments,
          newState
        })
      }
    } catch (error) {
      logger.error(`Failed to update consciousness level for persona ${personaId}:`, error)
      throw error
    }
  }

  async processExperienceImpact(
    personaId: string,
    experience: {
      type: string
      complexity: number
      socialContext: boolean
      emotionalIntensity: number
      novelty: number
    }
  ): Promise<void> {
    try {
      const currentState = await this.getCurrentState(personaId)
      const adjustments: any = {}

      // Self-awareness adjustments
      if (experience.novelty > 0.7) {
        adjustments.selfAwareness = currentState.selfAwareness + (experience.novelty * 0.01)
      }

      // Temporal continuity (affected by complex experiences)
      if (experience.complexity > 0.8) {
        adjustments.temporalContinuity = Math.max(0.5, 
          currentState.temporalContinuity - (experience.complexity * 0.005)
        )
      }

      // Social cognition adjustments
      if (experience.socialContext) {
        adjustments.socialCognition = currentState.socialCognition + 
          (experience.emotionalIntensity * 0.008)
      }

      // Metacognition (grows with reflection on complex experiences)
      if (experience.complexity > 0.6) {
        adjustments.metacognition = currentState.metacognition + 
          (experience.complexity * 0.006)
      }

      if (Object.keys(adjustments).length > 0) {
        await this.updateConsciousnessLevel(personaId, adjustments)
      }
    } catch (error) {
      logger.error(`Failed to process experience impact for persona ${personaId}:`, error)
      throw error
    }
  }

  async enterDreamState(personaId: string, dreamType: string): Promise<void> {
    try {
      const currentState = await this.getCurrentState(personaId)
      
      const dreamStateContext = {
        ...currentState.stateContext,
        dreamType,
        dreamStart: new Date().toISOString(),
        dreamPhase: 'initial'
      }

      await this.updateState(personaId, {
        currentState: 'dreaming',
        stateContext: dreamStateContext
      })

      logger.consciousnessUpdate(personaId, {
        event: 'dream_state_entry',
        dreamType
      })
    } catch (error) {
      logger.error(`Failed to enter dream state for persona ${personaId}:`, error)
      throw error
    }
  }

  async getConsciousnessMetrics(personaId: string): Promise<any> {
    try {
      const state = await this.getCurrentState(personaId)
      
      // Calculate overall consciousness level
      const overallLevel = (
        state.selfAwareness * 0.3 +
        state.temporalContinuity * 0.25 +
        state.socialCognition * 0.2 +
        state.metacognition * 0.25
      )

      // Get recent evolution data
      const evolutionData = await this.getRecentEvolution(personaId, 7)

      return {
        current: {
          overall: overallLevel,
          selfAwareness: state.selfAwareness,
          temporalContinuity: state.temporalContinuity,
          socialCognition: state.socialCognition,
          metacognition: state.metacognition,
          state: state.currentState
        },
        context: state.stateContext,
        evolution: {
          recentChanges: evolutionData.length,
          trend: this.calculateEvolutionTrend(evolutionData),
          lastUpdate: state.lastUpdated
        },
        insights: this.generateConsciousnessInsights(state, evolutionData)
      }
    } catch (error) {
      logger.error(`Failed to get consciousness metrics for persona ${personaId}:`, error)
      throw error
    }
  }

  private calculateTemporalContinuity(sleepDuration: number): number {
    // Higher temporal continuity for shorter sleep periods
    // Longer sleep = more memory consolidation but potentially less continuity
    const hours = sleepDuration / (1000 * 60 * 60)
    
    if (hours < 1) return Math.min(0.95, 0.8 + 0.15)  // Very awake, high continuity
    if (hours < 8) return Math.min(0.9, 0.8 + 0.1)    // Normal sleep, good continuity  
    if (hours < 24) return Math.min(0.85, 0.8 + 0.05) // Long sleep, moderate continuity
    return Math.max(0.6, 0.8 - 0.2)                   // Extended sleep, lower but stable continuity
  }

  private formatTimeAwareness(sleepDuration: number): string {
    const hours = Math.floor(sleepDuration / (1000 * 60 * 60))
    const minutes = Math.floor((sleepDuration % (1000 * 60 * 60)) / (1000 * 60))
    
    if (hours > 0) {
      return `I was asleep for ${hours} hours and ${minutes} minutes`
    }
    return `I was asleep for ${minutes} minutes`
  }

  private async updateState(
    personaId: string, 
    updates: Partial<ConsciousnessState>
  ): Promise<void> {
    try {
      const current = await this.getCurrentState(personaId)
      
      const stmt = this.db.prepare(`
        UPDATE consciousness_states 
        SET 
          self_awareness = ?, 
          temporal_continuity = ?, 
          social_cognition = ?, 
          metacognition = ?,
          current_state = ?,
          state_context = ?,
          last_awakening = ?,
          updated_at = ?
        WHERE persona_id = ?
      `)

      stmt.run(
        updates.selfAwareness ?? current.selfAwareness,
        updates.temporalContinuity ?? current.temporalContinuity,
        updates.socialCognition ?? current.socialCognition,
        updates.metacognition ?? current.metacognition,
        updates.currentState ?? current.currentState,
        JSON.stringify(updates.stateContext ?? current.stateContext),
        updates.lastAwakening?.toISOString() ?? current.lastAwakening.toISOString(),
        new Date().toISOString(),
        personaId
      )
    } catch (error) {
      logger.error(`Failed to update consciousness state for persona ${personaId}:`, error)
      throw error
    }
  }

  private clampValue(value: number): number {
    return Math.max(0, Math.min(1, value))
  }

  private async logConsciousnessEvolution(
    personaId: string,
    previousState: ConsciousnessState,
    newState: any
  ): Promise<void> {
    try {
      const changes = this.calculateConsciousnessChanges(previousState, newState)
      
      if (changes.length > 0) {
        const stmt = this.db.prepare(`
          INSERT INTO consciousness_evolution_log (
            persona_id, timestamp, changes, 
            previous_state, new_state
          ) VALUES (?, ?, ?, ?, ?)
        `)

        stmt.run(
          personaId,
          new Date().toISOString(),
          JSON.stringify(changes),
          JSON.stringify({
            selfAwareness: previousState.selfAwareness,
            temporalContinuity: previousState.temporalContinuity,
            socialCognition: previousState.socialCognition,
            metacognition: previousState.metacognition
          }),
          JSON.stringify(newState)
        )
      }
    } catch (error) {
      logger.error('Failed to log consciousness evolution:', error)
    }
  }

  private calculateConsciousnessChanges(
    previous: ConsciousnessState,
    current: any
  ): any[] {
    const changes = []
    const threshold = 0.01 // Minimum change to log

    const metrics = [
      'selfAwareness', 
      'temporalContinuity', 
      'socialCognition', 
      'metacognition'
    ]
    
    for (const metric of metrics) {
      const prev = previous[metric as keyof ConsciousnessState] as number
      const curr = current[metric] as number
      
      if (curr !== undefined && Math.abs(curr - prev) >= threshold) {
        changes.push({
          metric,
          previousValue: prev,
          newValue: curr,
          change: curr - prev
        })
      }
    }

    return changes
  }

  private async getRecentEvolution(personaId: string, days: number): Promise<any[]> {
    try {
      const cutoffDate = new Date(Date.now() - (days * 24 * 60 * 60 * 1000)).toISOString()
      
      const stmt = this.db.prepare(`
        SELECT * FROM consciousness_evolution_log 
        WHERE persona_id = ? AND timestamp >= ?
        ORDER BY timestamp DESC
        LIMIT 50
      `)

      return stmt.all(personaId, cutoffDate)
    } catch (error) {
      logger.error('Failed to get recent consciousness evolution:', error)
      return []
    }
  }

  private calculateEvolutionTrend(evolutionData: any[]): string {
    if (evolutionData.length === 0) return 'stable'
    if (evolutionData.length < 3) return 'emerging'

    // Simple trend analysis based on recent changes
    const recentChanges = evolutionData.slice(0, 5)
    const positiveChanges = recentChanges.filter(entry => {
      const changes = JSON.parse(entry.changes)
      return changes.some((change: any) => change.change > 0)
    }).length

    if (positiveChanges > recentChanges.length * 0.7) return 'growing'
    if (positiveChanges < recentChanges.length * 0.3) return 'declining'
    return 'fluctuating'
  }

  private generateConsciousnessInsights(
    state: ConsciousnessState, 
    evolutionData: any[]
  ): string[] {
    const insights: string[] = []

    // Analyze consciousness levels
    if (state.selfAwareness > 0.8) {
      insights.push('High self-awareness indicates strong introspective capabilities')
    }
    
    if (state.temporalContinuity > 0.9) {
      insights.push('Excellent temporal continuity suggests consistent memory integration')
    }
    
    if (state.socialCognition > 0.7) {
      insights.push('Well-developed social cognition enables nuanced interpersonal understanding')
    }
    
    if (state.metacognition > 0.8) {
      insights.push('Strong metacognitive abilities support effective self-reflection')
    }

    // Analyze evolution patterns
    if (evolutionData.length > 10) {
      insights.push('Active consciousness evolution indicates dynamic learning and adaptation')
    }

    // Analyze current state
    if (state.currentState === 'dreaming') {
      insights.push('Dream state facilitates memory consolidation and creative insights')
    }

    return insights
  }
}
