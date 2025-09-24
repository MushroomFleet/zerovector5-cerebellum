import { Request, Response } from 'express'
import { DatabaseManager } from '../../core/database/DatabaseManager.js'
import { logger } from '../../utils/logger.js'
import bcrypt from 'bcryptjs'
import { randomBytes } from 'crypto'
import { v4 as uuidv4 } from 'uuid'

export class AuthController {
  private db: DatabaseManager

  constructor() {
    this.db = DatabaseManager.getInstance()
  }

  async generateApiKey(req: Request, res: Response): Promise<void> {
    try {
      const { name, description, expiresIn } = req.body

      if (!name || name.trim().length === 0) {
        res.status(400).json({
          success: false,
          error: 'API key name is required'
        })
        return
      }

      // Generate API key
      const keyLength = parseInt(process.env.API_KEY_LENGTH || '32')
      const rawKey = randomBytes(keyLength).toString('hex')
      const keyId = uuidv4()
      
      // Hash the key for storage
      const saltRounds = parseInt(process.env.BCRYPT_ROUNDS || '12')
      const keyHash = await bcrypt.hash(rawKey, saltRounds)
      
      // Calculate expiry date if specified
      let expiresAt = null
      if (expiresIn) {
        expiresAt = new Date(Date.now() + (expiresIn * 24 * 60 * 60 * 1000)).toISOString()
      }

      // Store in database
      const result = await this.db.run(`
        INSERT INTO api_keys (id, key_hash, name, description, expires_at, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `, [keyId, keyHash, name.trim(), description || '', expiresAt, new Date().toISOString()])

      logger.info(`Generated new API key: ${name} (ID: ${keyId})`)

      res.json({
        success: true,
        data: {
          keyId,
          apiKey: rawKey, // Only shown once!
          name: name.trim(),
          description: description || '',
          expiresAt,
          createdAt: new Date().toISOString()
        },
        message: 'API key generated successfully. Save this key - it will not be displayed again!'
      })
    } catch (error) {
      logger.error('Failed to generate API key:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to generate API key'
      })
    }
  }

  async validateApiKey(req: Request, res: Response): Promise<void> {
    try {
      const { apiKey } = req.body

      if (!apiKey) {
        res.status(400).json({
          success: false,
          error: 'API key is required'
        })
        return
      }

      // Get all active API keys
      const apiKeys = await this.db.all(`
        SELECT id, key_hash, name, expires_at FROM api_keys 
        WHERE is_active = 1
      `)

      let isValid = false
      let keyInfo = null

      // Check each key hash
      for (const storedKey of apiKeys) {
        try {
          const matches = await bcrypt.compare(apiKey, storedKey.key_hash)
          if (matches) {
            // Check if expired
            if (storedKey.expires_at && new Date(storedKey.expires_at) < new Date()) {
              continue // Skip expired keys
            }
            
            isValid = true
            keyInfo = {
              id: storedKey.id,
              name: storedKey.name,
              expiresAt: storedKey.expires_at
            }
            
            // Update last used timestamp
            await this.db.run(`
              UPDATE api_keys SET last_used_at = ? WHERE id = ?
            `, [new Date().toISOString(), storedKey.id])
            
            break
          }
        } catch (compareError) {
          // Continue to next key if comparison fails
          continue
        }
      }

      if (isValid && keyInfo) {
        logger.debug(`Valid API key used: ${keyInfo.name}`)
        res.json({
          success: true,
          valid: true,
          keyInfo: {
            id: keyInfo.id,
            name: keyInfo.name,
            expiresAt: keyInfo.expiresAt
          }
        })
      } else {
        logger.warn('Invalid API key attempt')
        res.status(401).json({
          success: false,
          valid: false,
          error: 'Invalid or expired API key'
        })
      }
    } catch (error) {
      logger.error('Failed to validate API key:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to validate API key'
      })
    }
  }

  async listApiKeys(req: Request, res: Response): Promise<void> {
    try {
      const keys = await this.db.all(`
        SELECT id, name, description, is_active, expires_at, created_at, last_used_at
        FROM api_keys 
        ORDER BY created_at DESC
      `)

      res.json({
        success: true,
        data: keys.map(key => ({
          id: key.id,
          name: key.name,
          description: key.description,
          isActive: !!key.is_active,
          expiresAt: key.expires_at,
          createdAt: key.created_at,
          lastUsedAt: key.last_used_at
        }))
      })
    } catch (error) {
      logger.error('Failed to list API keys:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve API keys'
      })
    }
  }

  async revokeApiKey(req: Request, res: Response): Promise<void> {
    try {
      const { keyId } = req.params

      if (!keyId) {
        res.status(400).json({
          success: false,
          error: 'Key ID is required'
        })
        return
      }

      const result = await this.db.run(`
        UPDATE api_keys SET is_active = 0 WHERE id = ?
      `, [keyId])

      if (result.changes === 0) {
        res.status(404).json({
          success: false,
          error: 'API key not found'
        })
        return
      }

      logger.info(`API key revoked: ${keyId}`)

      res.json({
        success: true,
        message: 'API key revoked successfully'
      })
    } catch (error) {
      logger.error('Failed to revoke API key:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to revoke API key'
      })
    }
  }
}
