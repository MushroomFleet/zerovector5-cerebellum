import { Request, Response, NextFunction } from 'express'
import { logger } from '../../utils/logger.js'

export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const startTime = Date.now()
  
  // Log the incoming request
  logger.apiRequest(req.method, req.path)
  
  // Override res.end to capture response details
  const originalEnd = res.end
  res.end = function(chunk?: any, encoding?: any): any {
    const duration = Date.now() - startTime
    
    logger.apiRequest(req.method, req.path, res.statusCode, duration)
    
    // Call the original end method
    return originalEnd.call(this, chunk, encoding)
  }

  next()
}
