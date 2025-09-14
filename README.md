# YouTube Fact-Checker

Real-time fact-checking for YouTube videos using AI.

## Architecture

- **Chrome Extension** - Frontend overlay on YouTube videos
- **FastAPI Backend** - Processing pipeline with async queues
- **AI Services** - Whisper, RunPod Deep Cogito v2 70B, ACI, OpenAI

## Backend Setup

### 1. Install Dependencies
```bash
cd backend
pip install -r requirements.txt
```

### 2. Environment Variables
```bash
# Copy the example file
cp env.example .env

# Edit .env with your API keys:
# OPENAI_API_KEY=sk-your-openai-api-key-here
# RUNPOD_API_KEY=your-runpod-api-key-here  
# ACI_API_KEY=your-aci-api-key-here
```

### 3. Install System Dependencies
```bash
# Install FFmpeg (required for yt-dlp audio processing)
brew install ffmpeg  # macOS
# sudo apt install ffmpeg  # Ubuntu/Debian
```

### 4. Run the Server
```bash
cd backend
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### 5. Test the API
```bash
# Health check
curl http://localhost:8000/health

# Process a video
curl "http://localhost:8000/api/process-video?video_url=https://www.youtube.com/watch?v=jNQXAC9IVRw"
```

## API Endpoints

- `GET /health` - Health check
- `GET /api/process-video?video_url=URL` - Process YouTube video for fact-checking

### Request Format
```
GET /api/process-video?video_url=https://youtube.com/watch?v=VIDEO_ID
```

### Response Format
```json
{
  "video_id": "VIDEO_ID",
  "title": "Processed Video",
  "total_claims": 1,
  "claim_responses": [
    {
      "claim": {
        "start": 0.0,
        "claim": "factual claim text"
      },
      "status": "verified|false|disputed|inconclusive",
      "written_summary": "Detailed explanation of fact-check result...",
      "evidence": [
        {
          "source_url": "https://example.com",
          "source_title": "Source Title",
          "snippet": "Evidence excerpt..."
        }
      ]
    }
  ]
}
```

## Processing Pipeline

1. **Transcription** - Download audio with yt-dlp → OpenAI Whisper API → Sentences with timestamps
2. **Claim Extraction** - RunPod Deep Cogito v2 70B → Extract factual claims
3. **Evidence Gathering** - ACI + EXA_AI → Find web sources and evidence
4. **Fact-Checking** - OpenAI GPT-4 → Analyze evidence → Return verdict

## Tech Stack

- **FastAPI** - Async web framework
- **OpenAI Whisper** - Audio transcription with timestamps
- **RunPod Deep Cogito v2 70B** - Advanced claim extraction
- **ACI + EXA_AI** - Evidence gathering and web search
- **OpenAI GPT-4** - Fact-checking analysis
- **yt-dlp** - YouTube audio download
- **Pydantic** - Data validation and structured outputs

## Development

The backend uses async queues for concurrent processing:
- Sentences are streamed from transcription
- Claims are extracted in real-time
- Fact-checking happens concurrently
- Results are returned as structured JSON

Perfect for hackathon development with clean separation of concerns and production-ready architecture.





$env:PATH += ';C:\ffmpeg\bin' 
cd .\backend\  
.\venv\Scripts\activate 
python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000