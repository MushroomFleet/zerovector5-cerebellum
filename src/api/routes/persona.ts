import express from 'express'
import { PersonaController } from '../controllers/PersonaController.js'
import { z } from 'zod'

const router = express.Router()
const personaController = new PersonaController()

// Validation schemas
const updateTraitSchema = z.object({
  traitName: z.string(),
  newValue: z.number().min(0).max(1),
  reason: z.string().optional()
})

const evolvePersonalitySchema = z.object({
  experienceData: z.object({
    eventType: z.string(),
    outcome: z.enum(['positive', 'negative', 'neutral']),
    emotionalImpact: z.number().min(0).max(1),
    contextTags: z.array(z.string())
  })
})

const updateConsciousnessSchema = z.object({
  selfAwareness: z.number().min(0).max(1).optional(),
  temporalContinuity: z.number().min(0).max(1).optional(),
  socialCognition: z.number().min(0).max(1).optional(),
  metacognition: z.number().min(0).max(1).optional(),
  currentState: z.string().optional(),
  stateContext: z.any().optional()
})

const processExperienceSchema = z.object({
  experienceData: z.object({
    type: z.string().optional(),
    content: z.any(),
    context: z.any().optional(),
    importance: z.number().min(0).max(1).optional(),
    emotionalValence: z.number().min(-1).max(1).optional(),
    tags: z.array(z.string()).optional(),
    knowledge: z.any().optional()
  })
})

const generateReflectionSchema = z.object({
  context: z.string(),
  depth: z.enum(['shallow', 'deep']).optional()
})

// Get active persona (for single persona server)
router.get('/active', personaController.getActivePersona.bind(personaController))

// Get persona profile
router.get('/:personaId', personaController.getPersonaProfile.bind(personaController))

// Update personality trait
router.patch('/:personaId/traits', async (req, res) => {
  try {
    const validation = updateTraitSchema.safeParse(req.body)
    if (!validation.success) {
      res.status(400).json({
        success: false,
        error: 'Invalid request data',
        details: validation.error.errors
      })
      return
    }
    await personaController.updatePersonalityTrait(req, res)
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to update personality trait' })
  }
})

// Evolve personality from experience
router.post('/:personaId/evolve', async (req, res) => {
  try {
    const validation = evolvePersonalitySchema.safeParse(req.body)
    if (!validation.success) {
      res.status(400).json({
        success: false,
        error: 'Invalid request data',
        details: validation.error.errors
      })
      return
    }
    await personaController.evolvePersonalityFromExperience(req, res)
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to evolve personality' })
  }
})

// Consciousness state management
router.patch('/:personaId/consciousness', async (req, res) => {
  try {
    const validation = updateConsciousnessSchema.safeParse(req.body)
    if (!validation.success) {
      res.status(400).json({
        success: false,
        error: 'Invalid request data',
        details: validation.error.errors
      })
      return
    }
    await personaController.updateConsciousnessState(req, res)
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to update consciousness' })
  }
})

router.get('/:personaId/consciousness', personaController.getConsciousnessState.bind(personaController))

// Consciousness metrics and insights
router.get('/:personaId/consciousness/metrics', personaController.getConsciousnessMetrics.bind(personaController))

// Process experience
router.post('/:personaId/experience', async (req, res) => {
  try {
    const validation = processExperienceSchema.safeParse(req.body)
    if (!validation.success) {
      res.status(400).json({
        success: false,
        error: 'Invalid request data',
        details: validation.error.errors
      })
      return
    }
    await personaController.processExperience(req, res)
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to process experience' })
  }
})

// Generate reflection
router.post('/:personaId/reflection', async (req, res) => {
  try {
    const validation = generateReflectionSchema.safeParse(req.body)
    if (!validation.success) {
      res.status(400).json({
        success: false,
        error: 'Invalid request data',
        details: validation.error.errors
      })
      return
    }
    await personaController.generateReflection(req, res)
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to generate reflection' })
  }
})

// Get persona insights
router.get('/:personaId/insights', personaController.getPersonaInsights.bind(personaController))

// Get persona statistics  
router.get('/:personaId/stats', personaController.getPersonaStats.bind(personaController))

// Sleep management
router.post('/:personaId/sleep', personaController.prepareSleep.bind(personaController))

export default router
