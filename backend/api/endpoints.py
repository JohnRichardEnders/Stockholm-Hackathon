"""
API route definitions
"""

from fastapi import APIRouter, HTTPException
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
    
    Input: GET /api/process-video?video_url=https://youtube.com/watch?v=...
    Output: JSON with complete fact-checking results
    """
    import logging
    logger = logging.getLogger(__name__)
    
    logger.info(f"🚀 API endpoint triggered for video: {video_url}")
    
    try:
        logger.info("📡 Starting video processing pipeline...")
        result = await main.process_video(video_url)
        logger.info(f"✅ Video processing completed successfully! Found {result['total_claims']} claims")
        return result
    except Exception as e:
        logger.error(f"❌ Video processing failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))
