# Development Environment Setup Guide

## Prerequisites & System Setup

### 1. Python Environment Setup
```bash
# Install pyenv if not already installed (macOS)
brew install pyenv

# Install Python 3.11
pyenv install 3.11.6
pyenv global 3.11.6

# Verify Python version
python --version  # Should show Python 3.11.6

# Create virtual environment for the project
cd /Users/jre/Projects/Stockholm-Hackathon
python -m venv venv
source venv/bin/activate

# Upgrade pip
pip install --upgrade pip
```

### 2. Node.js Setup (for Chrome Extension)
```bash
# Install Node.js 18+ (if not already installed)
brew install node

# Verify version
node --version  # Should be 18+
npm --version
```

### 3. Redis Setup (for Celery)
```bash
# Install Redis
brew install redis

# Start Redis service
brew services start redis

# Test Redis connection
redis-cli ping  # Should return PONG
```

### 4. Supabase CLI Setup
```bash
# Install Supabase CLI
npm install -g supabase

# Verify installation
supabase --version
```

## Project Structure Creation

### 1. Create Project Folders
```bash
cd /Users/jre/Projects/Stockholm-Hackathon

# Backend structure
mkdir -p backend/app/{api/v1,core,models,schemas,services,tasks,utils}
mkdir -p backend/supabase/migrations
mkdir -p backend/tests/{test_api,test_core,test_services}
mkdir -p backend/scripts

# Frontend structure
mkdir -p frontend/src/{background,content,popup,components,services,types,utils,styles}
mkdir -p frontend/public/{icons,images}

# Create __init__.py files for Python packages
touch backend/app/__init__.py
touch backend/app/api/__init__.py
touch backend/app/api/v1/__init__.py
touch backend/app/core/__init__.py
touch backend/app/models/__init__.py
touch backend/app/schemas/__init__.py
touch backend/app/services/__init__.py
touch backend/app/tasks/__init__.py
touch backend/app/utils/__init__.py
touch backend/tests/__init__.py
```

### 2. Backend Dependencies
```bash
cd backend

# Create requirements.txt
cat > requirements.txt << 'EOF'
# Core FastAPI
fastapi==0.104.1
uvicorn[standard]==0.24.0
python-multipart==0.0.6

# Database & ORM
supabase==2.0.2
psycopg2-binary==2.9.9

# Task Queue
celery==5.3.4
redis==5.0.1

# Data Validation
pydantic==2.5.0
pydantic-settings==2.1.0

# External APIs
openai==1.3.0
assemblyai==0.17.0
google-api-python-client==2.108.0
requests==2.31.0

# Video Processing
yt-dlp==2023.10.13

# Utilities
python-dotenv==1.0.0
typing-extensions==4.8.0
EOF

# Create development requirements
cat > requirements-dev.txt << 'EOF'
-r requirements.txt

# Development tools
pytest==7.4.3
pytest-asyncio==0.21.1
httpx==0.25.2
pytest-mock==3.12.0

# Code quality
black==23.11.0
isort==5.12.0
flake8==6.1.0
mypy==1.7.0

# Debugging
ipdb==0.13.13
rich==13.7.0
EOF

# Install dependencies
pip install -r requirements-dev.txt
```

### 3. Environment Configuration
```bash
cd backend

# Create .env file
cat > .env << 'EOF'
# Environment
ENVIRONMENT=development
DEBUG=true

# Server
HOST=0.0.0.0
PORT=8000

# Supabase (will be updated after supabase start)
SUPABASE_URL=http://localhost:54321
SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_KEY=your_service_key_here

# Redis
REDIS_URL=redis://localhost:6379/0

# External APIs
OPENAI_API_KEY=your_openai_key_here
ASSEMBLYAI_API_KEY=your_assemblyai_key_here
GOOGLE_SEARCH_API_KEY=your_google_search_key_here
GOOGLE_SEARCH_ENGINE_ID=your_search_engine_id_here

# Task Queue
CELERY_BROKER_URL=redis://localhost:6379/0
CELERY_RESULT_BACKEND=redis://localhost:6379/0

# Processing Settings
MAX_VIDEO_DURATION=3600
CHUNK_SIZE=30
MAX_CLAIMS_PER_CHUNK=5
FACT_CHECK_CONFIDENCE_THRESHOLD=0.7

# Logging
LOG_LEVEL=INFO
EOF

# Create .env.example (template for others)
cp .env .env.example
# Edit .env.example to remove actual API keys
sed -i '' 's/your_.*_key_here/your_key_here/g' .env.example
```

### 4. Supabase Local Setup
```bash
cd backend

# Initialize Supabase project
supabase init

# Start local Supabase services
supabase start

# This will output something like:
# API URL: http://localhost:54321
# Anon key: eyJ...
# Service key: eyJ...

# Update your .env file with the actual keys from the output above
```

### 5. Database Schema Setup
```bash
cd backend

# Create initial migration
cat > supabase/migrations/20231201000001_initial_schema.sql << 'EOF'
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Videos table
CREATE TABLE videos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    video_id TEXT UNIQUE NOT NULL,
    url TEXT NOT NULL,
    title TEXT,
    duration INTEGER,
    status TEXT DEFAULT 'queued' CHECK (status IN ('queued', 'processing', 'completed', 'failed')),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Transcripts table
CREATE TABLE transcripts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    video_id UUID REFERENCES videos(id) ON DELETE CASCADE,
    full_text TEXT,
    language TEXT DEFAULT 'en',
    confidence DECIMAL(3,2),
    service TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Transcript chunks table
CREATE TABLE transcript_chunks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    transcript_id UUID REFERENCES transcripts(id) ON DELETE CASCADE,
    text TEXT NOT NULL,
    start_time DECIMAL(10,3) NOT NULL,
    end_time DECIMAL(10,3) NOT NULL,
    confidence DECIMAL(3,2),
    speaker TEXT,
    chunk_index INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Claims table
CREATE TABLE claims (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    chunk_id UUID REFERENCES transcript_chunks(id) ON DELETE CASCADE,
    text TEXT NOT NULL,
    category TEXT,
    confidence DECIMAL(3,2),
    start_time DECIMAL(10,3),
    end_time DECIMAL(10,3),
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Fact checks table
CREATE TABLE fact_checks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    claim_id UUID REFERENCES claims(id) ON DELETE CASCADE,
    status TEXT NOT NULL CHECK (status IN ('verified', 'disputed', 'false', 'inconclusive')),
    confidence DECIMAL(3,2),
    explanation TEXT,
    evidence JSONB DEFAULT '[]',
    sources JSONB DEFAULT '[]',
    search_queries JSONB DEFAULT '[]',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Processing jobs table
CREATE TABLE processing_jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    video_id UUID REFERENCES videos(id) ON DELETE CASCADE,
    job_type TEXT NOT NULL,
    status TEXT DEFAULT 'queued' CHECK (status IN ('queued', 'in_progress', 'completed', 'failed')),
    progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
    error_message TEXT,
    metadata JSONB DEFAULT '{}',
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_videos_video_id ON videos(video_id);
CREATE INDEX idx_videos_status ON videos(status);
CREATE INDEX idx_transcript_chunks_times ON transcript_chunks(start_time, end_time);
CREATE INDEX idx_claims_times ON claims(start_time, end_time);
CREATE INDEX idx_claims_status ON claims(status);
CREATE INDEX idx_fact_checks_status ON fact_checks(status);
CREATE INDEX idx_processing_jobs_video_status ON processing_jobs(video_id, status);

-- Update trigger for videos table
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_videos_updated_at BEFORE UPDATE ON videos
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EOF

# Apply migration
supabase db reset
```

### 6. Enable Real-time
```bash
cd backend

# Create real-time setup migration
cat > supabase/migrations/20231201000002_setup_realtime.sql << 'EOF'
-- Enable real-time for tables
ALTER PUBLICATION supabase_realtime ADD TABLE claims;
ALTER PUBLICATION supabase_realtime ADD TABLE fact_checks;
ALTER PUBLICATION supabase_realtime ADD TABLE processing_jobs;

-- Enable Row Level Security (RLS) - for now allow all
ALTER TABLE videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE transcripts ENABLE ROW LEVEL SECURITY;
ALTER TABLE transcript_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE fact_checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE processing_jobs ENABLE ROW LEVEL SECURITY;

-- Create policies (allow all for development)
CREATE POLICY "Allow all operations on videos" ON videos FOR ALL USING (true);
CREATE POLICY "Allow all operations on transcripts" ON transcripts FOR ALL USING (true);
CREATE POLICY "Allow all operations on transcript_chunks" ON transcript_chunks FOR ALL USING (true);
CREATE POLICY "Allow all operations on claims" ON claims FOR ALL USING (true);
CREATE POLICY "Allow all operations on fact_checks" ON fact_checks FOR ALL USING (true);
CREATE POLICY "Allow all operations on processing_jobs" ON processing_jobs FOR ALL USING (true);
EOF

# Apply migration
supabase db reset
```

### 7. Frontend Setup
```bash
cd frontend

# Initialize npm project
cat > package.json << 'EOF'
{
  "name": "youtube-fact-checker-extension",
  "version": "1.0.0",
  "description": "Chrome extension for real-time YouTube fact-checking",
  "main": "dist/background.js",
  "scripts": {
    "dev": "webpack --mode development --watch",
    "build": "webpack --mode production",
    "type-check": "tsc --noEmit"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "@supabase/supabase-js": "^2.38.0",
    "lucide-react": "^0.294.0"
  },
  "devDependencies": {
    "@types/chrome": "^0.0.251",
    "@types/react": "^18.2.0",
    "@types/react-dom": "^18.2.0",
    "typescript": "^5.0.0",
    "webpack": "^5.89.0",
    "webpack-cli": "^5.1.0",
    "ts-loader": "^9.5.0",
    "copy-webpack-plugin": "^11.0.0",
    "css-loader": "^6.8.0",
    "style-loader": "^3.3.0",
    "sass": "^1.69.0",
    "sass-loader": "^13.3.0"
  }
}
EOF

# Install dependencies
npm install
```

### 8. TypeScript Configuration
```bash
cd frontend

# Create tsconfig.json
cat > tsconfig.json << 'EOF'
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "allowJs": true,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "strict": true,
    "forceConsistentCasingInFileNames": true,
    "noFallthroughCasesInSwitch": true,
    "module": "ESNext",
    "moduleResolution": "node",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "baseUrl": "./src",
    "paths": {
      "@/*": ["*"]
    }
  },
  "include": [
    "src/**/*"
  ],
  "exclude": [
    "node_modules",
    "dist"
  ]
}
EOF
```

### 9. Webpack Configuration
```bash
cd frontend

# Create webpack.config.js
cat > webpack.config.js << 'EOF'
const path = require('path');
const CopyPlugin = require('copy-webpack-plugin');

module.exports = {
  entry: {
    background: './src/background/background.ts',
    content: './src/content/content.ts',
    popup: './src/popup/popup.tsx'
  },
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: '[name].js',
    clean: true,
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
      {
        test: /\.s[ac]ss$/i,
        use: ['style-loader', 'css-loader', 'sass-loader'],
      },
    ],
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.js'],
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  plugins: [
    new CopyPlugin({
      patterns: [
        { from: 'public', to: '.' },
        { from: 'src/popup/popup.html', to: 'popup.html' },
      ],
    }),
  ],
  mode: 'development',
};
EOF
```

### 10. Chrome Extension Manifest
```bash
cd frontend

# Create manifest.json in public folder
cat > public/manifest.json << 'EOF'
{
  "manifest_version": 3,
  "name": "YouTube Fact Checker",
  "version": "1.0.0",
  "description": "Real-time fact checking for YouTube videos",
  "permissions": [
    "activeTab",
    "storage",
    "scripting"
  ],
  "host_permissions": [
    "https://www.youtube.com/*",
    "http://localhost:8000/*",
    "http://localhost:54321/*"
  ],
  "background": {
    "service_worker": "background.js"
  },
  "content_scripts": [
    {
      "matches": ["https://www.youtube.com/watch*"],
      "js": ["content.js"],
      "run_at": "document_end"
    }
  ],
  "action": {
    "default_popup": "popup.html",
    "default_title": "YouTube Fact Checker"
  },
  "icons": {
    "16": "icons/icon16.png",
    "48": "icons/icon48.png",
    "128": "icons/icon128.png"
  },
  "web_accessible_resources": [
    {
      "resources": ["*.js", "*.css"],
      "matches": ["https://www.youtube.com/*"]
    }
  ]
}
EOF
```

### 11. Docker Compose for Local Services
```bash
cd /Users/jre/Projects/Stockholm-Hackathon

# Create docker-compose.yml for additional services
cat > docker-compose.yml << 'EOF'
version: '3.8'

services:
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    command: redis-server --appendonly yes

  celery-worker:
    build: ./backend
    command: celery -A app.tasks.celery_app worker --loglevel=info --concurrency=4
    volumes:
      - ./backend:/app
    depends_on:
      - redis
    environment:
      - REDIS_URL=redis://redis:6379/0
      - SUPABASE_URL=http://host.docker.internal:54321
    env_file:
      - ./backend/.env

  celery-flower:
    build: ./backend
    command: celery -A app.tasks.celery_app flower --port=5555
    ports:
      - "5555:5555"
    volumes:
      - ./backend:/app
    depends_on:
      - redis
    environment:
      - REDIS_URL=redis://redis:6379/0
    env_file:
      - ./backend/.env

volumes:
  redis_data:
EOF
```

### 12. Backend Dockerfile
```bash
cd backend

cat > Dockerfile << 'EOF'
FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Expose port
EXPOSE 8000

# Default command
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]
EOF
```

## API Keys Setup

### 1. OpenAI API Key
```bash
# Visit https://platform.openai.com/api-keys
# Create new API key
# Add to backend/.env:
# OPENAI_API_KEY=sk-...
```

### 2. AssemblyAI API Key (Optional - for better transcription)
```bash
# Visit https://www.assemblyai.com/
# Sign up and get API key
# Add to backend/.env:
# ASSEMBLYAI_API_KEY=your_key_here
```

### 3. Google Search API (Optional - for fact-checking)
```bash
# Visit https://console.cloud.google.com/
# Enable Custom Search API
# Create credentials
# Add to backend/.env:
# GOOGLE_SEARCH_API_KEY=your_key_here
# GOOGLE_SEARCH_ENGINE_ID=your_engine_id_here
```

## Verification Steps

### 1. Test Python Environment
```bash
cd backend
source venv/bin/activate
python -c "import fastapi, supabase, celery; print('All imports successful')"
```

### 2. Test Supabase Connection
```bash
cd backend
supabase status
# Should show all services running
```

### 3. Test Redis Connection
```bash
redis-cli ping
# Should return PONG
```

### 4. Test Frontend Build
```bash
cd frontend
npm run build
# Should create dist/ folder with extension files
```

## Ready to Start Development!

After completing these steps, you'll have:
- ✅ Python 3.11 environment with all dependencies
- ✅ Supabase running locally with database schema
- ✅ Redis running for Celery tasks
- ✅ Chrome extension build system ready
- ✅ All configuration files in place
- ✅ Docker setup for additional services

**Next steps:**
1. Start implementing the backend FastAPI app
2. Create the Chrome extension components
3. Implement the Celery task pipeline
4. Test end-to-end functionality

The development environment is now ready for coding!
