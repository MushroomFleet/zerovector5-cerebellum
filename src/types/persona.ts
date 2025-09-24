export interface PersonalityTrait {
  name: string
  value: number // 0-1 range
  description?: string
}

export interface ConsciousnessState {
  personaId: string
  selfAwareness: number // 0-1 range
  temporalContinuity: number // 0-1 range  
  socialCognition: number // 0-1 range
  metacognition: number // 0-1 range
  currentState: string // 'awake', 'sleeping', 'dreaming', etc.
  stateContext: any
  lastAwakening?: Date
  lastUpdated: Date
}

export interface PersonaProfile {
  id: string
  name: string
  description: string
  personalityTraits: PersonalityTrait[]
  consciousnessLevel?: number
  consciousnessState: ConsciousnessState
  timeAwake?: number // milliseconds
  lastSleep?: Date
  lastActive: Date
  createdAt: Date
  memoryStatistics?: any
}

export interface PersonaEvolution {
  personaId: string
  timestamp: Date
  evolutionType: 'personality' | 'consciousness' | 'memory'
  changes: any
  trigger: string
  impact: number
}

export interface SleepCycle {
  id: string
  personaId: string
  sleepType: 'light_processing' | 'deep_consolidation' | 'rem_integration' | 'extended_reorganization'
  duration: number // milliseconds
  timestamp: Date
  consolidationProcessed: boolean
  insights?: string[]
}

export interface PersonaActivity {
  personaId: string
  activityType: string
  timestamp: Date
  details: any
  impact: {
    consciousness?: Partial<ConsciousnessState>
    personality?: Array<{ trait: string; change: number }>
    memory?: { type: string; count: number }
  }
}

export interface PersonaMemoryContext {
  recentEpisodes: any[]
  timeAwake: number
  consciousnessState: ConsciousnessState
  currentMood?: string
  activeGoals?: string[]
}

export interface PersonaExperience {
  type: string
  content: any
  context?: any
  importance?: number
  emotionalValence?: number
  tags?: string[]
  knowledge?: any
}
