import express from 'express'
import { CompatibilityController } from '../controllers/CompatibilityController.js'
import { z } from 'zod'

const router = express.Router()
const compatibilityController = new CompatibilityController()

// Validation schemas
const memoryUpdateSchema = z.object({
  sessionId: z.string().optional(),
  newMemory: z.object({
    content: z.string(),
    context: z.any().optional(),
    importance: z.number().min(0).max(1).optional(),
    tags: z.array(z.string()).optional()
  }),
  context: z.string()
})

const memorySearchSchema = z.object({
  query: z.string(),
  limit: z.number().max(20).optional(),
  sessionId: z.string().optional()
})

const reflectionSchema = z.object({
  context: z.string(),
  sessionId: z.string().optional()
})

const interactionSchema = z.object({
  userInput: z.string(),
  sessionContext: z.any().optional()
})

// Session initialization (client-side sessions, server provides persona state)
router.post('/session/initialize', compatibilityController.initializeSession.bind(compatibilityController))

// Active persona endpoint
router.get('/persona/active', compatibilityController.getActivePersona.bind(compatibilityController))

// Simplified memory update endpoint
router.post('/memory/update', async (req, res) => {
  try {
    const validation = memoryUpdateSchema.safeParse(req.body)
    if (!validation.success) {
      res.status(400).json({
        success: false,
        error: 'Invalid request data',
        details: validation.error.errors
      })
      return
    }
    await compatibilityController.updateMemory(req, res)
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to update memory' })
  }
})

// Simplified memory search endpoint  
router.post('/memory/search', async (req, res) => {
  try {
    const validation = memorySearchSchema.safeParse(req.body)
    if (!validation.success) {
      res.status(400).json({
        success: false,
        error: 'Invalid request data',
        details: validation.error.errors
      })
      return
    }
    await compatibilityController.searchMemory(req, res)
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to search memory' })
  }
})

// Reflection generation endpoint
router.post('/reflection/generate', async (req, res) => {
  try {
    const validation = reflectionSchema.safeParse(req.body)
    if (!validation.success) {
      res.status(400).json({
        success: false,
        error: 'Invalid request data',
        details: validation.error.errors
      })
      return
    }
    await compatibilityController.generateReflection(req, res)
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to generate reflection' })
  }
})

// Interaction processing endpoint
router.post('/interaction/process', async (req, res) => {
  try {
    const validation = interactionSchema.safeParse(req.body)
    if (!validation.success) {
      res.status(400).json({
        success: false,
        error: 'Invalid request data',
        details: validation.error.errors
      })
      return
    }
    await compatibilityController.processInteraction(req, res)
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to process interaction' })
  }
})

export default router
