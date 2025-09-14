"""
Claim Extraction Service - RunPod Deep Cogito v2 70B Integration

Extract factual claims from sentences using RunPod Deep Cogito v2 70B model.
"""

from typing import List, Dict
import logging
import os
import json
from openai import OpenAI
from dotenv import load_dotenv
from models import Claim, Sentence
import asyncio

# Load environment variables
load_dotenv()

logger = logging.getLogger(__name__)


async def extract_claims_from_sentence(sentence: Sentence) -> List[Claim]:
    """
    Extract verifiable claims from a sentence using Deep Cogito v2 70B
    
    Args:
        sentence: Sentence object with start time and text
        
    Returns:
        List[Claim]: List of Claim objects with start time and claim text
    """
    
    text = sentence.text
    
    try:
        # RunPod OpenAI-compatible client (from docs)
        client = OpenAI(
            api_key=os.getenv("RUNPOD_API_KEY"),
            base_url="https://api.runpod.ai/v2/deep-cogito-v2-llama-70b/openai/v1"
        )
        
        # Call RunPod to extract claims with timeout off the event loop thread
        def _runpod_call():
            return client.chat.completions.create(
                model="deepcogito/cogito-v2-preview-llama-70B",
                messages=[
                    {"role": "system", "content": "You extract factual claims from text. A claim is any statement that can be verified as true or false. Extract ALL factual statements, even controversial ones."},
                    {"role": "user", "content": f"Extract factual claims from this text: '{text}'\n\nReturn JSON with claims array. Example: {{\"claims\": [\"vaccines cause autism\", \"the Earth is flat\"]}}"}
                ],
                response_format={
                    "type": "json_schema",
                    "json_schema": {
                        "name": "claims_extraction",
                        "strict": True,
                        "schema": {
                            "type": "object",
                            "properties": {
                                "claims": {
                                    "type": "array",
                                    "items": {"type": "string"}
                                }
                            },
                            "required": ["claims"],
                            "additionalProperties": False
                        }
                    }
                },
                max_tokens=150,
                temperature=0.1,
                timeout=20,
            )

        try:
            response = await asyncio.wait_for(asyncio.to_thread(_runpod_call), timeout=25)
        except asyncio.TimeoutError:
            logger.error("RunPod extraction timed out; using mock extractor")
            return mock_extract_claims(text, sentence.start)
        
        # Parse response and create Claim objects
        result_text = response.choices[0].message.content
        logger.info(f"RunPod raw response: {result_text}")
        
        result = json.loads(result_text)
        logger.info(f"Parsed result: {result}")
        
        claim_texts = result.get("claims", [])
        logger.info(f"Claim texts: {claim_texts}")
        
        # Create Claim objects with timestamps
        claims = [
            Claim(start=sentence.start, claim=claim_text)
            for claim_text in claim_texts
        ]
        
        logger.info(f"Extracted {len(claims)} claims from: '{text[:50]}...'")
        return claims
        
    except Exception as e:
        logger.error(f"RunPod extraction failed: {e}")
        return mock_extract_claims(text, sentence.start)


def mock_extract_claims(text: str, start_time: float) -> List[Claim]:
    """Simple fallback for testing"""
    claims = []
    text_lower = text.lower()
    
    if "vaccine" in text_lower and "autism" in text_lower:
        claims.append(Claim(start=start_time, claim="vaccines cause autism"))
    
    if "earth" in text_lower and "flat" in text_lower:
        claims.append(Claim(start=start_time, claim="the Earth is flat"))
    
    if "climate change" in text_lower and ("fake" in text_lower or "hoax" in text_lower):
        claims.append(Claim(start=start_time, claim="climate change is fake"))
    
    return claims