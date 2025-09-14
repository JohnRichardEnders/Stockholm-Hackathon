"""
YouTube Fact-Checker Backend
Main FastAPI app with orchestration logic
"""

# Load environment variables first
from dotenv import load_dotenv
import os
load_dotenv()

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from typing import List, Dict, Any
import logging
import asyncio
from asyncio import Queue

# Import services
from services.endpoints_stream import router_stream
from services.transcription_service import transcribe_from_url_streaming
from services.claim_service import extract_claims_from_sentence
from services.endpoints_sse import router_sse
from services.fact_checking_service import fact_check_claim
from api.endpoints import router
from models import ClaimResponse

# Setup logging for uvicorn compatibility
import sys

# Configure root logger
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    stream=sys.stdout,
    force=True  # Override existing configuration
)

logger = logging.getLogger(__name__)

# Set specific loggers
logging.getLogger("main").setLevel(logging.INFO)
logging.getLogger("api.endpoints").setLevel(logging.INFO)
logging.getLogger("services").setLevel(logging.INFO)

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
app.include_router(router)         # existing
app.include_router(router_stream)  # your JSONL route
app.include_router(router_sse)     # ✅ new SSE route


@app.on_event("startup")
async def startup_event():
    logger.info("🚀 YouTube Fact-Checker API started successfully!")
    logger.info("📡 Ready to process videos at /api/process-video")


@app.on_event("shutdown") 
async def shutdown_event():
    logger.info("🛑 YouTube Fact-Checker API shutting down")


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
            
            logger.info("🎵 Starting audio transcription...")
            
            # Stream sentences from transcription service
            async for sentence in transcribe_from_url_streaming(video_url):
                sentences_processed += 1
                logger.info(f"📝 Sentence {sentences_processed}: '{sentence.text[:50]}...' (at {sentence.start}s)")
                
                # Extract claims from this sentence using RunPod
                logger.info(f"🔍 Extracting claims from sentence {sentences_processed}...")
                claims = await extract_claims_from_sentence(sentence)
                
                # Skip sentences with no claims
                if not claims:
                    logger.info(f"✅ No claims in sentence {sentences_processed} (expected for most sentences)")
                    continue
                
                # Add each claim to queue for fact-checking
                logger.info(f"🎯 Found {len(claims)} claims in sentence {sentences_processed}!")
                for claim in claims:
                    await claim_queue.put(claim)
                    claims_found += 1
                    logger.info(f"➕ Queued claim {claims_found}: '{claim.claim}' (at {claim.start}s)")
            
            # Signal that we're done adding claims
            await claim_queue.put(None)
            logger.info(f"🏁 Transcription complete! Processed {sentences_processed} sentences, found {claims_found} claims")
        
        # Consumer: Fact-check claims from queue
        async def fact_check_worker():
            fact_checks_completed = 0
            
            while True:
                claim = await claim_queue.get()
                
                # Check for done signal
                if claim is None:
                    logger.info(f"🔚 Fact-checking complete! Processed {fact_checks_completed} claims")
                    break
                
                fact_checks_completed += 1
                logger.info(f"🔍 Fact-checking claim {fact_checks_completed}: '{claim.claim}' (at {claim.start}s)")
                
                # Fact-check the claim using ACI + OpenAI
                logger.info(f"🌐 Gathering evidence for claim {fact_checks_completed}...")
                fact_check_result = await fact_check_claim(claim)
                fact_check_results.append(fact_check_result)
                
                logger.info(f"✅ Claim {fact_checks_completed} fact-checked: '{claim.claim}' -> {fact_check_result.status}")
                logger.info(f"📊 Evidence found: {len(fact_check_result.evidence)} sources")
        
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
