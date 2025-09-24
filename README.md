# ZV5-Cerebellum: Memory & Persona API Server

## 🧠 Overview

**ZV5-Cerebellum** is a fully functional TypeScript server that provides comprehensive memory and persona management services for cognitive AI systems. It operates as a dedicated "Cerebellum" microservice, handling all persistent memory operations, persona state management, and consciousness continuity functions.

## ✅ Current Status: **FULLY OPERATIONAL**

- 🚀 **Server Running**: Express API server on port 3000
- 🗄️ **Database Active**: SQLite with complete schema and auto-initialization  
- 🧠 **Memory System**: Full episodic, semantic, and procedural memory management
- 👤 **Persona System**: Single persona consciousness with personality evolution
- 🔑 **Authentication**: Complete API key management system
- 🌐 **API Ready**: All REST endpoints implemented and documented

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- npm

### Installation & Startup
```bash
# Clone and install
npm install

# Start development server
npm run dev

# The server will start on http://localhost:3000
# Health check: http://localhost:3000/api/health
```

### First Run Behavior
- **Database**: Automatically creates `./database/cerebellum.db`
- **Schema**: All tables created and seeded
- **Persona**: Default persona automatically generated
- **API Key**: System generates initial API key (displayed in console logs)

## 📡 API Endpoints

### Authentication
- `POST /api/auth/generate-key` - Generate new API key
- `POST /api/auth/validate` - Validate API key
- `GET /api/auth/keys` - List all API keys
- `DELETE /api/auth/revoke-key/:keyId` - Revoke API key

### Memory Management
- `POST /api/memory/episodes` - Store episodic memory
- `POST /api/memory/episodes/search` - Search episodes
- `GET /api/memory/episodes/:personaId/recent` - Get recent episodes
- `POST /api/memory/knowledge` - Store semantic knowledge
- `POST /api/memory/knowledge/query` - Query knowledge
- `GET /api/memory/knowledge/:personaId/graph` - Get knowledge graph
- `POST /api/memory/skills` - Store procedural skill
- `GET /api/memory/skills/:personaId/:context` - Get applicable skills
- `POST /api/memory/consolidate/:personaId` - Consolidate memories
- `GET /api/memory/stats/:personaId` - Memory statistics

### Persona Management
- `GET /api/persona/active` - Get active persona (single persona server)
- `GET /api/persona/:personaId` - Get persona profile
- `PATCH /api/persona/:personaId/traits` - Update personality trait
- `POST /api/persona/:personaId/evolve` - Evolve personality from experience
- `PATCH /api/persona/:personaId/consciousness` - Update consciousness
- `GET /api/persona/:personaId/consciousness` - Get consciousness state
- `GET /api/persona/:personaId/consciousness/metrics` - Consciousness metrics
- `POST /api/persona/:personaId/experience` - Process experience
- `POST /api/persona/:personaId/reflection` - Generate reflection
- `GET /api/persona/:personaId/insights` - Get persona insights
- `GET /api/persona/:personaId/stats` - Persona statistics
- `POST /api/persona/:personaId/sleep` - Prepare for sleep

### Frontend Compatibility Layer
- `POST /api/session/initialize` - Initialize frontend session
- `GET /api/persona/active` - Get active persona (simplified)
- `POST /api/memory/update` - Update memory (simplified)
- `POST /api/memory/search` - Search memory (simplified)
- `POST /api/reflection/generate` - Generate reflection (simplified)
- `POST /api/interaction/process` - Process user interaction

### System Health
- `GET /api/health` - Basic health check
- `GET /api/health/detailed` - Detailed system status

## 🔑 Authentication

All API endpoints (except health and auth generation) require authentication via API key:

```bash
# Example authenticated request
curl -H "Authorization: Bearer YOUR_API_KEY" \
     -H "Content-Type: application/json" \
     http://localhost:3000/api/persona/active
```

## 📋 API Usage Examples

### Generate API Key
```bash
curl -X POST http://localhost:3000/api/auth/generate-key \
  -H "Content-Type: application/json" \
  -d '{"name": "MyApp", "description": "My cognitive app"}'
```

### Store Episode Memory
```bash
curl -X POST http://localhost:3000/api/memory/episodes \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "personaId": "persona_123", 
    "episode": {
      "eventType": "conversation",
      "content": "User asked about memory systems",
      "emotionalValence": 0.3,
      "importanceScore": 0.7
    }
  }'
```

### Search Memories
```bash
curl -X POST http://localhost:3000/api/memory/episodes/search \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "personaId": "persona_123",
    "query": "conversation about memory",
    "limit": 5
  }'
```

### Get Active Persona
```bash
curl -H "Authorization: Bearer YOUR_API_KEY" \
     http://localhost:3000/api/persona/active
```

## 🏗️ Architecture

### Single Persona Design
- **One Server = One Persona**: Each instance manages a single dedicated persona
- **Time-Aware Consciousness**: Tracks time passage and maintains continuity
- **Memory Consolidation**: Automatic processing during sleep cycles
- **Personality Evolution**: Dynamic trait adjustment from experiences

### Memory System
- **Episodic Memory**: Personal experiences and events
- **Semantic Memory**: Knowledge and concepts with confidence levels
- **Procedural Memory**: Skills and learned patterns
- **Vector Search**: Similarity-based memory retrieval (when embeddings work)

### Database
- **SQLite**: Local, persistent storage with WAL mode
- **Auto-Migration**: Schema creates automatically on first run
- **Indexing**: Optimized for memory and persona queries

## 🛠️ Development

### Available Scripts
```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run type-check   # TypeScript checking
npm run lint         # Code linting
```

### Environment Configuration
Copy `.env.example` to `.env` and customize:
- Database path
- API key settings
- CORS origins
- Logging configuration

## 🔧 Integration

### JavaScript/TypeScript Client
```typescript
class CerebellumClient {
  constructor(apiKey: string, baseUrl = 'http://localhost:3000/api') {
    this.apiKey = apiKey
    this.baseUrl = baseUrl
  }

  async storeEpisode(personaId: string, episode: any) {
    return fetch(`${this.baseUrl}/memory/episodes`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ personaId, episode })
    }).then(r => r.json())
  }

  async getActivePersona() {
    return fetch(`${this.baseUrl}/persona/active`, {
      headers: { 'Authorization': `Bearer ${this.apiKey}` }
    }).then(r => r.json())
  }
}
```

## 🎯 Next Steps

### For External Frontend Integration:
1. **Get API Key**: Generate via `/api/auth/generate-key`
2. **Test Health**: Verify server at `/api/health`
3. **Initialize Persona**: Call `/api/persona/active` 
4. **Store Memories**: Use `/api/memory/*` endpoints
5. **Track Evolution**: Monitor consciousness and personality changes

### Optional Enhancements:
- Fix embedding model loading for vector search capabilities
- Add WebSocket support for real-time updates
- Implement backup/restore functionality
- Add performance monitoring

## 📊 System Status

**Core Systems**: ✅ All operational  
**Database**: ✅ SQLite with full schema  
**API Endpoints**: ✅ All implemented  
**Authentication**: ✅ API key system active  
**Memory System**: ✅ Full CRUD operations  
**Persona System**: ✅ Consciousness and evolution  
**Vector Search**: ⚠️ Limited (embeddings loading issue)  

---

**ZV5-Cerebellum is ready for production use as a cognitive AI memory and persona backend!** 🧠✨
