# YouTube Fact-Checker - Complete System Design

## System Overview

### High-Level Architecture
```
┌─────────────────────┐
│   Chrome Extension  │ ←─── User watches YouTube video
│   (React/TypeScript)│
└──────────┬──────────┘
           │ HTTP/WebSocket
           ▼
┌─────────────────────┐
│   FastAPI Backend   │ ←─── API Gateway & WebSocket handler
│   (Python/AsyncIO) │
└──────────┬──────────┘
           │
           ├─── Supabase (PostgreSQL + Real-time)
           │    └─── Stores: videos, claims, fact_checks, jobs
           │
           └─── Celery + Redis
                └─── Async Tasks: transcription, claim extraction, fact-checking
```

## Detailed Data Flow

### Phase 1: Video Detection & Initialization
1. **Chrome Extension** detects YouTube video page load
2. **Extract video ID** from URL (`v=dQw4w9WgXcQ`)
3. **POST /api/v1/videos/process** with video URL
4. **FastAPI** creates video record in Supabase
5. **Queue Celery task** `process_video_pipeline.delay(video_id)`
6. **Return response** with job ID to extension
7. **Extension establishes WebSocket** connection for real-time updates

### Phase 2: Video Processing Pipeline (Celery Tasks)
```
process_video_pipeline(video_id)
├── extract_video_metadata(video_id)
│   ├── YouTube API call for title, duration, description
│   └── Update video record in Supabase
│
├── transcribe_video(video_id)
│   ├── Download audio using yt-dlp
│   ├── Call AssemblyAI/Whisper API
│   ├── Store transcript with timestamps
│   └── Trigger real-time update: "transcription_complete"
│
├── chunk_transcript(video_id)
│   ├── Split transcript into semantic chunks (30-60 seconds)
│   ├── Preserve timestamp boundaries
│   ├── Store chunks in database
│   └── Trigger real-time update: "chunking_complete"
│
├── extract_claims_parallel(video_id)
│   ├── For each chunk: queue extract_claims_from_chunk.delay(chunk_id)
│   ├── extract_claims_from_chunk(chunk_id):
│   │   ├── Call OpenAI GPT-4 with chunk text
│   │   ├── Extract factual claims with confidence scores
│   │   ├── Store claims in database
│   │   └── Trigger real-time update: "claim_found" for each claim
│   └── Wait for all chunk processing to complete
│
└── fact_check_claims_parallel(video_id)
    ├── Get all pending claims for video
    ├── For each claim: queue fact_check_claim.delay(claim_id)
    ├── fact_check_claim(claim_id):
    │   ├── Generate search queries from claim
    │   ├── Search Google/Bing for evidence
    │   ├── Call OpenAI GPT-4 to analyze evidence vs claim
    │   ├── Store fact-check result
    │   └── Trigger real-time update: "fact_check_complete"
    └── Mark video processing as complete
```

### Phase 3: Real-Time Updates (Supabase + WebSocket)
1. **Supabase Real-time** detects database changes
2. **FastAPI WebSocket handler** receives Supabase events
3. **Filter events** by video_id for connected clients
4. **Send updates** to Chrome Extension via WebSocket
5. **Extension updates UI** with new claims/fact-checks

### Phase 4: UI Display (Chrome Extension)
1. **Receive real-time updates** via WebSocket
2. **Store claims/fact-checks** in local state
3. **Track video timestamp** using YouTube player API
4. **Display overlays** when current time matches claim timestamps
5. **Show fact-check badges** with expandable details

## Backend Folder Structure

```
backend/
├── app/
│   ├── __init__.py
│   ├── main.py                     # FastAPI app entry point
│   ├── config.py                   # Configuration settings
│   ├── database.py                 # Supabase client setup
│   ├── dependencies.py             # FastAPI dependency injection
│   │
│   ├── api/                        # API Route Handlers
│   │   ├── __init__.py
│   │   ├── v1/
│   │   │   ├── __init__.py
│   │   │   ├── videos.py           # Video processing endpoints
│   │   │   ├── claims.py           # Claims and fact-checks endpoints
│   │   │   ├── websocket.py        # WebSocket handlers
│   │   │   └── admin.py            # Admin/monitoring endpoints
│   │   └── deps.py                 # API dependencies
│   │
│   ├── core/                       # Business Logic Layer
│   │   ├── __init__.py
│   │   ├── video_processor.py      # Video processing orchestration
│   │   ├── transcription.py        # Transcription logic
│   │   ├── claim_extractor.py      # Claim extraction logic
│   │   ├── fact_checker.py         # Fact-checking logic
│   │   ├── chunking.py             # Text chunking with timestamps
│   │   └── search_engine.py        # Web search integration
│   │
│   ├── models/                     # Database Models (Pydantic)
│   │   ├── __init__.py
│   │   ├── video.py                # Video model
│   │   ├── transcript.py           # Transcript and chunk models
│   │   ├── claim.py                # Claim model
│   │   ├── fact_check.py           # Fact-check model
│   │   └── job.py                  # Processing job model
│   │
│   ├── schemas/                    # API Request/Response Schemas
│   │   ├── __init__.py
│   │   ├── video.py                # Video API schemas
│   │   ├── claim.py                # Claim API schemas
│   │   ├── fact_check.py           # Fact-check API schemas
│   │   └── common.py               # Common schemas (pagination, etc.)
│   │
│   ├── services/                   # External Service Integrations
│   │   ├── __init__.py
│   │   ├── youtube_service.py      # YouTube API integration
│   │   ├── transcription_service.py # AssemblyAI/Whisper integration
│   │   ├── llm_service.py          # OpenAI GPT-4 integration
│   │   ├── search_service.py       # Google/Bing Search integration
│   │   ├── supabase_service.py     # Supabase operations
│   │   └── websocket_manager.py    # WebSocket connection management
│   │
│   ├── tasks/                      # Celery Tasks
│   │   ├── __init__.py
│   │   ├── celery_app.py           # Celery configuration
│   │   ├── video_processing.py     # Main video processing pipeline
│   │   ├── transcription_tasks.py  # Transcription tasks
│   │   ├── claim_extraction_tasks.py # Claim extraction tasks
│   │   ├── fact_checking_tasks.py  # Fact-checking tasks
│   │   └── cleanup_tasks.py        # Cleanup and maintenance tasks
│   │
│   └── utils/                      # Utility Functions
│       ├── __init__.py
│       ├── logging_config.py       # Logging setup
│       ├── exceptions.py           # Custom exceptions
│       ├── helpers.py              # General helper functions
│       ├── youtube_utils.py        # YouTube-specific utilities
│       └── text_processing.py      # Text processing utilities
│
├── supabase/                       # Supabase Configuration
│   ├── config.toml                 # Supabase config
│   ├── seed.sql                    # Initial data
│   └── migrations/
│       ├── 20231201000001_initial_schema.sql
│       ├── 20231201000002_add_indexes.sql
│       └── 20231201000003_setup_realtime.sql
│
├── tests/                          # Test Suite (minimal for hackathon)
│   ├── __init__.py
│   ├── conftest.py                 # Test configuration
│   ├── test_api/                   # API endpoint tests
│   ├── test_core/                  # Business logic tests
│   └── test_services/              # Service integration tests
│
├── scripts/                        # Utility Scripts
│   ├── setup_local.sh              # Local development setup
│   ├── run_celery.sh               # Start Celery workers
│   ├── migrate_db.sh               # Run database migrations
│   └── seed_data.py                # Seed test data
│
├── requirements.txt                # Python dependencies
├── requirements-dev.txt            # Development dependencies
├── docker-compose.yml              # Local development services
├── Dockerfile                      # Backend container
├── .env.example                    # Environment variables template
├── .gitignore
└── README.md
```

## Chrome Extension Structure

```
frontend/
├── manifest.json                   # Extension manifest
├── package.json                    # Node.js dependencies
├── webpack.config.js               # Build configuration
├── tsconfig.json                   # TypeScript configuration
│
├── src/
│   ├── background/                 # Service Worker (Manifest V3)
│   │   ├── background.ts           # Main service worker
│   │   ├── youtube_detector.ts     # YouTube page detection
│   │   └── api_client.ts           # Backend API communication
│   │
│   ├── content/                    # Content Scripts
│   │   ├── content.ts              # Main content script
│   │   ├── video_overlay.tsx       # React overlay component
│   │   ├── timestamp_tracker.ts    # Video timestamp tracking
│   │   ├── fact_check_display.tsx  # Fact-check UI components
│   │   └── youtube_integration.ts  # YouTube player integration
│   │
│   ├── popup/                      # Extension Popup
│   │   ├── popup.tsx               # Main popup component
│   │   ├── popup.html              # Popup HTML
│   │   └── settings.tsx            # Settings component
│   │
│   ├── components/                 # Reusable React Components
│   │   ├── FactCheckBadge.tsx      # Fact-check status badge
│   │   ├── ClaimOverlay.tsx        # Individual claim overlay
│   │   ├── LoadingSpinner.tsx      # Loading indicator
│   │   ├── ProgressBar.tsx         # Processing progress
│   │   └── EvidenceModal.tsx       # Evidence details modal
│   │
│   ├── services/                   # Service Layer
│   │   ├── api_service.ts          # Backend API calls
│   │   ├── websocket_service.ts    # WebSocket connection
│   │   ├── storage_service.ts      # Chrome storage API
│   │   └── supabase_client.ts      # Direct Supabase client
│   │
│   ├── types/                      # TypeScript Type Definitions
│   │   ├── video.ts                # Video-related types
│   │   ├── claim.ts                # Claim-related types
│   │   ├── fact_check.ts           # Fact-check types
│   │   └── api.ts                  # API response types
│   │
│   ├── utils/                      # Utility Functions
│   │   ├── youtube_utils.ts        # YouTube-specific utilities
│   │   ├── time_utils.ts           # Timestamp formatting
│   │   ├── dom_utils.ts            # DOM manipulation
│   │   └── constants.ts            # App constants
│   │
│   └── styles/                     # CSS/SCSS Styles
│       ├── overlay.scss            # Overlay styles
│       ├── popup.scss              # Popup styles
│       └── components.scss         # Component styles
│
├── public/                         # Static Assets
│   ├── icons/                      # Extension icons
│   │   ├── icon16.png
│   │   ├── icon48.png
│   │   └── icon128.png
│   └── images/                     # UI images
│
├── dist/                           # Built extension (generated)
└── .env.example                    # Environment variables
```

## API Endpoint Specification

### Core Endpoints
```
POST   /api/v1/videos/process       # Start video processing
GET    /api/v1/videos/{id}/status   # Get processing status
GET    /api/v1/videos/{id}/claims   # Get all claims
GET    /api/v1/videos/{id}/fact-checks # Get fact-check results
WS     /ws/video/{id}               # Real-time updates WebSocket

GET    /api/v1/admin/stats          # System statistics
GET    /health                      # Health check
```

## Database Schema (Supabase)

### Core Tables
```sql
-- videos: Video metadata and processing status
videos (
  id UUID PRIMARY KEY,
  video_id TEXT UNIQUE,           -- YouTube video ID
  url TEXT,                       -- Full YouTube URL
  title TEXT,                     -- Video title
  duration INTEGER,               -- Duration in seconds
  status TEXT,                    -- queued, processing, completed, failed
  metadata JSONB,                 -- Additional metadata
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)

-- transcripts: Full video transcriptions
transcripts (
  id UUID PRIMARY KEY,
  video_id UUID REFERENCES videos(id),
  full_text TEXT,                 -- Complete transcript
  language TEXT,                  -- Detected language
  confidence DECIMAL(3,2),        -- Overall confidence
  service TEXT,                   -- transcription service used
  created_at TIMESTAMPTZ
)

-- transcript_chunks: Time-segmented transcript pieces
transcript_chunks (
  id UUID PRIMARY KEY,
  transcript_id UUID REFERENCES transcripts(id),
  text TEXT,                      -- Chunk text
  start_time DECIMAL(10,3),       -- Start timestamp
  end_time DECIMAL(10,3),         -- End timestamp
  confidence DECIMAL(3,2),        -- Chunk confidence
  speaker TEXT,                   -- Speaker identification (optional)
  chunk_index INTEGER,            -- Order in transcript
  created_at TIMESTAMPTZ
)

-- claims: Extracted factual claims
claims (
  id UUID PRIMARY KEY,
  chunk_id UUID REFERENCES transcript_chunks(id),
  text TEXT,                      -- Claim text
  category TEXT,                  -- science, politics, health, etc.
  confidence DECIMAL(3,2),        -- Extraction confidence
  start_time DECIMAL(10,3),       -- Claim start time
  end_time DECIMAL(10,3),         -- Claim end time
  status TEXT DEFAULT 'pending',  -- pending, processing, completed
  created_at TIMESTAMPTZ
)

-- fact_checks: Fact-checking results
fact_checks (
  id UUID PRIMARY KEY,
  claim_id UUID REFERENCES claims(id),
  status TEXT,                    -- verified, disputed, false, inconclusive
  confidence DECIMAL(3,2),        -- Fact-check confidence
  explanation TEXT,               -- Human-readable explanation
  evidence JSONB,                 -- Supporting evidence array
  sources JSONB,                  -- Source URLs and metadata
  search_queries JSONB,           -- Queries used for fact-checking
  created_at TIMESTAMPTZ
)

-- processing_jobs: Track async task progress
processing_jobs (
  id UUID PRIMARY KEY,
  video_id UUID REFERENCES videos(id),
  job_type TEXT,                  -- transcription, claim_extraction, fact_checking
  status TEXT,                    -- queued, in_progress, completed, failed
  progress INTEGER DEFAULT 0,     -- 0-100 percentage
  error_message TEXT,             -- Error details if failed
  metadata JSONB,                 -- Job-specific metadata
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ
)
```

## Real-Time Update Flow

### Supabase Real-time Configuration
1. Enable real-time on tables: `claims`, `fact_checks`, `processing_jobs`
2. Set up row-level security policies
3. Configure publication for specific columns

### WebSocket Message Types
```typescript
// Progress updates
{
  type: 'job_progress',
  data: {
    job_type: 'transcription' | 'claim_extraction' | 'fact_checking',
    progress: number,           // 0-100
    status: 'in_progress' | 'completed' | 'failed',
    message?: string
  }
}

// New claim discovered
{
  type: 'claim_found',
  data: {
    claim_id: string,
    text: string,
    start_time: number,
    end_time: number,
    confidence: number,
    category: string
  }
}

// Fact-check completed
{
  type: 'fact_check_complete',
  data: {
    claim_id: string,
    fact_check_id: string,
    status: 'verified' | 'disputed' | 'false' | 'inconclusive',
    confidence: number,
    explanation: string,
    evidence: Array<{
      source_url: string,
      title: string,
      excerpt: string,
      relevance_score: number
    }>
  }
}

// Processing complete
{
  type: 'processing_complete',
  data: {
    video_id: string,
    total_claims: number,
    summary: {
      verified: number,
      disputed: number,
      false: number,
      inconclusive: number
    }
  }
}
```

## Task Queue Design (Celery)

### Queue Configuration
```python
# Task routing
CELERY_ROUTES = {
    'video_processing.*': {'queue': 'video_processing'},
    'transcription.*': {'queue': 'transcription'},
    'claim_extraction.*': {'queue': 'claim_extraction'},
    'fact_checking.*': {'queue': 'fact_checking'},
}

# Worker scaling
# 1 worker for video_processing (orchestration)
# 2 workers for transcription (I/O bound)
# 4 workers for claim_extraction (CPU bound)
# 4 workers for fact_checking (I/O bound)
```

### Task Dependencies
```
process_video_pipeline(video_id)
├── extract_metadata(video_id)
├── transcribe_video(video_id) 
│   └── chunk_transcript(video_id)
│       └── group(extract_claims_from_chunk.s(chunk_id) for chunk_id in chunks)
│           └── group(fact_check_claim.s(claim_id) for claim_id in claims)
└── cleanup_temp_files(video_id)
```

This design provides:
- ✅ **Clear separation of concerns** with proper layering
- ✅ **Scalable async processing** with Celery task queues
- ✅ **Real-time updates** via Supabase + WebSocket
- ✅ **Production-ready architecture** with proper error handling
- ✅ **Clean code structure** with dependency injection
- ✅ **Hackathon-friendly** - can implement incrementally

Is this system design clear enough to start implementation?
