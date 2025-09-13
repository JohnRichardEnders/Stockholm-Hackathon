// Video-related types
export interface Video {
  id: string;
  video_id: string; // YouTube video ID
  url: string;
  title: string;
  duration: number;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  metadata?: any;
  created_at: string;
  updated_at: string;
}

// Claim-related types
export interface Claim {
  id: string;
  chunk_id: string;
  text: string;
  category: string;
  confidence: number;
  start_time: number;
  end_time: number;
  status: 'pending' | 'processing' | 'completed';
  created_at: string;
}

// Fact-check types
export interface FactCheck {
  id: string;
  claim_id: string;
  status: 'verified' | 'disputed' | 'false' | 'inconclusive';
  confidence: number;
  explanation: string;
  evidence: Evidence[];
  sources: Source[];
  search_queries: string[];
  created_at: string;
}

export interface Evidence {
  source_url: string;
  title: string;
  excerpt: string;
  relevance_score: number;
}

export interface Source {
  url: string;
  title: string;
  description?: string;
}

// Processing job types
export interface ProcessingJob {
  id: string;
  video_id: string;
  job_type: 'transcription' | 'claim_extraction' | 'fact_checking';
  status: 'queued' | 'in_progress' | 'completed' | 'failed';
  progress: number;
  error_message?: string;
  metadata?: any;
  started_at?: string;
  completed_at?: string;
  created_at: string;
}

// WebSocket message types
export interface WebSocketMessage {
  type: 'job_progress' | 'claim_found' | 'fact_check_complete' | 'processing_complete';
  data: any;
}

export interface JobProgressData {
  job_type: 'transcription' | 'claim_extraction' | 'fact_checking';
  progress: number;
  status: 'in_progress' | 'completed' | 'failed';
  message?: string;
}

export interface ClaimFoundData {
  claim_id: string;
  text: string;
  start_time: number;
  end_time: number;
  confidence: number;
  category: string;
}

export interface FactCheckCompleteData {
  claim_id: string;
  fact_check_id: string;
  status: 'verified' | 'disputed' | 'false' | 'inconclusive';
  confidence: number;
  explanation: string;
  evidence: Evidence[];
}

export interface ProcessingCompleteData {
  video_id: string;
  total_claims: number;
  summary: {
    verified: number;
    disputed: number;
    false: number;
    inconclusive: number;
  };
}
