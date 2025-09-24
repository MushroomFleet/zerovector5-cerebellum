import { Request } from 'express'

export interface AuthenticatedRequest extends Request {
  apiKeyId?: string
  user?: {
    id: string
    name: string
  }
}

export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  message?: string
  timestamp: string
}

export interface ApiKey {
  id: string
  name: string
  description: string
  isActive: boolean
  expiresAt?: Date
  createdAt: Date
  lastUsedAt?: Date
}

export interface ApiUsageLog {
  id: number
  apiKeyId: string
  endpoint: string
  method: string
  timestamp: Date
  ipAddress?: string
  userAgent?: string
}

export interface PaginationParams {
  page?: number
  limit?: number
  offset?: number
}

export interface SearchParams extends PaginationParams {
  query: string
  filters?: Record<string, any>
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

export interface HealthCheckResponse {
  status: 'healthy' | 'degraded' | 'unhealthy'
  timestamp: string
  version: string
  uptime: number
  database: {
    connected: boolean
    stats?: any
  }
  memory: {
    used: number
    available: number
  }
  services: Record<string, {
    status: 'healthy' | 'degraded' | 'unhealthy'
    details?: any
  }>
}

// Frontend Compatibility Types
export interface FrontendPersona {
  id: string
  name: string
  personality: string
  coreMemories: string[]
  preferences: Record<string, any>
  lastActive: Date
}

export interface FrontendMemoryContext {
  shortTerm: FrontendMemoryEntry[]
  longTerm: FrontendMemoryEntry[]
  dreamState: FrontendMemoryEntry[]
  reflections: string[]
}

export interface FrontendMemoryEntry {
  id: string
  content: string
  timestamp: Date
  importance: number
  tags: string[]
}

export interface SessionInitResponse {
  persona: FrontendPersona
  memoryContext: FrontendMemoryContext
}

export interface MemoryUpdateRequest {
  sessionId?: string
  newMemory: {
    content: string
    context?: any
    importance?: number
    tags?: string[]
  }
  context: string
}

export interface MemorySearchRequest {
  query: string
  limit?: number
  sessionId?: string
}

export interface ReflectionRequest {
  context: string
  sessionId?: string
}

export interface ReflectionResponse {
  reflection: string
}
