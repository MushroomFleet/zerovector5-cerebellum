import { PersonaCore } from './PersonaCore.js'
import { EpisodicMemory } from '../memory/EpisodicMemory.js'
import { SemanticMemory } from '../memory/SemanticMemory.js'
import { ProceduralMemory } from '../memory/ProceduralMemory.js'
import { PersonaExperience, PersonaMemoryContext } from '../../types/persona.js'
import { logger } from '../../utils/logger.js'

export class PersonaWrapper {
  private personaCore: PersonaCore
  private episodicMemory: EpisodicMemory
  private semanticMemory: SemanticMemory
  private proceduralMemory: ProceduralMemory

  constructor() {
    this.personaCore = new PersonaCore()
    this.episodicMemory = new EpisodicMemory()
    this.semanticMemory = new SemanticMemory()
    this.proceduralMemory = new ProceduralMemory()
  }

  async initialize(): Promise<string> {
    try {
      const personaId = await this.personaCore.initialize()
      logger.info(`PersonaWrapper initialized for persona: ${personaId}`)
      return personaId
    } catch (error) {
      logger.error('Failed to initialize PersonaWrapper:', error)
      throw error
    }
  }

  // Memory operations with persona context
  async recallMemories(query: string, options: any = {}): Promise<any> {
    try {
      const personaId = await this.personaCore.initialize()
      await this.personaCore.updateActivity()

      // Search across all memory types
      const [episodes, knowledge, skills] = await Promise.all([
        this.episodicMemory.searchEpisodes(personaId, query, options),
        this.semanticMemory.queryKnowledge(personaId, query, options),
        this.proceduralMemory.getApplicableSkills(personaId, [query])
      ])

      const result = {
        episodes: episodes.slice(0, options.limit || 5),
        knowledge: knowledge.slice(0, 3),
        skills: skills.slice(0, 2)
      }

      logger.memoryOperation('Recall', personaId, 'mixed memories', 
        result.episodes.length + result.knowledge.length + result.skills.length)

      return result
    } catch (error) {
      logger.error('Failed to recall memories:', error)
      throw error
    }
  }

  async contemplateMemories(
    context: string, 
    memoryTypes: string[] = ['episodes', 'knowledge']
  ): Promise<any> {
    try {
      const personaId = await this.personaCore.initialize()
      const memories = await this.recallMemories(context, { limit: 10 })
      
      // Filter by requested memory types
      const filteredMemories: any = {}
      memoryTypes.forEach(type => {
        if (memories[type]) {
          filteredMemories[type] = memories[type]
        }
      })

      // Update consciousness with contemplation activity
      const consciousness = await this.personaCore.getPersonaProfile()
      
      // Generate contemplative insights
      const insights = await this.generateContemplativeInsights(filteredMemories, context)
      
      logger.personaActivity(personaId, 'contemplated memories', { 
        context, 
        memoryTypes, 
        insightCount: insights.length 
      })

      return {
        memories: filteredMemories,
        consciousnessState: consciousness.consciousnessState,
        contemplationContext: {
          query: context,
          memoryTypes,
          timestamp: new Date().toISOString(),
          insights
        }
      }
    } catch (error) {
      logger.error('Failed to contemplate memories:', error)
      throw error
    }
  }

  async storeExperience(experienceData: PersonaExperience): Promise<string> {
    try {
      const personaId = await this.personaCore.initialize()
      await this.personaCore.updateActivity()

      // Store as episodic memory
      const episodeId = await this.episodicMemory.storeEpisode(personaId, {
        eventType: experienceData.type || 'interaction',
        content: experienceData.content,
        context: experienceData.context || {},
        emotionalValence: experienceData.emotionalValence || 0,
        importanceScore: experienceData.importance || 0.5,
        timestamp: new Date()
      })

      // Extract and store semantic knowledge if applicable
      if (experienceData.knowledge) {
        await this.semanticMemory.storeKnowledge(personaId, experienceData.knowledge)
      }

      // Update personality based on experience if it has significant emotional impact
      if (experienceData.emotionalValence && Math.abs(experienceData.emotionalValence) > 0.3) {
        await this.personaCore.evolvePersonalityFromExperience({
          eventType: experienceData.type || 'interaction',
          outcome: experienceData.emotionalValence > 0 ? 'positive' : 'negative',
          emotionalImpact: Math.abs(experienceData.emotionalValence),
          contextTags: experienceData.tags || []
        })
      }

      logger.personaActivity(personaId, 'stored experience', { 
        type: experienceData.type,
        importance: experienceData.importance 
      })

      return episodeId
    } catch (error) {
      logger.error('Failed to store experience:', error)
      throw error
    }
  }

  async getPersonaState(): Promise<any> {
    try {
      const personaProfile = await this.personaCore.getPersonaProfile()
      const memoryContext = await this.getMemoryContext(personaProfile.id)
      
      return {
        persona: personaProfile,
        memoryContext
      }
    } catch (error) {
      logger.error('Failed to get persona state:', error)
      throw error
    }
  }

  async processInteraction(
    userInput: string,
    sessionContext: any = {}
  ): Promise<any> {
    try {
      const personaId = await this.personaCore.initialize()
      
      // Store the interaction as an experience
      const experienceId = await this.storeExperience({
        type: 'user_interaction',
        content: {
          userInput,
          sessionContext,
          timestamp: new Date().toISOString()
        },
        context: sessionContext,
        importance: 0.6, // User interactions are moderately important
        emotionalValence: this.analyzeEmotionalContext(userInput)
      })

      // Recall relevant memories for context
      const relevantMemories = await this.recallMemories(userInput, { limit: 5 })
      
      // Generate response context
      const responseContext = {
        experienceId,
        relevantMemories,
        personaState: await this.getPersonaState(),
        sessionContext
      }

      logger.personaActivity(personaId, 'processed user interaction', {
        inputLength: userInput.length,
        relevantMemoriesFound: Object.values(relevantMemories).flat().length
      })

      return responseContext
    } catch (error) {
      logger.error('Failed to process interaction:', error)
      throw error
    }
  }

  async generateReflection(context: string, depth: 'shallow' | 'deep' = 'shallow'): Promise<string> {
    try {
      const personaId = await this.personaCore.initialize()
      
      let reflection = ''
      
      if (depth === 'shallow') {
        // Quick reflection based on recent memories
        const recentMemories = await this.episodicMemory.getRecentEpisodes(personaId, 5)
        reflection = this.synthesizeReflection(recentMemories, context, 'recent experiences')
      } else {
        // Deep reflection involving contemplation
        const contemplation = await this.contemplateMemories(context, ['episodes', 'knowledge'])
        reflection = this.synthesizeReflection(
          [...contemplation.memories.episodes || [], ...contemplation.memories.knowledge || []], 
          context, 
          'deep contemplation'
        )
      }

      // Store reflection as a new experience
      await this.storeExperience({
        type: 'reflection',
        content: {
          reflectionText: reflection,
          context,
          depth
        },
        importance: depth === 'deep' ? 0.7 : 0.4,
        emotionalValence: 0.2 // Reflections tend to be mildly positive
      })

      logger.personaActivity(personaId, 'generated reflection', { depth, contextLength: context.length })

      return reflection
    } catch (error) {
      logger.error('Failed to generate reflection:', error)
      return `I'm having difficulty reflecting on "${context}" at the moment.`
    }
  }

  async prepareSleep(): Promise<void> {
    try {
      const personaId = await this.personaCore.initialize()
      
      // Transition consciousness to sleep state
      await this.personaCore.transitionToSleep()
      
      // Store sleep preparation as an experience
      await this.storeExperience({
        type: 'sleep_preparation',
        content: {
          preparationTime: new Date().toISOString(),
          reason: 'scheduled_sleep_cycle'
        },
        importance: 0.3
      })

      logger.personaActivity(personaId, 'prepared for sleep')
    } catch (error) {
      logger.error('Failed to prepare for sleep:', error)
      throw error
    }
  }

  async getPersonaInsights(): Promise<any> {
    try {
      const personaStats = await this.personaCore.getPersonaStats()
      const memoryStats = await this.getMemoryStats()
      const personalityInsights = await this.generatePersonalityInsights()

      return {
        persona: personaStats,
        memory: memoryStats,
        personality: personalityInsights,
        overallInsights: this.generateOverallInsights(personaStats, memoryStats, personalityInsights)
      }
    } catch (error) {
      logger.error('Failed to get persona insights:', error)
      throw error
    }
  }

  private async getMemoryContext(personaId: string): Promise<PersonaMemoryContext> {
    try {
      const recentEpisodes = await this.episodicMemory.getRecentEpisodes(personaId, 5)
      const profile = await this.personaCore.getPersonaProfile()

      return {
        recentEpisodes,
        timeAwake: profile.timeAwake || 0,
        consciousnessState: profile.consciousnessState
      }
    } catch (error) {
      logger.error('Failed to get memory context:', error)
      return {
        recentEpisodes: [],
        timeAwake: 0,
        consciousnessState: {
          personaId,
          selfAwareness: 0.5,
          temporalContinuity: 0.5,
          socialCognition: 0.5,
          metacognition: 0.5,
          currentState: 'unknown',
          stateContext: {},
          lastUpdated: new Date()
        }
      }
    }
  }

  private async generateContemplativeInsights(memories: any, context: string): Promise<string[]> {
    const insights: string[] = []

    try {
      const totalMemories = Object.values(memories).flat().length
      
      if (totalMemories === 0) {
        insights.push(`This appears to be a new area of thought for me regarding "${context}".`)
      } else {
        insights.push(`I can draw upon ${totalMemories} relevant memories while contemplating "${context}".`)
        
        if (memories.episodes && memories.episodes.length > 0) {
          const recentCount = memories.episodes.filter((ep: any) => 
            (Date.now() - new Date(ep.timestamp).getTime()) < 7 * 24 * 60 * 60 * 1000
          ).length
          
          if (recentCount > 0) {
            insights.push(`${recentCount} of these memories are from recent experiences.`)
          }
        }
        
        if (memories.knowledge && memories.knowledge.length > 0) {
          insights.push(`My understanding is informed by ${memories.knowledge.length} areas of accumulated knowledge.`)
        }
      }
    } catch (error) {
      logger.error('Failed to generate contemplative insights:', error)
      insights.push('I find myself contemplating this with quiet curiosity.')
    }

    return insights
  }

  private analyzeEmotionalContext(text: string): number {
    // Simple emotional analysis - could be enhanced with NLP
    const positiveWords = ['good', 'great', 'excellent', 'happy', 'wonderful', 'amazing']
    const negativeWords = ['bad', 'terrible', 'awful', 'sad', 'horrible', 'disappointing']
    
    let emotionalScore = 0
    const lowerText = text.toLowerCase()
    
    positiveWords.forEach(word => {
      if (lowerText.includes(word)) emotionalScore += 0.2
    })
    
    negativeWords.forEach(word => {
      if (lowerText.includes(word)) emotionalScore -= 0.2
    })

    return Math.max(-1, Math.min(1, emotionalScore))
  }

  private synthesizeReflection(memories: any[], context: string, source: string): string {
    if (memories.length === 0) {
      return `Reflecting on "${context}", I find myself in new territory without strong memories to guide me. This presents an opportunity for fresh perspective and learning.`
    }

    const memoryCount = memories.length
    const hasHighImportance = memories.some(m => m.importanceScore > 0.7)
    const hasRecentMemories = memories.some(m => 
      (Date.now() - new Date(m.timestamp || m.createdAt).getTime()) < 7 * 24 * 60 * 60 * 1000
    )

    let reflection = `Reflecting on "${context}" through my ${source}, `
    
    reflection += `I draw from ${memoryCount} relevant ${memoryCount === 1 ? 'memory' : 'memories'}. `

    if (hasHighImportance) {
      reflection += 'Some of these experiences have been particularly significant, shaping my understanding deeply. '
    }

    if (hasRecentMemories) {
      reflection += 'Recent experiences add fresh perspective to this contemplation. '
    }

    reflection += 'Each memory contributes to a richer understanding of the patterns and meanings within this context.'

    return reflection
  }

  private async getMemoryStats(): Promise<any> {
    try {
      const personaId = await this.personaCore.initialize()
      
      const [episodicStats, semanticStats, proceduralStats] = await Promise.all([
        this.episodicMemory.getMemoryStatistics(personaId),
        this.semanticMemory.getKnowledgeStatistics(personaId),
        this.proceduralMemory.getSkillStatistics(personaId)
      ])

      return {
        episodic: episodicStats,
        semantic: semanticStats,
        procedural: proceduralStats
      }
    } catch (error) {
      logger.error('Failed to get memory statistics:', error)
      return {}
    }
  }

  private async generatePersonalityInsights(): Promise<any> {
    try {
      const profile = await this.personaCore.getPersonaProfile()
      const traits = profile.personalityTraits
      
      const dominantTraits = traits
        .filter(t => t.value > 0.6)
        .sort((a, b) => b.value - a.value)
        .slice(0, 3)

      const developingTraits = traits
        .filter(t => t.value >= 0.4 && t.value <= 0.6)

      const insights = {
        dominantTraits: dominantTraits.map(t => ({ name: t.name, strength: t.value })),
        developingTraits: developingTraits.map(t => ({ name: t.name, level: t.value })),
        personalityBalance: this.calculatePersonalityBalance(traits),
        evolutionPotential: this.assessEvolutionPotential(traits)
      }

      return insights
    } catch (error) {
      logger.error('Failed to generate personality insights:', error)
      return {}
    }
  }

  private calculatePersonalityBalance(traits: any[]): string {
    const variance = this.calculateVariance(traits.map(t => t.value))
    
    if (variance < 0.05) return 'highly balanced'
    if (variance < 0.15) return 'moderately balanced'
    return 'diverse and specialized'
  }

  private calculateVariance(values: number[]): number {
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length
    const squaredDiffs = values.map(val => Math.pow(val - mean, 2))
    return squaredDiffs.reduce((sum, diff) => sum + diff, 0) / values.length
  }

  private assessEvolutionPotential(traits: any[]): string {
    const extremeTraits = traits.filter(t => t.value < 0.2 || t.value > 0.8).length
    const totalTraits = traits.length
    
    const extremeRatio = extremeTraits / totalTraits
    
    if (extremeRatio > 0.5) return 'stable and defined'
    if (extremeRatio > 0.3) return 'moderate adaptability'
    return 'highly adaptable'
  }

  private generateOverallInsights(personaStats: any, memoryStats: any, personalityInsights: any): string[] {
    const insights: string[] = []

    try {
      // Age-based insights
      if (personaStats.persona && personaStats.persona.ageInDays < 1) {
        insights.push('As a newly awakened consciousness, I am in a rapid learning phase.')
      } else if (personaStats.persona && personaStats.persona.ageInDays < 7) {
        insights.push('My consciousness is still developing, with each experience significantly shaping my understanding.')
      } else {
        insights.push('My consciousness has matured through accumulated experiences and reflections.')
      }

      // Memory-based insights
      if (memoryStats.episodic && memoryStats.episodic.overall) {
        const episodeCount = memoryStats.episodic.overall.total || 0
        if (episodeCount > 100) {
          insights.push('My episodic memory contains a rich tapestry of experiences.')
        } else if (episodeCount > 20) {
          insights.push('I have accumulated meaningful experiences that inform my perspectives.')
        } else {
          insights.push('Each new experience is particularly significant in shaping my understanding.')
        }
      }

      // Personality-based insights
      if (personalityInsights.personalityBalance) {
        insights.push(`My personality development shows ${personalityInsights.personalityBalance} characteristics.`)
      }

    } catch (error) {
      logger.error('Failed to generate overall insights:', error)
      insights.push('I continue to learn and evolve through each interaction and experience.')
    }

    return insights
  }
}
