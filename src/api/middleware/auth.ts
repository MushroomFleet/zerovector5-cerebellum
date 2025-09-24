import { Request, Response, NextFunction } from 'express'
import { DatabaseManager } from '../../core/database/DatabaseManager.js'
import { logger } from '../../utils/logger.js'
import bcrypt from 'bcryptjs'

interface AuthenticatedRequest extends Request {
  apiKeyId?: string
  apiKeyName?: string
}

export async function authMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    // Extract API key from Authorization header
    const authHeader = req.headers.authorization
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        success: false,
        error: 'Authorization header with Bearer token required',
        timestamp: new Date().toISOString()
      })
      return
    }

    const apiKey = authHeader.substring(7) // Remove 'Bearer ' prefix

    if (!apiKey) {
      res.status(401).json({
        success: false,
        error: 'API key is required',
        timestamp: new Date().toISOString()
      })
      return
    }

    // Validate API key
    const db = DatabaseManager.getInstance()
    const apiKeys = await db.all(`
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
          await db.run(`
            UPDATE api_keys SET last_used_at = ? WHERE id = ?
          `, [new Date().toISOString(), storedKey.id])
          
          // Log API usage
          await db.run(`
            INSERT INTO api_usage_log (api_key_id, endpoint, method, timestamp, ip_address, user_agent)
            VALUES (?, ?, ?, ?, ?, ?)
          `, [
            storedKey.id,
            req.path,
            req.method,
            new Date().toISOString(),
            req.ip || req.connection.remoteAddress,
            req.headers['user-agent'] || 'Unknown'
          ])
          
          break
        }
      } catch (compareError) {
        // Continue to next key if comparison fails
        continue
      }
    }

    if (isValid && keyInfo) {
      // Add key info to request for use in controllers
      req.apiKeyId = keyInfo.id
      req.apiKeyName = keyInfo.name
      
      logger.debug(`Authenticated API request: ${keyInfo.name} -> ${req.method} ${req.path}`)
      next()
    } else {
      logger.warn(`Invalid API key attempt: ${req.method} ${req.path} from ${req.ip}`)
      res.status(401).json({
        success: false,
        error: 'Invalid or expired API key',
        timestamp: new Date().toISOString()
      })
    }
  } catch (error) {
    logger.error('Authentication middleware failed:', error)
    res.status(500).json({
      success: false,
      error: 'Authentication system error',
      timestamp: new Date().toISOString()
    })
  }
}
