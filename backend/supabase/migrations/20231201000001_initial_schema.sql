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
