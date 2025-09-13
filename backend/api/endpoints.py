"""
API route definitions
"""

from fastapi import APIRouter, HTTPException
from models import VideoRequest, VideoResponse
import main

router = APIRouter()


@router.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "service": "youtube-fact-checker"}


@router.post("/api/process-video", response_model=VideoResponse)
async def process_video_endpoint(request: VideoRequest):
    """
    Main endpoint: Process YouTube video for fact-checking
    
    Input: {"video_url": "https://youtube.com/watch?v=..."}
    Output: VideoResponse with fact-checked claims
    """
    try:
        result = await main.process_video(request.video_url)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
