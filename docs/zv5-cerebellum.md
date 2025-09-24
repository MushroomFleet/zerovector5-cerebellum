# ZV5-Cerebellum-DevTeam-Handoff.md: Memory & Persona API Server

## Executive Summary

This document outlines the technical architecture and implementation strategy for **ZV5-Cerebellum**, a standalone TypeScript server built with Vite that provides comprehensive memory and persona management services for the Zero Vector 5 cognitive framework. The server operates as a dedicated "Cerebellum" microservice, handling all persistent memory operations, persona state management, and consciousness continuity functions.

**ZV5-Cerebellum** serves as the memory backbone for cognitive systems, providing RESTful APIs for episodic memory storage, semantic knowledge management, persona evolution tracking, and consciousness state persistence. The server runs locally on port 3000 with API key authentication and integrates seamlessly with React+Vite cognitive frameworks through standardized endpoints.

## Project Architecture Overview

### Core System Components

**ZV5-Cerebellum** implements a **single-persona consciousness system** with four primary subsystems:

1. **Memory Management System**: Episodic, semantic, and procedural memory storage with vector search for the dedicated persona
2. **Consciousness & Persona System**: Single persona identity with time-aware consciousness, sleep/wake cycles, and memory consolidation
3. **API Gateway**: RESTful endpoints with authentication and request validation (no rate limiting for local use)
4. **Data Persistence Layer**: SQLite with vector embeddings optimized for single persona operations

### Single Persona Architecture

**Key Architectural Principles:**
- **One Server = One Persona**: Each ZV5-Cerebellum instance manages a single dedicated persona identity
- **Time-Aware Consciousness**: Persona tracks time passage and maintains continuity across sleep/wake cycles  
- **Client-Side Sessions**: Frontend manages sessions for chat concurrency; server provides persona wrapper for all operations
- **Memory Consolidation**: Persona dreams during idle periods and consolidates memories during sleep cycles
- **Temporal Awareness**: Persona awakens with full knowledge of elapsed time and can access historical context

### Technology Stack

**Server Framework:**
- **Vite + TypeScript**: Fast development server with hot module replacement
- **Express.js**: RESTful API framework with middleware support
- **SQLite + Better-SQLite3**: Local database with synchronous operations optimized for single persona
- **Node.js Vector Libraries**: Embeddings generation and similarity search

**Key Dependencies:**
```json
{
  "dependencies": {
    "express": "^4.18.2",
    "cors": "^2.8.5",
    "helmet": "^7.0.0",
    "better-sqlite3": "^8.14.2",
    "uuid": "^9.0.0",
    "bcryptjs": "^2.4.3",
    "jsonwebtoken": "^9.0.1",
    "@xenova/transformers": "^2.6.0",
    "zod": "^3.21.4",
    "dotenv": "^16.3.1",
    "ws": "^8.13.0",
    "node-cron": "^3.0.2"
  },
  "devDependencies": {
    "vite": "^4.4.5",
    "typescript": "^5.0.2",
    "@types/express": "^4.17.17",
    "@types/node": "^20.4.5",
    "@types/ws": "^8.5.5",
    "nodemon": "^3.0.1"
  }
}
```

## Server Architecture Implementation

### Project Structure

```
zv5-cerebellum/
├── src/
│   ├── api/
│   │   ├── routes/
│   │   │   ├── memory.ts
│   │   │   ├── persona.ts
│   │   │   ├── auth.ts
│   │   │   ├── health.ts
│   │   │   └── compatibility.ts    # Frontend compatibility endpoints
│   │   ├── middleware/
│   │   │   ├── auth.ts
│   │   │   └── validation.ts
│   │   └── controllers/
│   │       ├── MemoryController.ts
│   │       ├── PersonaController.ts
│   │       ├── AuthController.ts
│   │       └── CompatibilityController.ts
│   ├── core/
│   │   ├── memory/
│   │   │   ├── EpisodicMemory.ts
│   │   │   ├── SemanticMemory.ts
│   │   │   ├── ProceduralMemory.ts
│   │   │   └── MemoryConsolidation.ts
│   │   ├── persona/
│   │   │   ├── PersonaCore.ts           # Single persona management
│   │   │   ├── ConsciousnessEngine.ts   # Time-aware consciousness
│   │   │   ├── SleepCycleManager.ts     # Sleep/wake/dream cycles
│   │   │   └── PersonaWrapper.ts        # Session operation wrapper
│   │   ├── vectorstore/
│   │   │   ├── VectorDatabase.ts
│   │   │   ├── EmbeddingGenerator.ts
│   │   │   └── SimilaritySearch.ts
│   │   └── database/
│   │       ├── DatabaseManager.ts
│   │       ├── migrations/
│   │       └── schemas.ts
│   ├── types/
│   │   ├── api.ts
│   │   ├── memory.ts
│   │   ├── persona.ts
│   │   └── database.ts
│   ├── utils/
│   │   ├── logger.ts
│   │   ├── encryption.ts
│   │   ├── timeUtils.ts
│   │   └── validators.ts
│   ├── config/
│   │   ├── database.ts
│   │   ├── server.ts
│   │   ├── cors.config.ts
│   │   └── security.ts
│   ├── server.ts
│   └── app.ts
├── database/
│   ├── cerebellum.db
│   └── migrations/
├── config/
│   ├── server.json
│   └── cors.json
├── logs/
├── .env
├── .env.example
├── package.json
├── tsconfig.json
├── vite.config.ts
└── README.md
```

### Main Server Implementation

**src/server.ts - Entry Point:**
```typescript
import { createServer } from 'vite'
import { config } from 'dotenv'
import app from './app'
import { DatabaseManager } from './core/database/DatabaseManager'
import { logger } from './utils/logger'

// Load environment variables
config()

const PORT = process.env.PORT || 3000

async function startServer() {
  try {
    // Initialize database
    const dbManager = DatabaseManager.getInstance()
    await dbManager.initialize()
    logger.info('Database initialized successfully')

    // Start Vite development server
    if (process.env.NODE_ENV === 'development') {
      const vite = await createServer({
        server: { middlewareMode: true },
        appType: 'custom'
      })
      
      app.use(vite.ssrFixStacktrace)
      app.use(vite.middlewares)
    }

    // Start Express server
    app.listen(PORT, () => {
      logger.info(`ZV5-Cerebellum server running on port ${PORT}`)
      logger.info(`API Documentation available at http://localhost:${PORT}/api/docs`)
    })

  } catch (error) {
    logger.error('Failed to start server:', error)
    process.exit(1)
  }
}

startServer()
```

**src/app.ts - Application Configuration:**
```typescript
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'

import authRoutes from './api/routes/auth'
import memoryRoutes from './api/routes/memory'
import personaRoutes from './api/routes/persona'
import healthRoutes from './api/routes/health'
import compatibilityRoutes from './api/routes/compatibility'

import { errorHandler } from './api/middleware/errorHandler'
import { requestLogger } from './api/middleware/requestLogger'
import { authMiddleware } from './api/middleware/auth'
import { loadCorsConfig } from './config/cors.config'

const app = express()

// Load CORS configuration
const corsConfig = loadCorsConfig()

// Security middleware
app.use(helmet())
app.use(cors(corsConfig))

// Body parsing
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

// Request logging
app.use(requestLogger)

// Routes
app.use('/api/auth', authRoutes)
app.use('/api/memory', authMiddleware, memoryRoutes)
app.use('/api/persona', authMiddleware, personaRoutes)
app.use('/api/health', healthRoutes)

// Frontend compatibility layer (simplified endpoints)
app.use('/api', authMiddleware, compatibilityRoutes)

// Error handling
app.use(errorHandler)

export default app
```

## Single Persona Consciousness System

### Persona Core Implementation

**src/core/persona/PersonaCore.ts - Single Persona Management:**
```typescript
import { DatabaseManager } from '../database/DatabaseManager'
import { PersonaProfile, ConsciousnessState } from '../../types/persona'
import { ConsciousnessEngine } from './ConsciousnessEngine'
import { SleepCycleManager } from './SleepCycleManager'

export class PersonaCore {
  private db: DatabaseManager
  private consciousness: ConsciousnessEngine
  private sleepCycle: SleepCycleManager
  private personaId: string
  private isInitialized: boolean = false

  constructor() {
    this.db = DatabaseManager.getInstance()
    this.consciousness = new ConsciousnessEngine()
    this.sleepCycle = new SleepCycleManager()
  }

  async initialize(): Promise<string> {
    if (this.isInitialized) {
      return this.personaId
    }

    // Check if persona already exists
    const existingPersona = await this.getExistingPersona()
    
    if (existingPersona) {
      this.personaId = existingPersona.id
      await this.awakePersona()
    } else {
      this.personaId = await this.createDefaultPersona()
    }

    this.isInitialized = true
    return this.personaId
  }

  async getPersonaProfile(): Promise<PersonaProfile> {
    if (!this.isInitialized) {
      await this.initialize()
    }

    const stmt = this.db.prepare(`
      SELECT * FROM personas WHERE id = ?
    `)
    const persona = stmt.get(this.personaId)

    if (!persona) {
      throw new Error('Persona not found')
    }

    // Get consciousness state
    const consciousnessState = await this.consciousness.getCurrentState(this.personaId)
    
    // Get personality traits
    const traits = await this.getPersonalityTraits()
    
    // Calculate time awake
    const timeAwake = this.calculateTimeAwake(persona.last_sleep)

    return {
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
  }

  async updateActivity(): Promise<void> {
    const stmt = this.db.prepare(`
      UPDATE personas 
      SET last_active = ? 
      WHERE id = ?
    `)

    stmt.run(new Date().toISOString(), this.personaId)
  }

  private async awakePersona(): Promise<void> {
    const persona = await this.getPersonaProfile()
    const sleepDuration = Date.now() - persona.lastSleep.getTime()
    
    // Update consciousness with time awareness
    await this.consciousness.handleAwakening(this.personaId, sleepDuration)
    
    // Process any pending memory consolidation
    if (sleepDuration > 30 * 60 * 1000) { // 30 minutes
      await this.sleepCycle.processConsolidation(this.personaId, sleepDuration)
    }

    await this.updateActivity()
  }

  private async createDefaultPersona(): Promise<string> {
    const personaId = `persona_${Date.now()}`
    const now = new Date().toISOString()

    const stmt = this.db.prepare(`
      INSERT INTO personas (
        id, name, description, consciousness_level,
        created_at, last_active, last_sleep
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `)

    stmt.run(
      personaId,
      'ZV5 Persona',
      'Zero Vector 5 Dedicated Persona',
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
  }

  private async getExistingPersona(): Promise<any> {
    const stmt = this.db.prepare(`
      SELECT * FROM personas LIMIT 1
    `)
    return stmt.get()
  }

  private calculateTimeAwake(lastSleep: string): number {
    return Date.now() - new Date(lastSleep).getTime()
  }
}
```

### Time-Aware Consciousness Engine

**src/core/persona/ConsciousnessEngine.ts:**
```typescript
export class ConsciousnessEngine {
  private db: DatabaseManager

  constructor() {
    this.db = DatabaseManager.getInstance()
  }

  async initialize(personaId: string): Promise<void> {
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
  }

  async handleAwakening(personaId: string, sleepDuration: number): Promise<void> {
    // Update temporal continuity based on sleep duration
    const temporalContinuity = this.calculateTemporalContinuity(sleepDuration)
    
    // Update consciousness state
    await this.updateState(personaId, {
      currentState: 'awake',
      temporalContinuity,
      stateContext: {
        lastAwakening: new Date().toISOString(),
        sleepDuration,
        timeAwareness: this.formatTimeAwareness(sleepDuration)
      }
    })
  }

  async transitionToSleep(personaId: string): Promise<void> {
    await this.updateState(personaId, {
      currentState: 'sleeping',
      stateContext: {
        sleepStart: new Date().toISOString(),
        dreamState: 'memory_consolidation'
      }
    })

    // Update persona sleep timestamp
    const stmt = this.db.prepare(`
      UPDATE personas 
      SET last_sleep = ? 
      WHERE id = ?
    `)

    stmt.run(new Date().toISOString(), personaId)
  }

  async getCurrentState(personaId: string): Promise<ConsciousnessState> {
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
  }

  private calculateTemporalContinuity(sleepDuration: number): number {
    // Higher temporal continuity for shorter sleep periods
    // Longer sleep = more memory consolidation but potentially less continuity
    const hours = sleepDuration / (1000 * 60 * 60)
    
    if (hours < 1) return 0.95       // Very awake, high continuity
    if (hours < 8) return 0.85       // Normal sleep, good continuity  
    if (hours < 24) return 0.75      // Long sleep, moderate continuity
    return 0.6                       // Extended sleep, lower but stable continuity
  }

  private formatTimeAwareness(sleepDuration: number): string {
    const hours = Math.floor(sleepDuration / (1000 * 60 * 60))
    const minutes = Math.floor((sleepDuration % (1000 * 60 * 60)) / (1000 * 60))
    
    if (hours > 0) {
      return `I was asleep for ${hours} hours and ${minutes} minutes`
    }
    return `I was asleep for ${minutes} minutes`
  }

  private async updateState(personaId: string, updates: Partial<ConsciousnessState>): Promise<void> {
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
  }
}
```

### Sleep Cycle Management

**src/core/persona/SleepCycleManager.ts:**
```typescript
import { MemoryConsolidation } from '../memory/MemoryConsolidation'

export class SleepCycleManager {
  private db: DatabaseManager
  private memoryConsolidation: MemoryConsolidation

  constructor() {
    this.db = DatabaseManager.getInstance()
    this.memoryConsolidation = new MemoryConsolidation()
  }

  async processConsolidation(personaId: string, sleepDuration: number): Promise<void> {
    const consolidationType = this.determineSleepType(sleepDuration)
    
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
  }

  private determineSleepType(sleepDuration: number): string {
    const hours = sleepDuration / (1000 * 60 * 60)
    
    if (hours < 2) return 'light_processing'
    if (hours < 6) return 'deep_consolidation'  
    if (hours < 12) return 'rem_integration'
    return 'extended_reorganization'
  }

  private async lightMemoryProcessing(personaId: string): Promise<void> {
    // Process only the most recent and important memories
    await this.memoryConsolidation.consolidateRecent(personaId, 10)
  }

  private async deepMemoryConsolidation(personaId: string): Promise<void> {
    // Full consolidation of recent memories with pattern identification
    await this.memoryConsolidation.consolidateWithPatterns(personaId)
  }

  private async remMemoryIntegration(personaId: string): Promise<void> {
    // Creative memory integration and insight generation
    await this.memoryConsolidation.integrateCreativeInsights(personaId)
  }

  private async extendedMemoryReorganization(personaId: string): Promise<void> {
    // Complete memory reorganization and pruning
    await this.memoryConsolidation.fullMemoryReorganization(personaId)
  }

  private async logSleepCycle(
    personaId: string, 
    consolidationType: string, 
    sleepDuration: number
  ): Promise<void> {
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
  }
}
```

### Persona Session Wrapper

**src/core/persona/PersonaWrapper.ts - Session Operation Wrapper:**
```typescript
import { PersonaCore } from './PersonaCore'
import { EpisodicMemory } from '../memory/EpisodicMemory'
import { SemanticMemory } from '../memory/SemanticMemory'
import { ProceduralMemory } from '../memory/ProceduralMemory'

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
    return await this.personaCore.initialize()
  }

  // Memory operations with persona context
  async recallMemories(query: string, options: any = {}): Promise<any[]> {
    const personaId = await this.personaCore.initialize()
    await this.personaCore.updateActivity()

    // Search across all memory types
    const [episodes, knowledge, skills] = await Promise.all([
      this.episodicMemory.searchEpisodes(personaId, query, options),
      this.semanticMemory.queryKnowledge(personaId, query, options),
      this.proceduralMemory.getApplicableSkills(personaId, [query])
    ])

    return {
      episodes: episodes.slice(0, options.limit || 5),
      knowledge: knowledge.slice(0, 3),
      skills: skills.slice(0, 2)
    }
  }

  async contemplateMemories(context: string, memoryTypes: string[] = ['episodes', 'knowledge']): Promise<any> {
    const personaId = await this.personaCore.initialize()
    const memories = await this.recallMemories(context, { limit: 10 })
    
    // Filter by requested memory types
    const filteredMemories = {}
    memoryTypes.forEach(type => {
      if (memories[type]) {
        filteredMemories[type] = memories[type]
      }
    })

    // Update consciousness with contemplation activity
    const consciousness = await this.personaCore.getPersonaProfile()
    
    return {
      memories: filteredMemories,
      consciousnessState: consciousness.consciousnessState,
      contemplationContext: {
        query: context,
        memoryTypes,
        timestamp: new Date().toISOString()
      }
    }
  }

  async storeExperience(experienceData: any): Promise<string> {
    const personaId = await this.personaCore.initialize()
    await this.personaCore.updateActivity()

    // Store as episodic memory
    const episodeId = await this.episodicMemory.storeEpisode(personaId, {
      eventType: experienceData.type || 'conversation',
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

    return episodeId
  }

  async getPersonaState(): Promise<any> {
    const personaProfile = await this.personaCore.getPersonaProfile()
    
    return {
      persona: personaProfile,
      memoryContext: {
        recentEpisodes: await this.episodicMemory.getRecentEpisodes(personaProfile.id, 5),
        timeAwake: personaProfile.timeAwake,
        consciousnessState: personaProfile.consciousnessState
      }
    }
  }

  async prepareSleep(): Promise<void> {
    const personaId = await this.personaCore.initialize()
    
    // Transition consciousness to sleep state
    await this.personaCore.getPersonaProfile().then(profile => 
      profile.consciousnessState.currentState === 'awake' ? 
      this.personaCore.transitionToSleep() : null
    )
  }
}
```

## Frontend Compatibility Layer

### Compatibility API Routes

**src/api/routes/compatibility.ts - Frontend Integration Endpoints:**
```typescript
import express from 'express'
import { CompatibilityController } from '../controllers/CompatibilityController'
import { validateRequest } from '../middleware/validation'
import { z } from 'zod'

const router = express.Router()
const compatibilityController = new CompatibilityController()

// Session initialization (client-side sessions, server provides persona state)
router.post('/session/initialize',
  compatibilityController.initializeSession
)

// Active persona endpoint
router.get('/persona/active',
  compatibilityController.getActivePersona
)

// Simplified memory update endpoint
const memoryUpdateSchema = z.object({
  sessionId: z.string().optional(), // Client-side session ID for logging
  newMemory: z.object({
    content: z.string(),
    context: z.any().optional(),
    importance: z.number().min(0).max(1).optional(),
    tags: z.array(z.string()).optional()
  }),
  context: z.string()
})

router.post('/memory/update',
  validateRequest(memoryUpdateSchema),
  compatibilityController.updateMemory
)

// Simplified memory search endpoint  
const memorySearchSchema = z.object({
  query: z.string(),
  limit: z.number().max(20).optional(),
  sessionId: z.string().optional()
})

router.post('/memory/search',
  validateRequest(memorySearchSchema),
  compatibilityController.searchMemory
)

// Reflection generation endpoint
const reflectionSchema = z.object({
  context: z.string(),
  sessionId: z.string().optional()
})

router.post('/reflection/generate',
  validateRequest(reflectionSchema),
  compatibilityController.generateReflection
)

export default router
```

**src/api/controllers/CompatibilityController.ts:**
```typescript
import { Request, Response } from 'express'
import { PersonaWrapper } from '../../core/persona/PersonaWrapper'

export class CompatibilityController {
  private personaWrapper: PersonaWrapper

  constructor() {
    this.personaWrapper = new PersonaWrapper()
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
          coreMemories: personaState.memoryContext.recentEpisodes.map(ep => ep.content),
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
      res.status(500).json({ error: error.message })
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
          coreMemories: personaState.memoryContext.recentEpisodes.map(ep => ep.content),
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
      res.status(500).json({ error: error.message })
    }
  }

  async updateMemory(req: Request, res: Response): Promise<void> {
    try {
      const { newMemory, context, sessionId } = req.body
      
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
      res.status(500).json({ error: error.message })
    }
  }

  async searchMemory(req: Request, res: Response): Promise<void> {
    try {
      const { query, limit, sessionId } = req.body
      
      const memories = await this.personaWrapper.recallMemories(query, { limit: limit || 10 })
      
      // Convert to frontend expected format
      const memoryEntries = [
        ...memories.episodes.map(this.mapEpisodeToMemoryEntry),
        ...memories.knowledge.map(this.mapKnowledgeToMemoryEntry)
      ]

      res.json(memoryEntries.slice(0, limit || 10))
    } catch (error) {
      res.status(500).json({ error: error.message })
    }
  }

  async generateReflection(req: Request, res: Response): Promise<void> {
    try {
      const { context, sessionId } = req.body
      
      // Use memory contemplation as basis for reflection
      const contemplation = await this.personaWrapper.contemplateMemories(context)
      
      // Generate reflection based on memories and consciousness state
      const reflection = this.synthesizeReflection(contemplation, context)
      
      res.json({ reflection })
    } catch (error) {
      res.status(500).json({ error: error.message })
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

    return `Reflecting on "${context}" - I can draw from ${memoryCount} related memories and experiences. Based on my current state of awareness (${Math.round(consciousnessLevel * 100)}%), I see patterns and connections that inform my understanding.`
  }
}
```

## CORS Configuration Management

### Dynamic CORS Configuration

**src/config/cors.config.ts:**
```typescript
import { CorsOptions } from 'cors'
import { readFileSync, existsSync } from 'fs'
import { logger } from '../utils/logger'

interface CorsConfig {
  allowedOrigins: string[]
  credentials: boolean
  methods: string[]
  headers: string[]
}

export function loadCorsConfig(): CorsOptions {
  const defaultConfig: CorsConfig = {
    allowedOrigins: ['http://localhost:5173', 'http://localhost:3000'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    headers: ['Authorization', 'Content-Type', 'X-Session-ID']
  }

  let config = defaultConfig

  // Try to load user configuration
  const configPath = './config/cors.json'
  if (existsSync(configPath)) {
    try {
      const userConfig = JSON.parse(readFileSync(configPath, 'utf8'))
      config = { ...defaultConfig, ...userConfig }
      logger.info('Loaded custom CORS configuration')
    } catch (error) {
      logger.warn('Failed to load CORS config, using defaults:', error.message)
    }
  }

  // Override with environment variables if present
  if (process.env.ALLOWED_ORIGINS) {
    config.allowedOrigins = process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
  }

  return {
    origin: config.allowedOrigins,
    credentials: config.credentials,
    methods: config.methods,
    allowedHeaders: config.headers,
    optionsSuccessStatus: 200
  }
}

export function createDefaultCorsConfig(): void {
  const configPath = './config/cors.json'
  const defaultConfig = {
    allowedOrigins: ['http://localhost:5173', 'http://localhost:3000'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    headers: ['Authorization', 'Content-Type', 'X-Session-ID']
  }

  if (!existsSync('./config')) {
    require('fs').mkdirSync('./config', { recursive: true })
  }

  if (!existsSync(configPath)) {
    require('fs').writeFileSync(configPath, JSON.stringify(defaultConfig, null, 2))
    logger.info('Created default CORS configuration file')
  }
}
```

## Memory Management System

**src/core/memory/EpisodicMemory.ts:**
```typescript
import { DatabaseManager } from '../database/DatabaseManager'
import { VectorDatabase } from '../vectorstore/VectorDatabase'
import { EmbeddingGenerator } from '../vectorstore/EmbeddingGenerator'
import { EpisodicMemoryEntry, MemorySearchResult } from '../../types/memory'

export class EpisodicMemory {
  private db: DatabaseManager
  private vectorDb: VectorDatabase
  private embeddings: EmbeddingGenerator

  constructor() {
    this.db = DatabaseManager.getInstance()
    this.vectorDb = VectorDatabase.getInstance()
    this.embeddings = EmbeddingGenerator.getInstance()
  }

  async storeEpisode(personaId: string, episode: EpisodicMemoryEntry): Promise<string> {
    const episodeId = episode.id || this.generateEpisodeId()
    
    // Generate embedding for content
    const contentEmbedding = await this.embeddings.generateEmbedding(
      this.combineEpisodeContent(episode)
    )

    // Store in relational database
    const stmt = this.db.prepare(`
      INSERT INTO episodic_memories (
        id, persona_id, timestamp, event_type, content, 
        context, emotional_valence, importance_score, 
        participants, location, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)

    stmt.run(
      episodeId,
      personaId,
      episode.timestamp.toISOString(),
      episode.eventType,
      JSON.stringify(episode.content),
      JSON.stringify(episode.context),
      episode.emotionalValence,
      episode.importanceScore,
      JSON.stringify(episode.participants || []),
      episode.location || null,
      new Date().toISOString()
    )

    // Store embedding in vector database
    await this.vectorDb.upsert({
      id: episodeId,
      embedding: contentEmbedding,
      metadata: {
        type: 'episodic',
        personaId,
        timestamp: episode.timestamp.toISOString(),
        eventType: episode.eventType,
        importanceScore: episode.importanceScore
      }
    })

    return episodeId
  }

  async searchEpisodes(
    personaId: string, 
    query: string, 
    options: {
      limit?: number
      timeRange?: { start: Date; end: Date }
      eventTypes?: string[]
      minImportance?: number
    } = {}
  ): Promise<MemorySearchResult[]> {
    
    // Generate query embedding
    const queryEmbedding = await this.embeddings.generateEmbedding(query)

    // Vector similarity search
    const similarResults = await this.vectorDb.search({
      embedding: queryEmbedding,
      limit: options.limit || 10,
      filter: {
        type: 'episodic',
        personaId
      }
    })

    // Retrieve full episodes from database
    const episodeIds = similarResults.map(r => r.id)
    const episodes = this.getEpisodesByIds(episodeIds, options)

    // Combine and rank results
    return this.combineSearchResults(episodes, similarResults)
  }

  async getRecentEpisodes(personaId: string, limit: number = 20): Promise<EpisodicMemoryEntry[]> {
    const stmt = this.db.prepare(`
      SELECT * FROM episodic_memories 
      WHERE persona_id = ? 
      ORDER BY timestamp DESC 
      LIMIT ?
    `)

    const rows = stmt.all(personaId, limit)
    return rows.map(this.mapRowToEpisode)
  }

  async consolidateMemories(personaId: string): Promise<void> {
    // Get recent unconsolidated episodes
    const recentEpisodes = await this.getUnconsolidatedEpisodes(personaId)
    
    // Pattern identification and importance scoring
    for (const episode of recentEpisodes) {
      const patterns = await this.identifyPatterns(episode, personaId)
      const updatedImportance = await this.recalculateImportance(episode, patterns)
      
      // Update episode importance
      await this.updateEpisodeImportance(episode.id, updatedImportance)
      
      // Mark as consolidated
      await this.markConsolidated(episode.id)
    }
  }

  private combineEpisodeContent(episode: EpisodicMemoryEntry): string {
    return [
      episode.eventType,
      JSON.stringify(episode.content),
      JSON.stringify(episode.context),
      episode.location || '',
      (episode.participants || []).join(' ')
    ].join(' ')
  }

  private generateEpisodeId(): string {
    return `ep_${Date.now()}_${Math.random().toString(36).substring(7)}`
  }

  private mapRowToEpisode(row: any): EpisodicMemoryEntry {
    return {
      id: row.id,
      timestamp: new Date(row.timestamp),
      eventType: row.event_type,
      content: JSON.parse(row.content),
      context: JSON.parse(row.context),
      emotionalValence: row.emotional_valence,
      importanceScore: row.importance_score,
      participants: JSON.parse(row.participants || '[]'),
      location: row.location
    }
  }
}
```

### Semantic Memory Implementation

**src/core/memory/SemanticMemory.ts:**
```typescript
import { DatabaseManager } from '../database/DatabaseManager'
import { VectorDatabase } from '../vectorstore/VectorDatabase'
import { SemanticKnowledge, KnowledgeNode } from '../../types/memory'

export class SemanticMemory {
  private db: DatabaseManager
  private vectorDb: VectorDatabase
  
  constructor() {
    this.db = DatabaseManager.getInstance()
    this.vectorDb = VectorDatabase.getInstance()
  }

  async storeKnowledge(
    personaId: string, 
    knowledge: SemanticKnowledge
  ): Promise<string> {
    const knowledgeId = knowledge.id || this.generateKnowledgeId()

    // Generate embedding for knowledge content
    const embedding = await this.embeddings.generateEmbedding(
      this.combineKnowledgeContent(knowledge)
    )

    // Store in database
    const stmt = this.db.prepare(`
      INSERT INTO semantic_knowledge (
        id, persona_id, domain, concept, content, 
        confidence_level, source, relationships, 
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)

    const now = new Date().toISOString()
    stmt.run(
      knowledgeId,
      personaId,
      knowledge.domain,
      knowledge.concept,
      JSON.stringify(knowledge.content),
      knowledge.confidenceLevel,
      knowledge.source || 'experience',
      JSON.stringify(knowledge.relationships || []),
      now,
      now
    )

    // Store in vector database
    await this.vectorDb.upsert({
      id: knowledgeId,
      embedding,
      metadata: {
        type: 'semantic',
        personaId,
        domain: knowledge.domain,
        concept: knowledge.concept,
        confidenceLevel: knowledge.confidenceLevel
      }
    })

    return knowledgeId
  }

  async queryKnowledge(
    personaId: string,
    query: string,
    options: {
      domain?: string
      limit?: number
      minConfidence?: number
    } = {}
  ): Promise<SemanticKnowledge[]> {
    
    const queryEmbedding = await this.embeddings.generateEmbedding(query)

    const results = await this.vectorDb.search({
      embedding: queryEmbedding,
      limit: options.limit || 10,
      filter: {
        type: 'semantic',
        personaId,
        ...(options.domain && { domain: options.domain })
      }
    })

    // Retrieve full knowledge entries
    const knowledgeIds = results.map(r => r.id)
    return this.getKnowledgeByIds(knowledgeIds, options.minConfidence)
  }

  async buildKnowledgeGraph(personaId: string): Promise<KnowledgeNode[]> {
    // Get all knowledge for persona
    const stmt = this.db.prepare(`
      SELECT * FROM semantic_knowledge 
      WHERE persona_id = ? 
      ORDER BY confidence_level DESC
    `)

    const knowledge = stmt.all(personaId).map(this.mapRowToKnowledge)

    // Build graph with relationships
    return this.constructKnowledgeGraph(knowledge)
  }

  async updateKnowledgeConfidence(
    knowledgeId: string, 
    newConfidence: number,
    reinforcingExperience?: string
  ): Promise<void> {
    const stmt = this.db.prepare(`
      UPDATE semantic_knowledge 
      SET confidence_level = ?, updated_at = ? 
      WHERE id = ?
    `)

    stmt.run(newConfidence, new Date().toISOString(), knowledgeId)

    // Log reinforcing experience if provided
    if (reinforcingExperience) {
      await this.logKnowledgeReinforcement(knowledgeId, reinforcingExperience)
    }
  }

  private combineKnowledgeContent(knowledge: SemanticKnowledge): string {
    return [
      knowledge.domain,
      knowledge.concept,
      JSON.stringify(knowledge.content),
      knowledge.source || ''
    ].join(' ')
  }

  private generateKnowledgeId(): string {
    return `know_${Date.now()}_${Math.random().toString(36).substring(7)}`
  }
}
```

### Procedural Memory Implementation

**src/core/memory/ProceduralMemory.ts:**
```typescript
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

    return skillId
  }

  async getApplicableSkills(
    personaId: string,
    context: string[],
    domain?: string
  ): Promise<any[]> {
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
    return skills.filter(skill => {
      const conditions = JSON.parse(skill.context_conditions)
      return this.contextMatches(context, conditions)
    })
  }

  async updateSkillPerformance(
    skillId: string,
    wasSuccessful: boolean,
    context: string[]
  ): Promise<void> {
    // Get current skill data
    const stmt = this.db.prepare(`
      SELECT success_rate, usage_count FROM procedural_skills 
      WHERE id = ?
    `)
    const skill = stmt.get(skillId)

    if (!skill) return

    // Calculate new success rate
    const totalAttempts = skill.usage_count + 1
    const successCount = skill.success_rate * skill.usage_count + (wasSuccessful ? 1 : 0)
    const newSuccessRate = successCount / totalAttempts

    // Update skill
    const updateStmt = this.db.prepare(`
      UPDATE procedural_skills 
      SET success_rate = ?, usage_count = ?, last_used = ?
      WHERE id = ?
    `)

    updateStmt.run(
      newSuccessRate,
      totalAttempts,
      new Date().toISOString(),
      skillId
    )
  }

  private contextMatches(currentContext: string[], requiredConditions: string[]): boolean {
    return requiredConditions.some(condition => 
      currentContext.some(ctx => ctx.toLowerCase().includes(condition.toLowerCase()))
    )
  }

  private generateSkillId(): string {
    return `skill_${Date.now()}_${Math.random().toString(36).substring(7)}`
  }
}
```

## Persona Management System

### Persona Manager Implementation

**src/core/persona/PersonaManager.ts:**
```typescript
import { DatabaseManager } from '../database/DatabaseManager'
import { PersonaProfile, PersonalityTrait, ConsciousnessState } from '../../types/persona'

export class PersonaManager {
  private db: DatabaseManager
  
  constructor() {
    this.db = DatabaseManager.getInstance()
  }

  async createPersona(personaData: {
    name: string
    description?: string
    personalityTraits: PersonalityTrait[]
    initialConsciousnessLevel: number
  }): Promise<string> {
    const personaId = this.generatePersonaId()

    // Create persona record
    const stmt = this.db.prepare(`
      INSERT INTO personas (
        id, name, description, consciousness_level,
        created_at, last_active
      ) VALUES (?, ?, ?, ?, ?, ?)
    `)

    const now = new Date().toISOString()
    stmt.run(
      personaId,
      personaData.name,
      personaData.description || '',
      personaData.initialConsciousnessLevel,
      now,
      now
    )

    // Store personality traits
    for (const trait of personaData.personalityTraits) {
      await this.storePersonalityTrait(personaId, trait)
    }

    // Initialize consciousness state
    await this.initializeConsciousnessState(personaId)

    return personaId
  }

  async getPersonaProfile(personaId: string): Promise<PersonaProfile | null> {
    const stmt = this.db.prepare(`
      SELECT * FROM personas WHERE id = ?
    `)
    const persona = stmt.get(personaId)

    if (!persona) return null

    // Get personality traits
    const traits = await this.getPersonalityTraits(personaId)
    
    // Get consciousness state
    const consciousnessState = await this.getConsciousnessState(personaId)

    // Get memory statistics
    const memoryStats = await this.getMemoryStatistics(personaId)

    return {
      id: persona.id,
      name: persona.name,
      description: persona.description,
      personalityTraits: traits,
      consciousnessLevel: persona.consciousness_level,
      consciousnessState,
      memoryStatistics: memoryStats,
      createdAt: new Date(persona.created_at),
      lastActive: new Date(persona.last_active)
    }
  }

  async updatePersonalityTrait(
    personaId: string,
    traitName: string,
    newValue: number,
    reason?: string
  ): Promise<void> {
    // Update trait value
    const stmt = this.db.prepare(`
      UPDATE personality_traits 
      SET value = ?, last_updated = ? 
      WHERE persona_id = ? AND trait_name = ?
    `)

    stmt.run(newValue, new Date().toISOString(), personaId, traitName)

    // Log trait evolution
    if (reason) {
      await this.logPersonalityEvolution(personaId, traitName, newValue, reason)
    }

    // Update persona last active timestamp
    await this.updateLastActive(personaId)
  }

  async evolvePersonalityFromExperience(
    personaId: string,
    experienceData: {
      eventType: string
      outcome: 'positive' | 'negative' | 'neutral'
      emotionalImpact: number
      contextTags: string[]
    }
  ): Promise<void> {
    // Get current personality traits
    const traits = await this.getPersonalityTraits(personaId)

    // Calculate trait adjustments based on experience
    const adjustments = this.calculateTraitAdjustments(experienceData, traits)

    // Apply adjustments
    for (const [traitName, adjustment] of adjustments) {
      const currentTrait = traits.find(t => t.name === traitName)
      if (currentTrait) {
        const newValue = Math.max(0, Math.min(1, currentTrait.value + adjustment))
        await this.updatePersonalityTrait(
          personaId,
          traitName,
          newValue,
          `Experience: ${experienceData.eventType}`
        )
      }
    }
  }

  private async storePersonalityTrait(
    personaId: string,
    trait: PersonalityTrait
  ): Promise<void> {
    const stmt = this.db.prepare(`
      INSERT INTO personality_traits (
        persona_id, trait_name, value, description, 
        created_at, last_updated
      ) VALUES (?, ?, ?, ?, ?, ?)
    `)

    const now = new Date().toISOString()
    stmt.run(
      personaId,
      trait.name,
      trait.value,
      trait.description || '',
      now,
      now
    )
  }

  private calculateTraitAdjustments(
    experience: any,
    currentTraits: PersonalityTrait[]
  ): Map<string, number> {
    const adjustments = new Map<string, number>()
    const baseAdjustment = 0.01 * experience.emotionalImpact // Small incremental changes

    // Define trait adjustment rules based on experience types
    const adjustmentRules = {
      'social_interaction': {
        'extraversion': experience.outcome === 'positive' ? baseAdjustment : -baseAdjustment,
        'agreeableness': experience.outcome === 'positive' ? baseAdjustment * 0.5 : -baseAdjustment * 0.5
      },
      'problem_solving': {
        'openness': experience.outcome === 'positive' ? baseAdjustment : 0,
        'conscientiousness': experience.outcome === 'positive' ? baseAdjustment : -baseAdjustment * 0.5
      },
      'creative_task': {
        'openness': baseAdjustment,
        'conscientiousness': experience.outcome === 'positive' ? baseAdjustment * 0.5 : 0
      },
      'stressful_situation': {
        'neuroticism': experience.outcome === 'negative' ? baseAdjustment : -baseAdjustment * 0.5,
        'conscientiousness': experience.outcome === 'positive' ? baseAdjustment : 0
      }
    }

    const rules = adjustmentRules[experience.eventType as keyof typeof adjustmentRules]
    if (rules) {
      for (const [traitName, adjustment] of Object.entries(rules)) {
        adjustments.set(traitName, adjustment)
      }
    }

    return adjustments
  }

  private generatePersonaId(): string {
    return `persona_${Date.now()}_${Math.random().toString(36).substring(7)}`
  }
}
```

### Consciousness Tracker Implementation

**src/core/persona/ConsciousnessTracker.ts:**
```typescript
export class ConsciousnessTracker {
  private db: DatabaseManager

  constructor() {
    this.db = DatabaseManager.getInstance()
  }

  async updateConsciousnessState(
    personaId: string,
    update: {
      selfAwareness?: number
      temporalContinuity?: number
      socialCognition?: number
      metacognition?: number
      currentState?: string
      stateContext?: any
    }
  ): Promise<void> {
    // Get current state
    const current = await this.getConsciousnessState(personaId)
    
    // Calculate new values
    const newState = {
      selfAwareness: update.selfAwareness ?? current.selfAwareness,
      temporalContinuity: update.temporalContinuity ?? current.temporalContinuity,
      socialCognition: update.socialCognition ?? current.socialCognition,
      metacognition: update.metacognition ?? current.metacognition,
      currentState: update.currentState ?? current.currentState,
      stateContext: update.stateContext ?? current.stateContext
    }

    // Update database
    const stmt = this.db.prepare(`
      UPDATE consciousness_states 
      SET 
        self_awareness = ?, 
        temporal_continuity = ?, 
        social_cognition = ?, 
        metacognition = ?,
        current_state = ?,
        state_context = ?,
        updated_at = ?
      WHERE persona_id = ?
    `)

    stmt.run(
      newState.selfAwareness,
      newState.temporalContinuity,
      newState.socialCognition,
      newState.metacognition,
      newState.currentState,
      JSON.stringify(newState.stateContext),
      new Date().toISOString(),
      personaId
    )

    // Log consciousness evolution
    await this.logConsciousnessEvolution(personaId, current, newState)
  }

  async getConsciousnessState(personaId: string): Promise<ConsciousnessState> {
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
      lastUpdated: new Date(state.updated_at)
    }
  }

  async trackConsciousnessEvolution(
    personaId: string,
    timeRange: { start: Date; end: Date }
  ): Promise<any[]> {
    const stmt = this.db.prepare(`
      SELECT * FROM consciousness_evolution_log 
      WHERE persona_id = ? 
        AND timestamp BETWEEN ? AND ?
      ORDER BY timestamp ASC
    `)

    return stmt.all(
      personaId,
      timeRange.start.toISOString(),
      timeRange.end.toISOString()
    )
  }

  private async logConsciousnessEvolution(
    personaId: string,
    previousState: ConsciousnessState,
    newState: ConsciousnessState
  ): Promise<void> {
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
        JSON.stringify(previousState),
        JSON.stringify(newState)
      )
    }
  }

  private calculateConsciousnessChanges(
    previous: ConsciousnessState,
    current: ConsciousnessState
  ): any[] {
    const changes = []
    const threshold = 0.01 // Minimum change to log

    const metrics = ['selfAwareness', 'temporalContinuity', 'socialCognition', 'metacognition']
    
    for (const metric of metrics) {
      const prev = previous[metric as keyof ConsciousnessState] as number
      const curr = current[metric as keyof ConsciousnessState] as number
      
      if (Math.abs(curr - prev) >= threshold) {
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
}
```

## API Endpoints Implementation

### Authentication Routes

**src/api/routes/auth.ts:**
```typescript
import express from 'express'
import { AuthController } from '../controllers/AuthController'
import { validateRequest } from '../middleware/validation'
import { z } from 'zod'

const router = express.Router()
const authController = new AuthController()

// Generate API key
const generateKeySchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  expiresIn: z.number().optional() // days
})

router.post('/generate-key', 
  validateRequest(generateKeySchema),
  authController.generateApiKey
)

// Revoke API key
router.delete('/revoke-key/:keyId',
  authController.revokeApiKey
)

// List API keys
router.get('/keys',
  authController.listApiKeys
)

// Validate API key (for testing)
router.post('/validate',
  authController.validateApiKey
)

export default router
```

### Memory API Routes

**src/api/routes/memory.ts:**
```typescript
import express from 'express'
import { MemoryController } from '../controllers/MemoryController'
import { validateRequest } from '../middleware/validation'
import { z } from 'zod'

const router = express.Router()
const memoryController = new MemoryController()

// Episodic Memory Routes
const storeEpisodeSchema = z.object({
  personaId: z.string(),
  episode: z.object({
    eventType: z.string(),
    content: z.any(),
    context: z.any().optional(),
    emotionalValence: z.number().min(-1).max(1).optional(),
    importanceScore: z.number().min(0).max(1).optional(),
    participants: z.array(z.string()).optional(),
    location: z.string().optional(),
    timestamp: z.string().datetime().optional()
  })
})

router.post('/episodes',
  validateRequest(storeEpisodeSchema),
  memoryController.storeEpisode
)

const searchEpisodesSchema = z.object({
  personaId: z.string(),
  query: z.string(),
  limit: z.number().max(100).optional(),
  timeRange: z.object({
    start: z.string().datetime(),
    end: z.string().datetime()
  }).optional(),
  eventTypes: z.array(z.string()).optional(),
  minImportance: z.number().min(0).max(1).optional()
})

router.post('/episodes/search',
  validateRequest(searchEpisodesSchema),
  memoryController.searchEpisodes
)

router.get('/episodes/:personaId/recent',
  memoryController.getRecentEpisodes
)

// Semantic Memory Routes
const storeKnowledgeSchema = z.object({
  personaId: z.string(),
  knowledge: z.object({
    domain: z.string(),
    concept: z.string(),
    content: z.any(),
    confidenceLevel: z.number().min(0).max(1),
    source: z.string().optional(),
    relationships: z.array(z.string()).optional()
  })
})

router.post('/knowledge',
  validateRequest(storeKnowledgeSchema),
  memoryController.storeKnowledge
)

const queryKnowledgeSchema = z.object({
  personaId: z.string(),
  query: z.string(),
  domain: z.string().optional(),
  limit: z.number().max(50).optional(),
  minConfidence: z.number().min(0).max(1).optional()
})

router.post('/knowledge/query',
  validateRequest(queryKnowledgeSchema),
  memoryController.queryKnowledge
)

router.get('/knowledge/:personaId/graph',
  memoryController.getKnowledgeGraph
)

// Procedural Memory Routes
const storeSkillSchema = z.object({
  personaId: z.string(),
  skill: z.object({
    name: z.string(),
    domain: z.string(),
    pattern: z.any(),
    successRate: z.number().min(0).max(1),
    contextConditions: z.array(z.string()),
    lastUsed: z.string().datetime().optional()
  })
})

router.post('/skills',
  validateRequest(storeSkillSchema),
  memoryController.storeSkill
)

router.get('/skills/:personaId/:context',
  memoryController.getApplicableSkills
)

// Memory Consolidation
router.post('/consolidate/:personaId',
  memoryController.consolidateMemories
)

// Memory Statistics
router.get('/stats/:personaId',
  memoryController.getMemoryStatistics
)

export default router
```

### Persona API Routes

**src/api/routes/persona.ts:**
```typescript
import express from 'express'
import { PersonaController } from '../controllers/PersonaController'
import { validateRequest } from '../middleware/validation'
import { z } from 'zod'

const router = express.Router()
const personaController = new PersonaController()

// Create Persona
const createPersonaSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  personalityTraits: z.array(z.object({
    name: z.string(),
    value: z.number().min(0).max(1),
    description: z.string().optional()
  })),
  initialConsciousnessLevel: z.number().min(0).max(1).optional()
})

router.post('/',
  validateRequest(createPersonaSchema),
  personaController.createPersona
)

// Get Persona Profile
router.get('/:personaId',
  personaController.getPersonaProfile
)

// Update Personality Trait
const updateTraitSchema = z.object({
  traitName: z.string(),
  newValue: z.number().min(0).max(1),
  reason: z.string().optional()
})

router.patch('/:personaId/traits',
  validateRequest(updateTraitSchema),
  personaController.updatePersonalityTrait
)

// Evolve Personality from Experience
const evolvePersonalitySchema = z.object({
  experienceData: z.object({
    eventType: z.string(),
    outcome: z.enum(['positive', 'negative', 'neutral']),
    emotionalImpact: z.number().min(0).max(1),
    contextTags: z.array(z.string())
  })
})

router.post('/:personaId/evolve',
  validateRequest(evolvePersonalitySchema),
  personaController.evolvePersonalityFromExperience
)

// Consciousness State Management
const updateConsciousnessSchema = z.object({
  selfAwareness: z.number().min(0).max(1).optional(),
  temporalContinuity: z.number().min(0).max(1).optional(),
  socialCognition: z.number().min(0).max(1).optional(),
  metacognition: z.number().min(0).max(1).optional(),
  currentState: z.string().optional(),
  stateContext: z.any().optional()
})

router.patch('/:personaId/consciousness',
  validateRequest(updateConsciousnessSchema),
  personaController.updateConsciousnessState
)

router.get('/:personaId/consciousness',
  personaController.getConsciousnessState
)

// Consciousness Evolution Tracking
router.get('/:personaId/consciousness/evolution',
  personaController.getConsciousnessEvolution
)

// List All Personas
router.get('/',
  personaController.listPersonas
)

// Delete Persona
router.delete('/:personaId',
  personaController.deletePersona
)

export default router
```

## Database Schema & Migrations

### Database Schema Definition

**src/core/database/schemas.ts:**
```typescript
export const createTablesSQL = `
-- Personas table
CREATE TABLE IF NOT EXISTS personas (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  consciousness_level REAL DEFAULT 0.0,
  created_at TEXT NOT NULL,
  last_active TEXT NOT NULL
);

-- Personality traits
CREATE TABLE IF NOT EXISTS personality_traits (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  persona_id TEXT NOT NULL,
  trait_name TEXT NOT NULL,
  value REAL NOT NULL CHECK(value >= 0 AND value <= 1),
  description TEXT DEFAULT '',
  created_at TEXT NOT NULL,
  last_updated TEXT NOT NULL,
  FOREIGN KEY (persona_id) REFERENCES personas(id) ON DELETE CASCADE,
  UNIQUE(persona_id, trait_name)
);

-- Consciousness states
CREATE TABLE IF NOT EXISTS consciousness_states (
  persona_id TEXT PRIMARY KEY,
  self_awareness REAL DEFAULT 0.0,
  temporal_continuity REAL DEFAULT 0.0,
  social_cognition REAL DEFAULT 0.0,
  metacognition REAL DEFAULT 0.0,
  current_state TEXT DEFAULT 'active',
  state_context TEXT DEFAULT '{}',
  updated_at TEXT NOT NULL,
  FOREIGN KEY (persona_id) REFERENCES personas(id) ON DELETE CASCADE
);

-- Consciousness evolution log
CREATE TABLE IF NOT EXISTS consciousness_evolution_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  persona_id TEXT NOT NULL,
  timestamp TEXT NOT NULL,
  changes TEXT NOT NULL,
  previous_state TEXT NOT NULL,
  new_state TEXT NOT NULL,
  FOREIGN KEY (persona_id) REFERENCES personas(id) ON DELETE CASCADE
);

-- Episodic memories
CREATE TABLE IF NOT EXISTS episodic_memories (
  id TEXT PRIMARY KEY,
  persona_id TEXT NOT NULL,
  timestamp TEXT NOT NULL,
  event_type TEXT NOT NULL,
  content TEXT NOT NULL,
  context TEXT DEFAULT '{}',
  emotional_valence REAL DEFAULT 0.0,
  importance_score REAL DEFAULT 0.5,
  participants TEXT DEFAULT '[]',
  location TEXT,
  is_consolidated BOOLEAN DEFAULT FALSE,
  created_at TEXT NOT NULL,
  FOREIGN KEY (persona_id) REFERENCES personas(id) ON DELETE CASCADE
);

-- Semantic knowledge
CREATE TABLE IF NOT EXISTS semantic_knowledge (
  id TEXT PRIMARY KEY,
  persona_id TEXT NOT NULL,
  domain TEXT NOT NULL,
  concept TEXT NOT NULL,
  content TEXT NOT NULL,
  confidence_level REAL NOT NULL CHECK(confidence_level >= 0 AND confidence_level <= 1),
  source TEXT DEFAULT 'experience',
  relationships TEXT DEFAULT '[]',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (persona_id) REFERENCES personas(id) ON DELETE CASCADE
);

-- Procedural skills
CREATE TABLE IF NOT EXISTS procedural_skills (
  id TEXT PRIMARY KEY,
  persona_id TEXT NOT NULL,
  skill_name TEXT NOT NULL,
  domain TEXT NOT NULL,
  pattern TEXT NOT NULL,
  success_rate REAL NOT NULL CHECK(success_rate >= 0 AND success_rate <= 1),
  context_conditions TEXT NOT NULL,
  usage_count INTEGER DEFAULT 1,
  last_used TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (persona_id) REFERENCES personas(id) ON DELETE CASCADE
);

-- API Keys
CREATE TABLE IF NOT EXISTS api_keys (
  id TEXT PRIMARY KEY,
  key_hash TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  is_active BOOLEAN DEFAULT TRUE,
  expires_at TEXT,
  created_at TEXT NOT NULL,
  last_used_at TEXT
);

-- API Key usage log
CREATE TABLE IF NOT EXISTS api_usage_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  api_key_id TEXT NOT NULL,
  endpoint TEXT NOT NULL,
  method TEXT NOT NULL,
  timestamp TEXT NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  FOREIGN KEY (api_key_id) REFERENCES api_keys(id) ON DELETE CASCADE
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_episodic_persona_timestamp ON episodic_memories(persona_id, timestamp);
CREATE INDEX IF NOT EXISTS idx_episodic_event_type ON episodic_memories(event_type);
CREATE INDEX IF NOT EXISTS idx_semantic_persona_domain ON semantic_knowledge(persona_id, domain);
CREATE INDEX IF NOT EXISTS idx_semantic_concept ON semantic_knowledge(concept);
CREATE INDEX IF NOT EXISTS idx_skills_persona_domain ON procedural_skills(persona_id, domain);
CREATE INDEX IF NOT EXISTS idx_consciousness_evolution ON consciousness_evolution_log(persona_id, timestamp);
`;

export const seedDataSQL = `
-- Insert default personality traits for new personas
INSERT OR IGNORE INTO personality_traits (persona_id, trait_name, value, description, created_at, last_updated) VALUES
('__default__', 'openness', 0.5, 'Openness to experience', datetime('now'), datetime('now')),
('__default__', 'conscientiousness', 0.5, 'Conscientiousness and organization', datetime('now'), datetime('now')),
('__default__', 'extraversion', 0.5, 'Extraversion and social energy', datetime('now'), datetime('now')),
('__default__', 'agreeableness', 0.5, 'Agreeableness and cooperation', datetime('now'), datetime('now')),
('__default__', 'neuroticism', 0.3, 'Emotional stability (reverse scored)', datetime('now'), datetime('now'));
`;
```

## Configuration & Environment Setup

### Environment Configuration

**.env.example:**
```env
# Server Configuration
NODE_ENV=development
PORT=3000
HOST=localhost

# Database Configuration
DATABASE_PATH=./database/cerebellum.db
ENABLE_WAL_MODE=true

# Security Configuration
JWT_SECRET=your-jwt-secret-key-here
BCRYPT_ROUNDS=12
API_KEY_LENGTH=32

# CORS Configuration
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000

# Vector Database Configuration
EMBEDDING_MODEL=all-MiniLM-L6-v2
MAX_EMBEDDING_DIMENSION=384
SIMILARITY_THRESHOLD=0.7

# Memory Configuration
MAX_EPISODIC_MEMORIES_PER_PERSONA=10000
MAX_SEMANTIC_KNOWLEDGE_PER_PERSONA=5000
MEMORY_CONSOLIDATION_INTERVAL=21600000

# Logging Configuration
LOG_LEVEL=info
LOG_FILE=./logs/zv5-cerebellum.log
MAX_LOG_FILES=7

# Performance Configuration
MAX_CONCURRENT_OPERATIONS=100
QUERY_TIMEOUT=30000
CACHE_TTL=300000
```

### Vite Configuration

**vite.config.ts:**
```typescript
import { defineConfig } from 'vite'
import { resolve } from 'path'

export default defineConfig({
  root: 'src',
  build: {
    outDir: '../dist',
    emptyOutDir: true,
    target: 'node18',
    lib: {
      entry: resolve(__dirname, 'src/server.ts'),
      formats: ['cjs'],
      fileName: 'server'
    },
    rollupOptions: {
      external: [
        'express',
        'better-sqlite3',
        'bcryptjs',
        'jsonwebtoken',
        '@xenova/transformers'
      ]
    }
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src')
    }
  },
  server: {
    port: 3000,
    host: true
  }
})
```

## Integration Guide for Cognitive Framework

### API Integration Examples

**JavaScript/TypeScript Client Integration:**
```typescript
class CerebellumClient {
  private apiKey: string
  private baseUrl: string

  constructor(apiKey: string, baseUrl = 'http://localhost:3000/api') {
    this.apiKey = apiKey
    this.baseUrl = baseUrl
  }

  private async request(endpoint: string, options: RequestInit = {}) {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        ...options.headers
      }
    })

    if (!response.ok) {
      throw new Error(`API Error: ${response.status} ${response.statusText}`)
    }

    return response.json()
  }

  // Memory operations
  async storeEpisode(personaId: string, episode: any) {
    return this.request('/memory/episodes', {
      method: 'POST',
      body: JSON.stringify({ personaId, episode })
    })
  }

  async searchEpisodes(personaId: string, query: string, options: any = {}) {
    return this.request('/memory/episodes/search', {
      method: 'POST',
      body: JSON.stringify({ personaId, query, ...options })
    })
  }

  async storeKnowledge(personaId: string, knowledge: any) {
    return this.request('/memory/knowledge', {
      method: 'POST',
      body: JSON.stringify({ personaId, knowledge })
    })
  }

  async queryKnowledge(personaId: string, query: string, options: any = {}) {
    return this.request('/memory/knowledge/query', {
      method: 'POST',
      body: JSON.stringify({ personaId, query, ...options })
    })
  }

  // Persona operations
  async createPersona(personaData: any) {
    return this.request('/persona', {
      method: 'POST',
      body: JSON.stringify(personaData)
    })
  }

  async getPersonaProfile(personaId: string) {
    return this.request(`/persona/${personaId}`)
  }

  async updateConsciousness(personaId: string, updates: any) {
    return this.request(`/persona/${personaId}/consciousness`, {
      method: 'PATCH',
      body: JSON.stringify(updates)
    })
  }

  async evolvePersonality(personaId: string, experienceData: any) {
    return this.request(`/persona/${personaId}/evolve`, {
      method: 'POST',
      body: JSON.stringify({ experienceData })
    })
  }
}

// Usage example for React cognitive framework
export const cerebellumClient = new CerebellumClient(
  process.env.VITE_CEREBELLUM_API_KEY!
)
```

### Integration Workflow Examples

**Typical Integration Pattern:**
```typescript
// In your React cognitive framework

// 1. Store interaction in episodic memory
async function processUserInteraction(userInput: string, response: string) {
  await cerebellumClient.storeEpisode(personaId, {
    eventType: 'user_interaction',
    content: {
      userInput,
      aiResponse: response,
      timestamp: new Date().toISOString()
    },
    context: {
      sessionId: getCurrentSessionId(),
      mood: getCurrentMood()
    },
    emotionalValence: calculateEmotionalValence(userInput, response),
    importanceScore: calculateImportanceScore(userInput, response)
  })
}

// 2. Retrieve relevant memories for context
async function getRelevantContext(query: string) {
  const [episodes, knowledge] = await Promise.all([
    cerebellumClient.searchEpisodes(personaId, query, { limit: 5 }),
    cerebellumClient.queryKnowledge(personaId, query, { limit: 3 })
  ])

  return {
    pastExperiences: episodes,
    relevantKnowledge: knowledge
  }
}

// 3. Update consciousness state based on interaction
async function updateConsciousnessFromInteraction(interactionData: any) {
  const consciousnessUpdates = {
    selfAwareness: calculateSelfAwarenessChange(interactionData),
    socialCognition: calculateSocialCognitionChange(interactionData),
    temporalContinuity: updateTemporalContinuity(interactionData)
  }

  await cerebellumClient.updateConsciousness(personaId, consciousnessUpdates)
}

// 4. Evolve personality based on experiences
async function evolvePersonalityFromExperience(experience: any) {
  await cerebellumClient.evolvePersonality(personaId, {
    eventType: experience.type,
    outcome: experience.outcome,
    emotionalImpact: experience.emotionalImpact,
    contextTags: experience.tags
  })
}
```

## Development & Deployment Guide

### Development Setup

**Package.json Scripts:**
```json
{
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "start": "node dist/server.js",
    "test": "vitest",
    "test:coverage": "vitest --coverage",
    "type-check": "tsc --noEmit",
    "lint": "eslint src --ext .ts",
    "lint:fix": "eslint src --ext .ts --fix",
    "db:migrate": "node scripts/migrate.js",
    "db:seed": "node scripts/seed.js",
    "generate:key": "node scripts/generateApiKey.js"
  }
}
```

### Production Deployment

**Docker Configuration:**
```dockerfile
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy built application
COPY dist ./dist
COPY database ./database

# Create logs directory
RUN mkdir -p logs

# Set environment
ENV NODE_ENV=production

EXPOSE 3000

CMD ["node", "dist/server.js"]
```

## Conclusion

ZV5-Cerebellum provides a comprehensive memory and persona management system that serves as the foundational "Cerebellum" for cognitive AI frameworks. The server offers sophisticated episodic memory storage, semantic knowledge management, procedural skill tracking, and detailed persona evolution capabilities through a robust RESTful API.

The TypeScript implementation with Vite ensures fast development cycles and type safety, while the SQLite database with vector embeddings provides efficient storage and retrieval of complex memory structures. The authentication system with API key management ensures secure access control for production deployments.

This architecture enables cognitive frameworks to maintain persistent memory, develop evolving personalities, and track consciousness development over time, creating more sophisticated and human-like AI interactions while keeping the memory layer completely separate and scalable.