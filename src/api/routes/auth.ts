import express from 'express'
import { AuthController } from '../controllers/AuthController.js'
import { z } from 'zod'

const router = express.Router()
const authController = new AuthController()

// Validation schemas
const generateKeySchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  expiresIn: z.number().optional() // days
})

const validateKeySchema = z.object({
  apiKey: z.string().min(1)
})

// Generate API key
router.post('/generate-key', async (req, res) => {
  try {
    const validation = generateKeySchema.safeParse(req.body)
    if (!validation.success) {
      res.status(400).json({
        success: false,
        error: 'Invalid request data',
        details: validation.error.errors
      })
      return
    }
    
    await authController.generateApiKey(req, res)
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to generate API key'
    })
  }
})

// Validate API key
router.post('/validate', async (req, res) => {
  try {
    const validation = validateKeySchema.safeParse(req.body)
    if (!validation.success) {
      res.status(400).json({
        success: false,
        error: 'Invalid request data',
        details: validation.error.errors
      })
      return
    }
    
    await authController.validateApiKey(req, res)
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to validate API key'
    })
  }
})

// List API keys
router.get('/keys', authController.listApiKeys.bind(authController))

// Revoke API key  
router.delete('/revoke-key/:keyId', authController.revokeApiKey.bind(authController))

export default router
