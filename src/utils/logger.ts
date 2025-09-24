import { existsSync, mkdirSync, appendFileSync } from 'fs'
import { dirname } from 'path'

export interface LogLevel {
  ERROR: 0
  WARN: 1
  INFO: 2
  DEBUG: 3
}

const LOG_LEVELS: LogLevel = {
  ERROR: 0,
  WARN: 1,
  INFO: 2,
  DEBUG: 3
}

class Logger {
  private logLevel: number
  private logFile: string | null
  private maxLogFiles: number

  constructor() {
    this.logLevel = this.parseLogLevel(process.env.LOG_LEVEL || 'info')
    this.logFile = process.env.LOG_FILE || null
    this.maxLogFiles = parseInt(process.env.MAX_LOG_FILES || '7')
    
    if (this.logFile) {
      this.ensureLogDirectory()
    }
  }

  private parseLogLevel(level: string): number {
    const upperLevel = level.toUpperCase() as keyof LogLevel
    return LOG_LEVELS[upperLevel] ?? LOG_LEVELS.INFO
  }

  private ensureLogDirectory(): void {
    if (this.logFile) {
      const logDir = dirname(this.logFile)
      if (!existsSync(logDir)) {
        mkdirSync(logDir, { recursive: true })
      }
    }
  }

  private formatMessage(level: string, message: string, ...args: any[]): string {
    const timestamp = new Date().toISOString()
    const formattedArgs = args.length > 0 ? ' ' + args.map(arg => 
      typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
    ).join(' ') : ''
    
    return `[${timestamp}] [${level}] ${message}${formattedArgs}`
  }

  private writeToFile(formattedMessage: string): void {
    if (this.logFile) {
      try {
        appendFileSync(this.logFile, formattedMessage + '\n')
      } catch (error) {
        console.error('Failed to write to log file:', error)
      }
    }
  }

  private log(level: keyof LogLevel, message: string, ...args: any[]): void {
    const numericLevel = LOG_LEVELS[level]
    
    if (numericLevel <= this.logLevel) {
      const formattedMessage = this.formatMessage(level, message, ...args)
      
      // Write to console
      switch (level) {
        case 'ERROR':
          console.error(formattedMessage)
          break
        case 'WARN':
          console.warn(formattedMessage)
          break
        case 'INFO':
          console.info(formattedMessage)
          break
        case 'DEBUG':
          console.debug(formattedMessage)
          break
      }
      
      // Write to file if configured
      this.writeToFile(formattedMessage)
    }
  }

  public error(message: string, ...args: any[]): void {
    this.log('ERROR', message, ...args)
  }

  public warn(message: string, ...args: any[]): void {
    this.log('WARN', message, ...args)
  }

  public info(message: string, ...args: any[]): void {
    this.log('INFO', message, ...args)
  }

  public debug(message: string, ...args: any[]): void {
    this.log('DEBUG', message, ...args)
  }

  // Structured logging methods for specific contexts
  public apiRequest(method: string, path: string, statusCode?: number, duration?: number): void {
    const message = `${method} ${path}${statusCode ? ` - ${statusCode}` : ''}${duration ? ` (${duration}ms)` : ''}`
    this.info(`[API] ${message}`)
  }

  public databaseOperation(operation: string, table: string, duration?: number): void {
    const message = `${operation} on ${table}${duration ? ` (${duration}ms)` : ''}`
    this.debug(`[DB] ${message}`)
  }

  public memoryOperation(operation: string, personaId: string, type: string, count?: number): void {
    const message = `${operation} ${type} for persona ${personaId}${count ? ` (${count} items)` : ''}`
    this.info(`[MEMORY] ${message}`)
  }

  public consciousnessUpdate(personaId: string, changes: any): void {
    this.info(`[CONSCIOUSNESS] Persona ${personaId} consciousness updated:`, changes)
  }

  public personaActivity(personaId: string, activity: string, details?: any): void {
    const message = `Persona ${personaId}: ${activity}`
    this.info(`[PERSONA] ${message}`, details || '')
  }

  // Log rotation (simple implementation)
  public rotateLog(): void {
    if (!this.logFile) return

    try {
      const fs = require('fs')
      const path = require('path')
      
      const logDir = dirname(this.logFile)
      const logName = path.basename(this.logFile, path.extname(this.logFile))
      const logExt = path.extname(this.logFile)
      
      // Rotate existing logs
      for (let i = this.maxLogFiles - 1; i > 0; i--) {
        const oldFile = path.join(logDir, `${logName}.${i}${logExt}`)
        const newFile = path.join(logDir, `${logName}.${i + 1}${logExt}`)
        
        if (fs.existsSync(oldFile)) {
          if (i === this.maxLogFiles - 1) {
            fs.unlinkSync(oldFile) // Delete oldest
          } else {
            fs.renameSync(oldFile, newFile)
          }
        }
      }
      
      // Move current log to .1
      if (fs.existsSync(this.logFile)) {
        const rotatedFile = path.join(logDir, `${logName}.1${logExt}`)
        fs.renameSync(this.logFile, rotatedFile)
      }
      
      this.info('Log rotation completed')
    } catch (error) {
      this.error('Failed to rotate log:', error)
    }
  }

  public setLogLevel(level: string): void {
    this.logLevel = this.parseLogLevel(level)
    this.info(`Log level changed to: ${level.toUpperCase()}`)
  }
}

export const logger = new Logger()
