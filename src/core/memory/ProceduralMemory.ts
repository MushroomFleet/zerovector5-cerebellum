import { DatabaseManager } from '../database/DatabaseManager.js'
import { ProceduralSkill } from '../../types/memory.js'
import { logger } from '../../utils/logger.js'

export class ProceduralMemory {
  private db: DatabaseManager

  constructor() {
    this.db = DatabaseManager.getInstance()
  }

  async storeSkillPattern(
    personaId: string,
    skill: {
      name: string
      domain: string
      pattern: any
      successRate: number
      contextConditions: string[]
      lastUsed: Date
    }
  ): Promise<string> {
    const skillId = this.generateSkillId()

    try {
      const stmt = this.db.prepare(`
        INSERT INTO procedural_skills (
          id, persona_id, skill_name, domain, pattern,
          success_rate, context_conditions, usage_count,
          last_used, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)

      stmt.run(
        skillId,
        personaId,
        skill.name,
        skill.domain,
        JSON.stringify(skill.pattern),
        skill.successRate,
        JSON.stringify(skill.contextConditions),
        1,
        skill.lastUsed.toISOString(),
        new Date().toISOString()
      )

      logger.memoryOperation('Store', personaId, 'procedural skill', 1)
      return skillId
    } catch (error) {
      logger.error(`Failed to store skill for persona ${personaId}:`, error)
      throw error
    }
  }

  async getApplicableSkills(
    personaId: string,
    context: string[],
    domain?: string
  ): Promise<ProceduralSkill[]> {
    try {
      let query = `
        SELECT * FROM procedural_skills 
        WHERE persona_id = ?
      `
      const params = [personaId]

      if (domain) {
        query += ` AND domain = ?`
        params.push(domain)
      }

      query += ` ORDER BY success_rate DESC, usage_count DESC`

      const stmt = this.db.prepare(query)
      const skills = stmt.all(...params)

      // Filter by context conditions
      const applicableSkills = skills
        .filter(skill => this.contextMatches(context, JSON.parse(skill.context_conditions)))
        .map(this.mapRowToSkill)

      logger.memoryOperation('Get Applicable', personaId, 'procedural skills', applicableSkills.length)
      return applicableSkills
    } catch (error) {
      logger.error(`Failed to get applicable skills for persona ${personaId}:`, error)
      throw error
    }
  }

  async getAllSkills(personaId: string): Promise<ProceduralSkill[]> {
    try {
      const stmt = this.db.prepare(`
        SELECT * FROM procedural_skills 
        WHERE persona_id = ?
        ORDER BY success_rate DESC
      `)

      const skills = stmt.all(personaId).map(this.mapRowToSkill)
      
      logger.memoryOperation('Get All', personaId, 'procedural skills', skills.length)
      return skills
    } catch (error) {
      logger.error(`Failed to get all skills for persona ${personaId}:`, error)
      throw error
    }
  }

  async updateSkillPerformance(
    skillId: string,
    wasSuccessful: boolean,
    context: string[]
  ): Promise<void> {
    try {
      // Get current skill data
      const stmt = this.db.prepare(`
        SELECT success_rate, usage_count FROM procedural_skills 
        WHERE id = ?
      `)
      const skill = stmt.get(skillId)

      if (!skill) {
        logger.warn(`Skill ${skillId} not found for performance update`)
        return
      }

      // Calculate new success rate using exponential smoothing
      const totalAttempts = skill.usage_count + 1
      const alpha = 0.1 // Learning rate
      const currentSuccessRate = skill.success_rate
      
      let newSuccessRate: number
      if (wasSuccessful) {
        newSuccessRate = currentSuccessRate + alpha * (1 - currentSuccessRate)
      } else {
        newSuccessRate = currentSuccessRate + alpha * (0 - currentSuccessRate)
      }

      // Update skill
      const updateStmt = this.db.prepare(`
        UPDATE procedural_skills 
        SET success_rate = ?, usage_count = ?, last_used = ?
        WHERE id = ?
      `)

      updateStmt.run(
        Math.max(0, Math.min(1, newSuccessRate)), // Clamp between 0 and 1
        totalAttempts,
        new Date().toISOString(),
        skillId
      )

      logger.debug(`Updated skill ${skillId}: success=${wasSuccessful}, newRate=${newSuccessRate.toFixed(3)}`)
    } catch (error) {
      logger.error(`Failed to update skill performance for ${skillId}:`, error)
      throw error
    }
  }

  async evolveSkillFromExperience(
    personaId: string,
    experience: {
      context: string[]
      action: any
      outcome: 'success' | 'failure' | 'partial'
      domain: string
    }
  ): Promise<void> {
    try {
      // Find existing similar skills
      const similarSkills = await this.findSimilarSkills(
        personaId, 
        experience.context, 
        experience.domain
      )

      if (similarSkills.length > 0) {
        // Update existing skill
        const bestMatch = similarSkills[0]
        const wasSuccessful = experience.outcome === 'success'
        await this.updateSkillPerformance(bestMatch.id!, wasSuccessful, experience.context)

        // Potentially refine the skill pattern
        await this.refineSkillPattern(bestMatch.id!, experience)
      } else {
        // Create new skill if this represents a novel pattern
        if (experience.outcome === 'success') {
          await this.createSkillFromExperience(personaId, experience)
        }
      }

      logger.memoryOperation('Evolve', personaId, 'procedural skill', 1)
    } catch (error) {
      logger.error(`Failed to evolve skill from experience for persona ${personaId}:`, error)
      throw error
    }
  }

  async getSkillStatistics(personaId: string): Promise<any> {
    try {
      const stmt = this.db.prepare(`
        SELECT 
          COUNT(*) as total,
          AVG(success_rate) as avg_success_rate,
          domain,
          COUNT(*) as domain_count,
          AVG(success_rate) as domain_avg_success
        FROM procedural_skills 
        WHERE persona_id = ?
        GROUP BY domain
        ORDER BY domain_count DESC
      `)

      const domainStats = stmt.all(personaId)
      
      const overallStmt = this.db.prepare(`
        SELECT 
          COUNT(*) as total,
          AVG(success_rate) as avg_success_rate,
          COUNT(DISTINCT domain) as total_domains,
          SUM(usage_count) as total_usage
        FROM procedural_skills 
        WHERE persona_id = ?
      `)

      const overall = overallStmt.get(personaId)

      const performanceStmt = this.db.prepare(`
        SELECT 
          CASE 
            WHEN success_rate >= 0.8 THEN 'expert'
            WHEN success_rate >= 0.6 THEN 'proficient'
            WHEN success_rate >= 0.4 THEN 'developing'
            ELSE 'novice'
          END as skill_level,
          COUNT(*) as count
        FROM procedural_skills 
        WHERE persona_id = ?
        GROUP BY skill_level
      `)

      const skillLevels = performanceStmt.all(personaId)

      return {
        overall,
        byDomain: domainStats,
        skillLevels: this.formatSkillLevels(skillLevels),
        learningTrends: await this.getSkillLearningTrends(personaId)
      }
    } catch (error) {
      logger.error(`Failed to get skill statistics for persona ${personaId}:`, error)
      throw error
    }
  }

  async consolidateSkills(personaId: string): Promise<void> {
    try {
      // Find skills that can be merged or refined
      const allSkills = await this.getAllSkills(personaId)
      const consolidationGroups = await this.findConsolidationGroups(allSkills)
      
      let consolidatedCount = 0

      for (const group of consolidationGroups) {
        if (group.length > 1) {
          await this.mergeSkills(group)
          consolidatedCount++
        }
      }

      // Remove low-performing, rarely used skills
      const removedCount = await this.pruneUnderperformingSkills(personaId)

      logger.memoryOperation('Consolidate', personaId, 'procedural skills', consolidatedCount)
      logger.info(`Consolidated ${consolidatedCount} skill groups, removed ${removedCount} underperforming skills`)
    } catch (error) {
      logger.error(`Failed to consolidate skills for persona ${personaId}:`, error)
      throw error
    }
  }

  private generateSkillId(): string {
    return `skill_${Date.now()}_${Math.random().toString(36).substring(7)}`
  }

  private mapRowToSkill(row: any): ProceduralSkill {
    return {
      id: row.id,
      name: row.skill_name,
      domain: row.domain,
      pattern: JSON.parse(row.pattern),
      successRate: row.success_rate,
      contextConditions: JSON.parse(row.context_conditions),
      usageCount: row.usage_count,
      lastUsed: new Date(row.last_used)
    }
  }

  private contextMatches(currentContext: string[], requiredConditions: string[]): boolean {
    if (requiredConditions.length === 0) return true

    // Check if any required condition is met
    return requiredConditions.some(condition => 
      currentContext.some(ctx => {
        const ctxLower = ctx.toLowerCase()
        const condLower = condition.toLowerCase()
        return ctxLower.includes(condLower) || condLower.includes(ctxLower)
      })
    )
  }

  private async findSimilarSkills(
    personaId: string,
    context: string[],
    domain: string
  ): Promise<ProceduralSkill[]> {
    const applicableSkills = await this.getApplicableSkills(personaId, context, domain)
    
    // Sort by context similarity and success rate
    return applicableSkills.sort((a, b) => {
      const similarityA = this.calculateContextSimilarity(context, a.contextConditions)
      const similarityB = this.calculateContextSimilarity(context, b.contextConditions)
      
      if (similarityA !== similarityB) {
        return similarityB - similarityA // Higher similarity first
      }
      
      return b.successRate - a.successRate // Higher success rate first
    })
  }

  private calculateContextSimilarity(context1: string[], context2: string[]): number {
    if (context1.length === 0 || context2.length === 0) return 0

    const set1 = new Set(context1.map(c => c.toLowerCase()))
    const set2 = new Set(context2.map(c => c.toLowerCase()))
    
    const intersection = new Set([...set1].filter(x => set2.has(x)))
    const union = new Set([...set1, ...set2])
    
    return intersection.size / union.size // Jaccard similarity
  }

  private async refineSkillPattern(skillId: string, experience: any): Promise<void> {
    try {
      // Get current skill
      const stmt = this.db.prepare(`SELECT * FROM procedural_skills WHERE id = ?`)
      const skillRow = stmt.get(skillId)
      
      if (!skillRow) return

      const currentPattern = JSON.parse(skillRow.pattern)
      
      // Simple pattern refinement - could be made more sophisticated
      const refinedPattern = {
        ...currentPattern,
        recentExperiences: [
          ...(currentPattern.recentExperiences || []).slice(-4), // Keep last 5
          {
            context: experience.context,
            action: experience.action,
            outcome: experience.outcome,
            timestamp: new Date().toISOString()
          }
        ],
        successPatterns: this.extractSuccessPatterns(currentPattern, experience)
      }

      // Update the skill pattern
      const updateStmt = this.db.prepare(`
        UPDATE procedural_skills 
        SET pattern = ?, updated_at = ? 
        WHERE id = ?
      `)

      updateStmt.run(
        JSON.stringify(refinedPattern),
        new Date().toISOString(),
        skillId
      )

      logger.debug(`Refined pattern for skill ${skillId}`)
    } catch (error) {
      logger.error(`Failed to refine skill pattern for ${skillId}:`, error)
    }
  }

  private async createSkillFromExperience(
    personaId: string,
    experience: any
  ): Promise<void> {
    const skillName = this.generateSkillName(experience)
    
    const skill = {
      name: skillName,
      domain: experience.domain,
      pattern: {
        baseAction: experience.action,
        successConditions: experience.context,
        recentExperiences: [experience]
      },
      successRate: 0.7, // Start with moderate confidence
      contextConditions: experience.context,
      lastUsed: new Date()
    }

    await this.storeSkillPattern(personaId, skill)
    logger.debug(`Created new skill: ${skillName}`)
  }

  private generateSkillName(experience: any): string {
    const contextSummary = experience.context.slice(0, 2).join('_')
    const domain = experience.domain.replace(/\s+/g, '_')
    return `${domain}_${contextSummary}_skill`.toLowerCase()
  }

  private extractSuccessPatterns(currentPattern: any, experience: any): any {
    // Extract patterns that lead to success
    const patterns = currentPattern.successPatterns || {}
    
    if (experience.outcome === 'success') {
      experience.context.forEach((ctx: string) => {
        patterns[ctx] = (patterns[ctx] || 0) + 1
      })
    }

    return patterns
  }

  private async findConsolidationGroups(skills: ProceduralSkill[]): Promise<ProceduralSkill[][]> {
    const groups: ProceduralSkill[][] = []
    const processed = new Set<string>()

    for (const skill of skills) {
      if (processed.has(skill.id!)) continue

      const similarSkills: ProceduralSkill[] = [skill]
      processed.add(skill.id!)

      // Find skills with similar context and domain
      for (const other of skills) {
        if (processed.has(other.id!) || other.domain !== skill.domain) continue

        const similarity = this.calculateSkillSimilarity(skill, other)
        if (similarity > 0.7) { // High similarity threshold
          similarSkills.push(other)
          processed.add(other.id!)
        }
      }

      if (similarSkills.length > 1) {
        groups.push(similarSkills)
      }
    }

    return groups
  }

  private calculateSkillSimilarity(skill1: ProceduralSkill, skill2: ProceduralSkill): number {
    // Calculate similarity based on context and patterns
    const contextSimilarity = this.calculateContextSimilarity(
      skill1.contextConditions,
      skill2.contextConditions
    )

    // Simple name similarity
    const nameSimilarity = this.calculateNameSimilarity(skill1.name, skill2.name)

    return (contextSimilarity * 0.7) + (nameSimilarity * 0.3)
  }

  private calculateNameSimilarity(name1: string, name2: string): number {
    const words1 = new Set(name1.toLowerCase().split(/[_\s]+/))
    const words2 = new Set(name2.toLowerCase().split(/[_\s]+/))
    
    const intersection = new Set([...words1].filter(x => words2.has(x)))
    const union = new Set([...words1, ...words2])
    
    return union.size > 0 ? intersection.size / union.size : 0
  }

  private async mergeSkills(skills: ProceduralSkill[]): Promise<void> {
    if (skills.length < 2) return

    // Merge into the skill with highest success rate and usage
    const primary = skills.reduce((prev, current) => {
      const prevScore = prev.successRate * Math.log(prev.usageCount || 1)
      const currentScore = current.successRate * Math.log(current.usageCount || 1)
      return currentScore > prevScore ? current : prev
    })

    const others = skills.filter(s => s.id !== primary.id)

    // Merge patterns and statistics
    const mergedPattern = this.mergeSkillPatterns([primary, ...others])
    const mergedContexts = [...new Set([
      ...primary.contextConditions,
      ...others.flatMap(s => s.contextConditions)
    ])]

    // Calculate combined success rate (weighted average)
    const totalUsage = skills.reduce((sum, s) => sum + (s.usageCount || 1), 0)
    const weightedSuccessRate = skills.reduce((sum, s) => 
      sum + s.successRate * (s.usageCount || 1), 0
    ) / totalUsage

    // Update primary skill
    const stmt = this.db.prepare(`
      UPDATE procedural_skills 
      SET 
        pattern = ?, 
        context_conditions = ?,
        success_rate = ?,
        usage_count = ?,
        last_used = ?
      WHERE id = ?
    `)

    stmt.run(
      JSON.stringify(mergedPattern),
      JSON.stringify(mergedContexts),
      weightedSuccessRate,
      totalUsage,
      new Date().toISOString(),
      primary.id
    )

    // Delete the other skills
    const deleteStmt = this.db.prepare(`DELETE FROM procedural_skills WHERE id = ?`)
    for (const other of others) {
      deleteStmt.run(other.id)
    }

    logger.debug(`Merged ${others.length} skills into ${primary.id}`)
  }

  private mergeSkillPatterns(skills: ProceduralSkill[]): any {
    return {
      mergedFrom: skills.map(s => ({
        id: s.id,
        name: s.name,
        successRate: s.successRate
      })),
      combinedPatterns: skills.map(s => s.pattern),
      mergedAt: new Date().toISOString()
    }
  }

  private async pruneUnderperformingSkills(personaId: string): Promise<number> {
    const stmt = this.db.prepare(`
      DELETE FROM procedural_skills 
      WHERE persona_id = ? 
      AND success_rate < 0.2 
      AND usage_count < 3
      AND datetime(last_used) < datetime('now', '-30 days')
    `)

    const result = stmt.run(personaId)
    return result.changes
  }

  private formatSkillLevels(skillLevels: any[]): any {
    const result: any = { expert: 0, proficient: 0, developing: 0, novice: 0 }
    skillLevels.forEach(level => {
      result[level.skill_level] = level.count
    })
    return result
  }

  private async getSkillLearningTrends(personaId: string): Promise<any> {
    // Simple implementation - could be enhanced with more sophisticated trend analysis
    const stmt = this.db.prepare(`
      SELECT 
        domain,
        AVG(success_rate) as avg_success,
        COUNT(*) as skill_count,
        MAX(datetime(last_used)) as latest_use
      FROM procedural_skills 
      WHERE persona_id = ?
      GROUP BY domain
      ORDER BY latest_use DESC
    `)

    return stmt.all(personaId)
  }
}
