"""
YouTube Fact-Checker Backend
Main FastAPI app with orchestration logic
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from typing import List, Dict, Any
import logging
import asyncio
from asyncio import Queue

# Import services
from api.endpoints import router
from backend.services.extract_claims_service import extract_claims
from models import VideoResponse

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
        
        # Step 2 & 3: Queue-based claim extraction and fact-checking
        claim_queue = Queue()
        fact_checked_claims = []
        
        # Producer: Extract claims and add to queue
        async def extract_claims_worker():
            claims_found = 0
            for segment in segments:
                claims = extract_claims(segment)
                
                # Skip segments with no claims
                if not claims:
                    continue
                    
                # Add each claim to queue with timestamp info
                for claim in claims:
                    await claim_queue.put({
                        "start": segment["start"],
                        "end": segment["end"],
                        "claim": claim["text"],
                        "category": claim["category"],
                        "confidence": claim["confidence"]
                    })
                    claims_found += 1
            
            # Signal that we're done adding claims
            await claim_queue.put(None)
            logger.info(f"Extracted {claims_found} claims from {len(segments)} segments")
        
        # Consumer: Fact-check claims from queue
        async def fact_check_worker():
            while True:
                claim_data = await claim_queue.get()
                
                # Check for done signal
                if claim_data is None:
                    break
                
                # Fact-check the claim

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
                
                logger.info(f"Fact-checked claim: '{claim_data['claim'][:50]}...' -> {fact_check_result['status']}")
        
        # Run producer and consumer concurrently
        await asyncio.gather(
            extract_claims_worker(),
            fact_check_worker()
        )
        
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
