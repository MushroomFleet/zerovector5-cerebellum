# ZV5-Cerebellum Frontend Integration Guide

## 🎉 **READY FOR FRONTEND INTEGRATION**

ZV5-Cerebellum is fully operational with all systems working, including the embedding model for vector similarity search.

## 🔑 **API Key for Frontend**

**Frontend API Key**: `a6582034b34131ff6f0c40b4937b304e9d63e66617c7dae4c0bc9c659ce69598`

**Usage**: Include in all API requests as Authorization header:
```javascript
Authorization: Bearer a6582034b34131ff6f0c40b4937b304e9d63e66617c7dae4c0bc9c659ce69598
```

## ✅ **System Status - ALL SYSTEMS OPERATIONAL**

- 🗄️ **Database**: SQLite fully initialized with complete schema
- 🧠 **Memory System**: Episodic, semantic, and procedural memory ready
- 👤 **Persona System**: Consciousness and personality evolution active
- 🔍 **Vector Search**: ✅ **WORKING** - Xenova/all-MiniLM-L6-v2 model loaded successfully
- 🔑 **Authentication**: API key system fully operational
- 📡 **API Endpoints**: All 25+ REST endpoints implemented and ready

## 🚀 **Quick Frontend Integration Test**

### 1. Test Server Health
```bash
curl http://localhost:3000/api/health
```
**Expected**: JSON response with `"status":"healthy"`

### 2. Test Authentication
```bash
curl -H "Authorization: Bearer a6582034b34131ff6f0c40b4937b304e9d63e66617c7dae4c0bc9c659ce69598" \
     http://localhost:3000/api/persona/active
```
**Expected**: JSON response with persona data

### 3. Store a Memory
```bash
curl -X POST http://localhost:3000/api/memory/episodes \
  -H "Authorization: Bearer a6582034b34131ff6f0c40b4937b304e9d63e66617c7dae4c0bc9c659ce69598" \
  -H "Content-Type: application/json" \
  -d '{
    "personaId": "auto", 
    "episode": {
      "eventType": "test_interaction",
      "content": "Testing memory storage from frontend",
      "importanceScore": 0.8
    }
  }'
```

### 4. Search Memories (Vector Search)
```bash
curl -X POST http://localhost:3000/api/memory/episodes/search \
  -H "Authorization: Bearer a6582034b34131ff6f0c40b4937b304e9d63e66617c7dae4c0bc9c659ce69598" \
  -H "Content-Type: application/json" \
  -d '{
    "personaId": "auto",
    "query": "testing memory",
    "limit": 5
  }'
```

## 🧠 **Frontend Integration Pattern**

### JavaScript/TypeScript Client
```typescript
class CerebellumClient {
  private apiKey = 'a6582034b34131ff6f0c40b4937b304e9d63e66617c7dae4c0bc9c659ce69598'
  private baseUrl = 'http://localhost:3000/api'

  async request(endpoint: string, options: RequestInit = {}) {
    return fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        ...options.headers
      }
    }).then(r => r.json())
  }

  // Get active persona
  async getActivePersona() {
    return this.request('/persona/active')
  }

  // Store user interaction
  async storeInteraction(userInput: string, importance = 0.6) {
    return this.request('/memory/episodes', {
      method: 'POST',
      body: JSON.stringify({
        personaId: 'auto',
        episode: {
          eventType: 'user_interaction',
          content: userInput,
          importanceScore: importance
        }
      })
    })
  }

  // Search memories with vector similarity
  async searchMemories(query: string, limit = 5) {
    return this.request('/memory/episodes/search', {
      method: 'POST',
      body: JSON.stringify({
        personaId: 'auto',
        query,
        limit
      })
    })
  }

  // Generate reflection
  async generateReflection(context: string) {
    return this.request('/reflection/generate', {
      method: 'POST',
      body: JSON.stringify({ context })
    })
  }
}

// Usage
const cerebellum = new CerebellumClient()
const persona = await cerebellum.getActivePersona()
await cerebellum.storeInteraction("Hello, I'm testing the system!")
const memories = await cerebellum.searchMemories("testing")
```

## 📡 **Available Endpoints**

### Core Memory Operations
- `POST /api/memory/episodes` - Store episodic memory
- `POST /api/memory/episodes/search` - Vector similarity search
- `POST /api/memory/knowledge` - Store semantic knowledge
- `POST /api/memory/knowledge/query` - Query knowledge base

### Persona Management  
- `GET /api/persona/active` - Get current persona state
- `POST /api/persona/:id/experience` - Process new experience
- `GET /api/persona/:id/consciousness` - Get consciousness metrics
- `POST /api/persona/:id/reflection` - Generate reflection

### Frontend Compatibility (Simplified)
- `POST /api/session/initialize` - Initialize session
- `POST /api/memory/update` - Simplified memory update
- `POST /api/memory/search` - Simplified memory search
- `POST /api/interaction/process` - Process user interaction

## 🛡️ **Security & CORS**

- **Authentication**: Required for all endpoints except health checks
- **CORS**: Configured for `localhost:5173` and `localhost:3000`
- **Rate Limiting**: None (local development)
- **API Logging**: All requests logged with usage tracking

## 🔧 **Current Limitations**

- **Single Persona**: One persona per server instance (by design)
- **Local Only**: No remote database support yet
- **Memory Size**: Unlimited (will grow with usage)

## ✅ **Ready for Integration!**

**Status**: All systems operational, embedding model working, API key generated
**Next Step**: Connect your frontend using the provided API key
**Support**: All endpoints documented and tested
**Performance**: Vector similarity search fully functional

---

**ZV5-Cerebellum is ready to serve as your cognitive AI backend!** 🧠✨
