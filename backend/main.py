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
from services.transcription_service import transcribe_from_url_streaming
from services.claim_service import extract_claims_from_sentence
from services.fact_checking_service import fact_check_claim
from api.endpoints import router
from models import ClaimResponse

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


async def process_video(video_url: str) -> dict:
    """
    Complete video processing pipeline using all three services
    
    Flow:
    1. Stream sentences from transcription service (Whisper API)
    2. Extract claims from each sentence (RunPod Deep Cogito v2 70B)
    3. Fact-check each claim (ACI + OpenAI)
    4. Return structured JSON with ClaimResponse objects
    """
    
    try:
        logger.info(f"Processing video: {video_url}")
        
        # Queue for async processing
        claim_queue = Queue()
        fact_check_results = []
        
        # Producer: Stream sentences and extract claims
        async def sentence_and_claim_worker():
            claims_found = 0
            sentences_processed = 0
            
            # Stream sentences from transcription service
            async for sentence in transcribe_from_url_streaming(video_url):
                sentences_processed += 1
                logger.info(f"Processing sentence {sentences_processed}: '{sentence.text[:50]}...'")
                
                # Extract claims from this sentence using RunPod
                claims = await extract_claims_from_sentence(sentence)
                
                # Skip sentences with no claims
                if not claims:
                    logger.info(f"No claims found in sentence {sentences_processed}")
                    continue
                
                # Add each claim to queue for fact-checking
                for claim in claims:
                    await claim_queue.put(claim)
                    claims_found += 1
                    logger.info(f"Added claim to queue: '{claim.claim}' at {claim.start}s")
            
            # Signal that we're done adding claims
            await claim_queue.put(None)
            logger.info(f"Processed {sentences_processed} sentences, found {claims_found} claims")
        
        # Consumer: Fact-check claims from queue
        async def fact_check_worker():
            while True:
                claim = await claim_queue.get()
                
                # Check for done signal
                if claim is None:
                    break
                
                logger.info(f"Fact-checking: '{claim.claim}' at {claim.start}s")
                
                # Fact-check the claim using ACI + OpenAI
                fact_check_result = await fact_check_claim(claim)
                fact_check_results.append(fact_check_result)
                
                logger.info(f"Fact-check completed: '{claim.claim}' -> {fact_check_result.status}")
        
        # Run producer and consumer concurrently
        await asyncio.gather(
            sentence_and_claim_worker(),
            fact_check_worker()
        )
        
        logger.info(f"Video processing completed: {len(fact_check_results)} claims fact-checked")
        
        # Return structured JSON with all ClaimResponse objects
        return {
            "video_id": extract_video_id(video_url),
            "title": "Processed Video",
            "total_claims": len(fact_check_results),
            "claim_responses": [result.dict() for result in fact_check_results]  # Full ClaimResponse objects
        }
        
    except Exception as e:
        logger.error(f"Error processing video: {e}")
        raise HTTPException(status_code=500, detail=str(e))




def create_summary_from_responses(fact_check_results: List[ClaimResponse]) -> Dict[str, int]:
    """Create summary from ClaimResponse objects"""
    summary = {"verified": 0, "false": 0, "disputed": 0, "inconclusive": 0}
    
    for result in fact_check_results:
        status = result.status  # Now just a string
        if status in summary:
            summary[status] += 1
    
    return summary


def extract_video_id(video_url: str) -> str:
    """Extract YouTube video ID from URL"""
    try:
        if "youtube.com/watch" in video_url:
            return video_url.split("v=")[1].split("&")[0]
        elif "youtu.be/" in video_url:
            return video_url.split("youtu.be/")[1].split("?")[0]
        return "unknown"
    except:
        return "unknown"
