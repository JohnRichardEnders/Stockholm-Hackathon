"""
API route definitions
"""

from fastapi import APIRouter, HTTPException
from models import VideoRequest
import main

router = APIRouter()


@router.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "service": "youtube-fact-checker"}


@router.get("/api/process-video")
async def process_video_endpoint(video_url: str):
    """
    Main endpoint: Process YouTube video for fact-checking
    
    Input: ?video_url=https://youtube.com/watch?v=...
    Output: JSON with complete fact-checking results
    """
    try:
        result = await main.process_video(video_url)
        return result  # Returns the JSON dict from main.process_video()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
