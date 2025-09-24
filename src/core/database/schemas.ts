export const createTablesSQL = `
-- Personas table
CREATE TABLE IF NOT EXISTS personas (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  consciousness_level REAL DEFAULT 0.0,
  created_at TEXT NOT NULL,
  last_active TEXT NOT NULL,
  last_sleep TEXT NOT NULL
);

-- Personality traits
CREATE TABLE IF NOT EXISTS personality_traits (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  persona_id TEXT NOT NULL,
  trait_name TEXT NOT NULL,
  value REAL NOT NULL CHECK(value >= 0 AND value <= 1),
  description TEXT DEFAULT '',
  created_at TEXT NOT NULL,
  last_updated TEXT NOT NULL,
  FOREIGN KEY (persona_id) REFERENCES personas(id) ON DELETE CASCADE,
  UNIQUE(persona_id, trait_name)
);

-- Consciousness states
CREATE TABLE IF NOT EXISTS consciousness_states (
  persona_id TEXT PRIMARY KEY,
  self_awareness REAL DEFAULT 0.0,
  temporal_continuity REAL DEFAULT 0.0,
  social_cognition REAL DEFAULT 0.0,
  metacognition REAL DEFAULT 0.0,
  current_state TEXT DEFAULT 'awake',
  state_context TEXT DEFAULT '{}',
  last_awakening TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (persona_id) REFERENCES personas(id) ON DELETE CASCADE
);

-- Consciousness evolution log
CREATE TABLE IF NOT EXISTS consciousness_evolution_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  persona_id TEXT NOT NULL,
  timestamp TEXT NOT NULL,
  changes TEXT NOT NULL,
  previous_state TEXT NOT NULL,
  new_state TEXT NOT NULL,
  FOREIGN KEY (persona_id) REFERENCES personas(id) ON DELETE CASCADE
);

-- Sleep cycles log
CREATE TABLE IF NOT EXISTS sleep_cycles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  persona_id TEXT NOT NULL,
  sleep_type TEXT NOT NULL,
  duration INTEGER NOT NULL,
  timestamp TEXT NOT NULL,
  consolidation_processed BOOLEAN DEFAULT FALSE,
  FOREIGN KEY (persona_id) REFERENCES personas(id) ON DELETE CASCADE
);

-- Episodic memories
CREATE TABLE IF NOT EXISTS episodic_memories (
  id TEXT PRIMARY KEY,
  persona_id TEXT NOT NULL,
  timestamp TEXT NOT NULL,
  event_type TEXT NOT NULL,
  content TEXT NOT NULL,
  context TEXT DEFAULT '{}',
  emotional_valence REAL DEFAULT 0.0,
  importance_score REAL DEFAULT 0.5,
  participants TEXT DEFAULT '[]',
  location TEXT,
  is_consolidated BOOLEAN DEFAULT FALSE,
  created_at TEXT NOT NULL,
  FOREIGN KEY (persona_id) REFERENCES personas(id) ON DELETE CASCADE
);

-- Semantic knowledge
CREATE TABLE IF NOT EXISTS semantic_knowledge (
  id TEXT PRIMARY KEY,
  persona_id TEXT NOT NULL,
  domain TEXT NOT NULL,
  concept TEXT NOT NULL,
  content TEXT NOT NULL,
  confidence_level REAL NOT NULL CHECK(confidence_level >= 0 AND confidence_level <= 1),
  source TEXT DEFAULT 'experience',
  relationships TEXT DEFAULT '[]',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (persona_id) REFERENCES personas(id) ON DELETE CASCADE
);

-- Procedural skills
CREATE TABLE IF NOT EXISTS procedural_skills (
  id TEXT PRIMARY KEY,
  persona_id TEXT NOT NULL,
  skill_name TEXT NOT NULL,
  domain TEXT NOT NULL,
  pattern TEXT NOT NULL,
  success_rate REAL NOT NULL CHECK(success_rate >= 0 AND success_rate <= 1),
  context_conditions TEXT NOT NULL,
  usage_count INTEGER DEFAULT 1,
  last_used TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (persona_id) REFERENCES personas(id) ON DELETE CASCADE
);

-- API Keys
CREATE TABLE IF NOT EXISTS api_keys (
  id TEXT PRIMARY KEY,
  key_hash TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  is_active BOOLEAN DEFAULT TRUE,
  expires_at TEXT,
  created_at TEXT NOT NULL,
  last_used_at TEXT
);

-- API Key usage log
CREATE TABLE IF NOT EXISTS api_usage_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  api_key_id TEXT NOT NULL,
  endpoint TEXT NOT NULL,
  method TEXT NOT NULL,
  timestamp TEXT NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  FOREIGN KEY (api_key_id) REFERENCES api_keys(id) ON DELETE CASCADE
);

-- Vector embeddings for similarity search
CREATE TABLE IF NOT EXISTS vector_embeddings (
  id TEXT PRIMARY KEY,
  embedding_data BLOB NOT NULL,
  metadata TEXT NOT NULL,
  dimension INTEGER NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_episodic_persona_timestamp ON episodic_memories(persona_id, timestamp);
CREATE INDEX IF NOT EXISTS idx_episodic_event_type ON episodic_memories(event_type);
CREATE INDEX IF NOT EXISTS idx_semantic_persona_domain ON semantic_knowledge(persona_id, domain);
CREATE INDEX IF NOT EXISTS idx_semantic_concept ON semantic_knowledge(concept);
CREATE INDEX IF NOT EXISTS idx_skills_persona_domain ON procedural_skills(persona_id, domain);
CREATE INDEX IF NOT EXISTS idx_consciousness_evolution ON consciousness_evolution_log(persona_id, timestamp);
CREATE INDEX IF NOT EXISTS idx_vector_metadata ON vector_embeddings(metadata);
`;

export const seedDataSQL = `
-- Insert default personality traits for new personas
INSERT OR IGNORE INTO personality_traits (persona_id, trait_name, value, description, created_at, last_updated) VALUES
('__default__', 'openness', 0.5, 'Openness to experience', datetime('now'), datetime('now')),
('__default__', 'conscientiousness', 0.5, 'Conscientiousness and organization', datetime('now'), datetime('now')),
('__default__', 'extraversion', 0.5, 'Extraversion and social energy', datetime('now'), datetime('now')),
('__default__', 'agreeableness', 0.5, 'Agreeableness and cooperation', datetime('now'), datetime('now')),
('__default__', 'neuroticism', 0.3, 'Emotional stability (reverse scored)', datetime('now'), datetime('now'));
`;
