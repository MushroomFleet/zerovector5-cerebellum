import { pipeline } from '@xenova/transformers'
import { logger } from '../../utils/logger.js'

export class EmbeddingGenerator {
  private static instance: EmbeddingGenerator
  private pipeline: any | null = null
  private modelName: string
  private maxDimension: number
  private isInitializing: boolean = false
  private initializationPromise: Promise<void> | null = null

  private constructor() {
    // Try a more accessible model first
    this.modelName = process.env.EMBEDDING_MODEL || 'Xenova/all-MiniLM-L6-v2'
    this.maxDimension = parseInt(process.env.MAX_EMBEDDING_DIMENSION || '384')
  }

  public static getInstance(): EmbeddingGenerator {
    if (!EmbeddingGenerator.instance) {
      EmbeddingGenerator.instance = new EmbeddingGenerator()
    }
    return EmbeddingGenerator.instance
  }

  public async initialize(): Promise<void> {
    if (this.pipeline) {
      return // Already initialized
    }

    if (this.isInitializing) {
      return this.initializationPromise! // Wait for existing initialization
    }

    this.isInitializing = true
    this.initializationPromise = this.loadPipeline()
    
    try {
      await this.initializationPromise
      logger.info(`Embedding model ${this.modelName} initialized successfully`)
    } finally {
      this.isInitializing = false
      this.initializationPromise = null
    }
  }

  private async loadPipeline(): Promise<void> {
    try {
      logger.info(`Loading embedding model: ${this.modelName}`)
      logger.info('Attempting to load @xenova/transformers pipeline...')
      
      this.pipeline = await pipeline('feature-extraction', this.modelName, {
        quantized: true, // Use quantized model for better performance
        progress_callback: (progress: any) => {
          logger.info(`Model download progress: ${progress.status} - ${Math.round(progress.progress || 0)}%`)
        }
      })
      
      logger.info('Pipeline loaded successfully!')
    } catch (error) {
      logger.error('Failed to load embedding model - detailed error:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        name: error instanceof Error ? error.name : undefined,
        modelName: this.modelName,
        errorType: typeof error,
        errorString: String(error)
      })
      throw error
    }
  }

  public async generateEmbedding(text: string): Promise<number[]> {
    if (!this.pipeline) {
      await this.initialize()
    }

    if (!this.pipeline) {
      throw new Error('Embedding pipeline not initialized')
    }

    try {
      const startTime = Date.now()
      
      // Clean and prepare text
      const cleanText = this.preprocessText(text)
      
      // Generate embedding
      const result = await this.pipeline(cleanText, {
        pooling: 'mean',
        normalize: true
      })

      // Extract embedding array
      const embedding = Array.from(result.data) as number[]
      
      // Validate dimensions
      if (embedding.length !== this.maxDimension) {
        logger.warn(`Embedding dimension mismatch: expected ${this.maxDimension}, got ${embedding.length}`)
      }

      const duration = Date.now() - startTime
      logger.debug(`Generated embedding for text (${cleanText.length} chars) in ${duration}ms`)

      return embedding
    } catch (error) {
      logger.error('Failed to generate embedding:', error)
      throw error
    }
  }

  public async generateBatchEmbeddings(texts: string[]): Promise<number[][]> {
    if (!this.pipeline) {
      await this.initialize()
    }

    const startTime = Date.now()
    const embeddings: number[][] = []

    // Process in smaller batches to avoid memory issues
    const batchSize = 10
    for (let i = 0; i < texts.length; i += batchSize) {
      const batch = texts.slice(i, i + batchSize)
      const batchPromises = batch.map(text => this.generateEmbedding(text))
      const batchResults = await Promise.all(batchPromises)
      embeddings.push(...batchResults)
    }

    const duration = Date.now() - startTime
    logger.debug(`Generated ${embeddings.length} embeddings in ${duration}ms`)

    return embeddings
  }

  public calculateSimilarity(embedding1: number[], embedding2: number[]): number {
    if (embedding1.length !== embedding2.length) {
      throw new Error('Embeddings must have the same dimension')
    }

    // Calculate cosine similarity
    let dotProduct = 0
    let norm1 = 0
    let norm2 = 0

    for (let i = 0; i < embedding1.length; i++) {
      dotProduct += embedding1[i] * embedding2[i]
      norm1 += embedding1[i] * embedding1[i]
      norm2 += embedding2[i] * embedding2[i]
    }

    const similarity = dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2))
    return Math.max(-1, Math.min(1, similarity)) // Clamp to [-1, 1]
  }

  public findTopSimilar(
    queryEmbedding: number[], 
    candidateEmbeddings: Array<{ id: string; embedding: number[]; metadata?: any }>,
    limit: number = 10,
    threshold: number = 0.7
  ): Array<{ id: string; score: number; metadata?: any }> {
    const similarities = candidateEmbeddings.map(candidate => ({
      id: candidate.id,
      score: this.calculateSimilarity(queryEmbedding, candidate.embedding),
      metadata: candidate.metadata
    }))

    // Filter by threshold and sort by similarity
    return similarities
      .filter(item => item.score >= threshold)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
  }

  private preprocessText(text: string): string {
    if (!text || typeof text !== 'string') {
      return ''
    }

    // Basic text cleaning
    return text
      .trim()
      .replace(/\s+/g, ' ') // Normalize whitespace
      .replace(/[^\w\s.,!?;:'"()-]/g, '') // Remove special characters
      .substring(0, 8192) // Limit length to avoid model limits
  }

  public getModelInfo(): any {
    return {
      name: this.modelName,
      maxDimension: this.maxDimension,
      initialized: !!this.pipeline,
      isInitializing: this.isInitializing
    }
  }

  public async warmUp(): Promise<void> {
    await this.initialize()
    
    // Generate a test embedding to warm up the model
    const testText = "This is a test sentence for model warm-up."
    await this.generateEmbedding(testText)
    
    logger.info('Embedding model warmed up successfully')
  }

  public async cleanup(): Promise<void> {
    if (this.pipeline) {
      // The transformers library doesn't have explicit cleanup
      // but we can clear the reference
      this.pipeline = null
      logger.info('Embedding pipeline cleaned up')
    }
  }
}
