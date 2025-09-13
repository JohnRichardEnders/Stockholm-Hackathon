"""
Claim Extraction Service - OpenAI Integration

FUNCTION TO IMPLEMENT:
async def extract_claims_from_segment(segment: dict) -> List[dict]

INPUT:
Single segment with timestamp:
{
  "id": 1,
  "start": 5.2,
  "end": 9.8,
  "text": "Today we'll discuss how vaccines cause autism."
}

OUTPUT:
List of claims (empty list if no claims):
[
  {
    "text": "vaccines cause autism",
    "category": "health",
    "confidence": 0.9
  }
]

OR empty list [] if no verifiable claims in segment

IMPLEMENTATION NOTES:
- Use OpenAI GPT-4o-mini for cost efficiency
- Analyze each segment individually
- Only extract clear, verifiable factual claims
- Skip opinions, questions, greetings, conclusions
- Categories: "science", "health", "politics", "history", "technology", "other"
- Confidence: 0.0 to 1.0 (how confident the extraction is)
- Return empty list if no claims found

PROMPT STRATEGY:
- Ask LLM to identify factual claims that can be verified
- Ignore subjective statements, opinions, questions
- Focus on specific, testable assertions
- Return structured JSON response

DEPENDENCIES:
- openai library
- Set OPENAI_API_KEY environment variable
"""

from typing import List, Dict
import logging

logger = logging.getLogger(__name__)


async def extract_claims_from_segment(segment: Dict) -> List[Dict]:
    """
    Extract verifiable claims from a transcript segment
    
    TODO: Implement this function
    1. Analyze segment text with OpenAI GPT-4o-mini
    2. Identify factual claims that can be verified
    3. Skip opinions, questions, greetings
    4. Return structured claims with category and confidence
    5. Return empty list if no claims found
    """
    
    text = segment["text"]
    
    # TODO: Replace with real OpenAI implementation
    # Mock implementation for testing
    
    # Mock logic: detect claims based on keywords
    claims = []
    
    if "vaccine" in text.lower() and "autism" in text.lower():
        claims.append({
            "text": "vaccines cause autism",
            "category": "health",
            "confidence": 0.9
        })
    
    if "earth" in text.lower() and "flat" in text.lower():
        claims.append({
            "text": "the Earth is flat",
            "category": "science",
            "confidence": 0.95
        })
    
    if "climate change" in text.lower() and ("fake" in text.lower() or "hoax" in text.lower()):
        claims.append({
            "text": "climate change is fake",
            "category": "science",
            "confidence": 0.85
        })
    
    # Skip segments with greetings, conclusions, or no factual content
    greeting_words = ["hello", "welcome", "thanks", "goodbye", "see you"]
    if any(word in text.lower() for word in greeting_words) and not claims:
        claims = []
    
    if claims:
        logger.info(f"Extracted {len(claims)} claims from segment: '{text[:50]}...'")
    else:
        logger.info(f"No claims found in segment: '{text[:50]}...'")
    
    return claims
