"""
YouTube Fact-Checker Backend
Main FastAPI app with orchestration logic
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Any
import logging

# Import services
from services.transcription_service import transcribe_from_url
from services.claim_service import extract_claims_from_segment
from services.verification_service import fact_check_claim
from api.endpoints import router
from models import VideoRequest, VideoResponse

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize FastAPI
app = FastAPI(title="YouTube Fact-Checker", version="1.0.0")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API routes
app.include_router(router)


async def process_video(video_url: str) -> VideoResponse:
    """
    Main orchestration function - coordinates all services
    
    Flow:
    1. Get transcript from URL (transcription service handles audio download)
    2. Extract claims from each segment → skip empty segments
    3. Fact-check each claim
    4. Return structured response
    """
    
    try:
        logger.info(f"Processing video: {video_url}")
        
        # Step 1: Get transcript from URL
        segments = await transcribe_from_url(video_url)
        logger.info(f"Got {len(segments)} segments from transcription")
        
        # Step 2: Extract claims from segments (skip empty ones)
        claims_with_timestamps = []
        
        for segment in segments:
            claims = await extract_claims_from_segment(segment)
            
            # Skip segments with no claims
            if not claims:
                continue
                
            # Add timestamp info to each claim
            for claim in claims:
                claims_with_timestamps.append({
                    "start": segment["start"],
                    "end": segment["end"],
                    "claim": claim["text"],
                    "category": claim["category"],
                    "confidence": claim["confidence"]
                })
        
        logger.info(f"Extracted {len(claims_with_timestamps)} claims from {len(segments)} segments")
        
        # Step 3: Fact-check each claim
        fact_checked_claims = []
        
        for claim_data in claims_with_timestamps:
            fact_check_result = await fact_check_claim(
                claim=claim_data["claim"],
                context="",  # Could add surrounding text here
                metadata={"video_url": video_url}
            )
            
            # Combine claim with fact-check result
            fact_checked_claims.append({
                "start": claim_data["start"],
                "end": claim_data["end"],
                "claim": claim_data["claim"],
                "category": claim_data["category"],
                "status": fact_check_result["status"],
                "confidence": fact_check_result["confidence"],
                "explanation": fact_check_result["explanation"],
                "evidence": fact_check_result.get("evidence", [])
            })
        
        # Step 4: Create summary
        summary = create_summary(fact_checked_claims)
        
        return VideoResponse(
            video_id="video",
            title="Video",
            total_claims=len(fact_checked_claims),
            claims=fact_checked_claims,
            summary=summary
        )
        
    except Exception as e:
        logger.error(f"Error processing video: {e}")
        raise HTTPException(status_code=500, detail=str(e))




def create_summary(claims: List[Dict]) -> Dict[str, int]:
    """Create summary of fact-check results"""
    summary = {"verified": 0, "false": 0, "disputed": 0, "inconclusive": 0}
    
    for claim in claims:
        status = claim["status"]
        if status in summary:
            summary[status] += 1
    
    return summary


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)