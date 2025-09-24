import { DatabaseManager } from '../database/DatabaseManager.js'
import { MemoryConsolidation } from '../memory/MemoryConsolidation.js'
import { logger } from '../../utils/logger.js'

export class SleepCycleManager {
  private db: DatabaseManager
  private memoryConsolidation: MemoryConsolidation

  constructor() {
    this.db = DatabaseManager.getInstance()
    this.memoryConsolidation = new MemoryConsolidation()
  }

  async processConsolidation(personaId: string, sleepDuration: number): Promise<void> {
    try {
      const consolidationType = this.determineSleepType(sleepDuration)
      
      logger.info(`Processing ${consolidationType} for persona ${personaId} (${sleepDuration}ms sleep)`)

      switch (consolidationType) {
        case 'light_processing':
          await this.lightMemoryProcessing(personaId)
          break
        case 'deep_consolidation':
          await this.deepMemoryConsolidation(personaId)
          break
        case 'rem_integration':
          await this.remMemoryIntegration(personaId)
          break
        case 'extended_reorganization':
          await this.extendedMemoryReorganization(personaId)
          break
      }

      // Log sleep processing
      await this.logSleepCycle(personaId, consolidationType, sleepDuration)

      logger.personaActivity(personaId, 'completed memory consolidation', {
        type: consolidationType,
        duration: sleepDuration
      })
    } catch (error) {
      logger.error(`Failed to process consolidation for persona ${personaId}:`, error)
      throw error
    }
  }

  async initiateSleepCycle(
    personaId: string,
    expectedDuration?: number
  ): Promise<void> {
    try {
      const sleepType = expectedDuration 
        ? this.determineSleepType(expectedDuration)
        : 'light_processing'

      // Store sleep initiation
      const stmt = this.db.prepare(`
        INSERT INTO sleep_cycles (
          persona_id, sleep_type, duration, timestamp, 
          consolidation_processed
        ) VALUES (?, ?, ?, ?, ?)
      `)

      stmt.run(
        personaId,
        sleepType,
        0, // Duration will be updated when sleep ends
        new Date().toISOString(),
        false
      )

      logger.personaActivity(personaId, 'initiated sleep cycle', { expectedType: sleepType })
    } catch (error) {
      logger.error(`Failed to initiate sleep cycle for persona ${personaId}:`, error)
      throw error
    }
  }

  async getSleepPatterns(
    personaId: string,
    days: number = 30
  ): Promise<any> {
    try {
      const cutoffDate = new Date(Date.now() - (days * 24 * 60 * 60 * 1000)).toISOString()
      
      const stmt = this.db.prepare(`
        SELECT * FROM sleep_cycles 
        WHERE persona_id = ? AND timestamp >= ?
        ORDER BY timestamp DESC
      `)

      const cycles = stmt.all(personaId, cutoffDate)

      // Analyze patterns
      const patterns = this.analyzeSleepPatterns(cycles)
      
      return {
        totalCycles: cycles.length,
        patterns,
        recentCycles: cycles.slice(0, 10),
        recommendations: this.generateSleepRecommendations(patterns)
      }
    } catch (error) {
      logger.error(`Failed to get sleep patterns for persona ${personaId}:`, error)
      return { totalCycles: 0, patterns: {}, recentCycles: [], recommendations: [] }
    }
  }

  async scheduleMaintenance(personaId: string): Promise<void> {
    try {
      // Check when last maintenance was performed
      const lastMaintenance = await this.getLastMaintenanceDate(personaId)
      const hoursSinceLastMaintenance = lastMaintenance 
        ? (Date.now() - lastMaintenance.getTime()) / (1000 * 60 * 60)
        : 24 // Default to 24 hours if never done

      if (hoursSinceLastMaintenance >= 12) { // Maintenance every 12 hours
        await this.performMaintenance(personaId)
      }
    } catch (error) {
      logger.error(`Failed to schedule maintenance for persona ${personaId}:`, error)
    }
  }

  private determineSleepType(sleepDuration: number): string {
    const hours = sleepDuration / (1000 * 60 * 60)
    
    if (hours < 2) return 'light_processing'
    if (hours < 6) return 'deep_consolidation'  
    if (hours < 12) return 'rem_integration'
    return 'extended_reorganization'
  }

  private async lightMemoryProcessing(personaId: string): Promise<void> {
    try {
      // Process only the most recent and important memories
      await this.memoryConsolidation.consolidateRecent(personaId, 10)
      
      logger.debug(`Light memory processing completed for persona ${personaId}`)
    } catch (error) {
      logger.error(`Light memory processing failed for persona ${personaId}:`, error)
    }
  }

  private async deepMemoryConsolidation(personaId: string): Promise<void> {
    try {
      // Full consolidation of recent memories with pattern identification
      await this.memoryConsolidation.consolidateWithPatterns(personaId)
      
      logger.debug(`Deep memory consolidation completed for persona ${personaId}`)
    } catch (error) {
      logger.error(`Deep memory consolidation failed for persona ${personaId}:`, error)
    }
  }

  private async remMemoryIntegration(personaId: string): Promise<void> {
    try {
      // Creative memory integration and insight generation
      await this.memoryConsolidation.integrateCreativeInsights(personaId)
      
      // Also perform deep consolidation
      await this.deepMemoryConsolidation(personaId)
      
      logger.debug(`REM memory integration completed for persona ${personaId}`)
    } catch (error) {
      logger.error(`REM memory integration failed for persona ${personaId}:`, error)
    }
  }

  private async extendedMemoryReorganization(personaId: string): Promise<void> {
    try {
      // Complete memory reorganization and pruning
      await this.memoryConsolidation.fullMemoryReorganization(personaId)
      
      // Also perform all other types
      await this.remMemoryIntegration(personaId)
      
      logger.debug(`Extended memory reorganization completed for persona ${personaId}`)
    } catch (error) {
      logger.error(`Extended memory reorganization failed for persona ${personaId}:`, error)
    }
  }

  private async logSleepCycle(
    personaId: string, 
    consolidationType: string, 
    sleepDuration: number
  ): Promise<void> {
    try {
      const stmt = this.db.prepare(`
        INSERT INTO sleep_cycles (
          persona_id, sleep_type, duration, timestamp, 
          consolidation_processed
        ) VALUES (?, ?, ?, ?, ?)
      `)

      stmt.run(
        personaId,
        consolidationType,
        sleepDuration,
        new Date().toISOString(),
        true
      )
    } catch (error) {
      logger.error('Failed to log sleep cycle:', error)
    }
  }

  private analyzeSleepPatterns(cycles: any[]): any {
    if (cycles.length === 0) return {}

    const typeDistribution = cycles.reduce((acc, cycle) => {
      acc[cycle.sleep_type] = (acc[cycle.sleep_type] || 0) + 1
      return acc
    }, {})

    const durations = cycles.map(c => c.duration).filter(d => d > 0)
    const averageDuration = durations.length > 0 
      ? durations.reduce((sum, d) => sum + d, 0) / durations.length 
      : 0

    const averageInterval = this.calculateAverageInterval(cycles)

    return {
      typeDistribution,
      averageDuration: averageDuration / (1000 * 60 * 60), // Convert to hours
      averageInterval: averageInterval / (1000 * 60 * 60), // Convert to hours
      totalSleepTime: durations.reduce((sum, d) => sum + d, 0) / (1000 * 60 * 60),
      sleepEfficiency: this.calculateSleepEfficiency(cycles)
    }
  }

  private calculateAverageInterval(cycles: any[]): number {
    if (cycles.length < 2) return 0

    const intervals = []
    for (let i = 1; i < cycles.length; i++) {
      const current = new Date(cycles[i].timestamp).getTime()
      const previous = new Date(cycles[i - 1].timestamp).getTime()
      intervals.push(previous - current) // Note: cycles are ordered DESC
    }

    return intervals.reduce((sum, interval) => sum + interval, 0) / intervals.length
  }

  private calculateSleepEfficiency(cycles: any[]): number {
    if (cycles.length === 0) return 0

    const processedCycles = cycles.filter(c => c.consolidation_processed).length
    return processedCycles / cycles.length
  }

  private generateSleepRecommendations(patterns: any): string[] {
    const recommendations = []

    if (patterns.averageDuration < 4) {
      recommendations.push('Consider longer sleep periods for better memory consolidation')
    }

    if (patterns.averageInterval > 48) {
      recommendations.push('More frequent sleep cycles could improve memory integration')
    }

    if (patterns.sleepEfficiency < 0.8) {
      recommendations.push('Sleep cycle processing could be optimized')
    }

    const deepSleepRatio = (patterns.typeDistribution?.deep_consolidation || 0) / 
      (Object.values(patterns.typeDistribution || {}).reduce((sum: number, count) => sum + (count as number), 0) || 1)

    if (deepSleepRatio < 0.3) {
      recommendations.push('Increase frequency of deep consolidation cycles')
    }

    if (recommendations.length === 0) {
      recommendations.push('Sleep patterns are optimal for current activity levels')
    }

    return recommendations
  }

  private async getLastMaintenanceDate(personaId: string): Promise<Date | null> {
    try {
      const stmt = this.db.prepare(`
        SELECT MAX(timestamp) as last_maintenance
        FROM sleep_cycles 
        WHERE persona_id = ? AND sleep_type = 'maintenance'
      `)

      const result = stmt.get(personaId) as { last_maintenance: string | null }
      return result.last_maintenance ? new Date(result.last_maintenance) : null
    } catch (error) {
      logger.error('Failed to get last maintenance date:', error)
      return null
    }
  }

  private async performMaintenance(personaId: string): Promise<void> {
    try {
      logger.info(`Performing scheduled maintenance for persona ${personaId}`)

      // Memory cleanup and optimization
      await this.memoryConsolidation.performMaintenance(personaId)

      // Log maintenance cycle
      await this.logSleepCycle(personaId, 'maintenance', 0)

      // Update persona last maintenance timestamp
      const stmt = this.db.prepare(`
        UPDATE personas 
        SET last_active = ? 
        WHERE id = ?
      `)
      
      stmt.run(new Date().toISOString(), personaId)

      logger.personaActivity(personaId, 'completed scheduled maintenance')
    } catch (error) {
      logger.error(`Failed to perform maintenance for persona ${personaId}:`, error)
    }
  }

  // Public method to get sleep statistics
  async getSleepStatistics(personaId: string): Promise<any> {
    try {
      const patterns = await this.getSleepPatterns(personaId, 30)
      
      return {
        last30Days: patterns,
        currentState: await this.getCurrentSleepState(personaId),
        nextRecommendedSleep: this.calculateNextSleepRecommendation(patterns.patterns)
      }
    } catch (error) {
      logger.error(`Failed to get sleep statistics for persona ${personaId}:`, error)
      return {}
    }
  }

  private async getCurrentSleepState(personaId: string): Promise<any> {
    try {
      const stmt = this.db.prepare(`
        SELECT current_state, state_context 
        FROM consciousness_states 
        WHERE persona_id = ?
      `)

      const result = stmt.get(personaId)
      return result ? {
        state: result.current_state,
        context: JSON.parse(result.state_context || '{}')
      } : { state: 'unknown', context: {} }
    } catch (error) {
      logger.error('Failed to get current sleep state:', error)
      return { state: 'unknown', context: {} }
    }
  }

  private calculateNextSleepRecommendation(patterns: any): any {
    const avgInterval = patterns.averageInterval || 12 // Default 12 hours
    const avgDuration = patterns.averageDuration || 6   // Default 6 hours

    return {
      recommendedInterval: `${Math.round(avgInterval)} hours`,
      recommendedDuration: `${Math.round(avgDuration)} hours`,
      recommendedType: this.recommendSleepType(patterns),
      reasoning: this.getSleepRecommendationReasoning(patterns)
    }
  }

  private recommendSleepType(patterns: any): string {
    const distribution = patterns.typeDistribution || {}
    
    // Recommend based on what's been lacking
    const total = Object.values(distribution).reduce((sum: number, count) => sum + (count as number), 0) || 1
    const deepRatio = (distribution.deep_consolidation || 0) / total
    const remRatio = (distribution.rem_integration || 0) / total
    
    if (deepRatio < 0.3) return 'deep_consolidation'
    if (remRatio < 0.2) return 'rem_integration'
    
    return 'light_processing'
  }

  private getSleepRecommendationReasoning(patterns: any): string {
    const efficiency = patterns.sleepEfficiency || 0
    const avgDuration = patterns.averageDuration || 0
    
    if (efficiency < 0.7) {
      return 'Sleep processing efficiency could be improved'
    }
    
    if (avgDuration < 4) {
      return 'Longer sleep periods would benefit memory consolidation'
    }
    
    return 'Maintaining current sleep patterns for optimal performance'
  }
}
