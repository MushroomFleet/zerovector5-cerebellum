export interface EpisodicMemoryEntry {
  id?: string
  timestamp: Date
  eventType: string
  content: any
  context: any
  emotionalValence: number
  importanceScore: number
  participants?: string[]
  location?: string
}

export interface SemanticKnowledge {
  id?: string
  domain: string
  concept: string
  content: any
  confidenceLevel: number
  source?: string
  relationships?: string[]
}

export interface ProceduralSkill {
  id?: string
  name: string
  domain: string
  pattern: any
  successRate: number
  contextConditions: string[]
  usageCount?: number
  lastUsed?: Date
}

export interface MemorySearchResult {
  id: string
  content: any
  relevanceScore: number
  timestamp: Date
  type: 'episodic' | 'semantic' | 'procedural'
  metadata: any
}

export interface KnowledgeNode {
  id: string
  concept: string
  domain: string
  content: any
  connections: string[]
  strength: number
}

export interface MemoryConsolidationResult {
  consolidatedCount: number
  patternsIdentified: string[]
  importanceAdjustments: Array<{
    memoryId: string
    oldScore: number
    newScore: number
    reason: string
  }>
  insights: string[]
}

export interface MemoryStats {
  totalEpisodes: number
  totalKnowledge: number
  totalSkills: number
  averageImportance: number
  memoryTypes: Record<string, number>
  consolidationStatus: {
    pending: number
    processed: number
    lastConsolidation: Date
  }
}
