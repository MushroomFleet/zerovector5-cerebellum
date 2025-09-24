import express from 'express'
import { MemoryController } from '../controllers/MemoryController.js'
import { z } from 'zod'

const router = express.Router()
const memoryController = new MemoryController()

// Validation schemas
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

const queryKnowledgeSchema = z.object({
  personaId: z.string(),
  query: z.string(),
  domain: z.string().optional(),
  limit: z.number().max(50).optional(),
  minConfidence: z.number().min(0).max(1).optional()
})

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

// Episodic Memory Routes
router.post('/episodes', async (req, res) => {
  try {
    const validation = storeEpisodeSchema.safeParse(req.body)
    if (!validation.success) {
      res.status(400).json({
        success: false,
        error: 'Invalid request data',
        details: validation.error.errors
      })
      return
    }
    await memoryController.storeEpisode(req, res)
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to store episode' })
  }
})

router.post('/episodes/search', async (req, res) => {
  try {
    const validation = searchEpisodesSchema.safeParse(req.body)
    if (!validation.success) {
      res.status(400).json({
        success: false,
        error: 'Invalid request data',
        details: validation.error.errors
      })
      return
    }
    await memoryController.searchEpisodes(req, res)
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to search episodes' })
  }
})

router.get('/episodes/:personaId/recent', memoryController.getRecentEpisodes.bind(memoryController))

// Semantic Memory Routes
router.post('/knowledge', async (req, res) => {
  try {
    const validation = storeKnowledgeSchema.safeParse(req.body)
    if (!validation.success) {
      res.status(400).json({
        success: false,
        error: 'Invalid request data',
        details: validation.error.errors
      })
      return
    }
    await memoryController.storeKnowledge(req, res)
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to store knowledge' })
  }
})

router.post('/knowledge/query', async (req, res) => {
  try {
    const validation = queryKnowledgeSchema.safeParse(req.body)
    if (!validation.success) {
      res.status(400).json({
        success: false,
        error: 'Invalid request data',
        details: validation.error.errors
      })
      return
    }
    await memoryController.queryKnowledge(req, res)
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to query knowledge' })
  }
})

router.get('/knowledge/:personaId/graph', memoryController.getKnowledgeGraph.bind(memoryController))

// Procedural Memory Routes
router.post('/skills', async (req, res) => {
  try {
    const validation = storeSkillSchema.safeParse(req.body)
    if (!validation.success) {
      res.status(400).json({
        success: false,
        error: 'Invalid request data',
        details: validation.error.errors
      })
      return
    }
    await memoryController.storeSkill(req, res)
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to store skill' })
  }
})

router.get('/skills/:personaId/:context', memoryController.getApplicableSkills.bind(memoryController))

// Memory Consolidation
router.post('/consolidate/:personaId', memoryController.consolidateMemories.bind(memoryController))

// Memory Statistics
router.get('/stats/:personaId', memoryController.getMemoryStatistics.bind(memoryController))

export default router
