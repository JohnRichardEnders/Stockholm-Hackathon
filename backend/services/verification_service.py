"""
Verification Service - Fact-Checking (YOUR COLLEAGUE IMPLEMENTS THIS)

FUNCTION TO IMPLEMENT:
async def fact_check_claim(claim: str, context: str, metadata: dict) -> dict

INPUT:
- claim: "vaccines cause autism"
- context: "Today we'll discuss how vaccines cause autism." (surrounding text)
- metadata: {"video_url": "https://...", "title": "Health Myths"}

OUTPUT:
{
  "status": "false",
  "confidence": 0.98,
  "explanation": "Multiple large-scale studies have found no link between vaccines and autism. The original study suggesting this connection was retracted due to fraud.",
  "evidence": [
    {
      "source_url": "https://www.cdc.gov/vaccinesafety/concerns/autism.html",
      "source_title": "Vaccines Do Not Cause Autism",
      "excerpt": "Studies have shown no link between receiving vaccines and developing ASD."
    },
    {
      "source_url": "https://www.ncbi.nlm.nih.gov/pmc/articles/PMC4783279/",
      "source_title": "Vaccines and autism: a tale of shifting hypotheses",
      "excerpt": "Large epidemiological studies have found no evidence of a link."
    }
  ]
}

STATUS VALUES:
- "verified": Claim is accurate/true
- "false": Claim is demonstrably false
- "disputed": Mixed evidence, controversial
- "inconclusive": Insufficient evidence

IMPLEMENTATION STEPS:
1. Generate search queries from claim
2. Search web for evidence (Google/Bing Search APIs)
3. Score source credibility (.gov = high, blogs = low)
4. Use OpenAI GPT-4 to analyze evidence vs claim
5. Return structured result

DEPENDENCIES YOUR COLLEAGUE NEEDS:
- openai library (for analysis)
- google-api-python-client (for Google Search API)
- requests (for web scraping if needed)
- Set API keys: OPENAI_API_KEY, GOOGLE_SEARCH_API_KEY, GOOGLE_SEARCH_ENGINE_ID

EXAMPLE SEARCH QUERIES FOR "vaccines cause autism":
- "vaccines autism scientific studies"
- "MMR vaccine autism debunked"
- "wakefield study retracted fraud"

HIGH CREDIBILITY SOURCES:
- .gov domains (CDC, NHS, etc.)
- .edu domains (universities)
- Established medical journals (Nature, NEJM, etc.)
- WHO, medical organizations

LOW CREDIBILITY SOURCES:
- Personal blogs
- Social media
- Unverified websites
- Conspiracy sites
"""

from typing import Dict
import logging
from backend.models import ClaimStatus

logger = logging.getLogger(__name__)


async def fact_check_claim(claim: str, context: str, metadata: Dict) -> Dict:
    """
    Fact-check a claim using web search and LLM analysis
    
    YOUR COLLEAGUE IMPLEMENTS THIS FUNCTION
    
    Steps to implement:
    1. generate_search_queries(claim) -> List[str]
    2. search_for_evidence(queries) -> List[search_results]
    3. score_source_credibility(results) -> List[scored_evidence]
    4. analyze_with_llm(claim, evidence) -> fact_check_result
    5. format_response(result) -> dict
    """
    
    logger.info(f"Fact-checking claim: '{claim}'")
    
    # TODO: Your colleague replaces this with real implementation
    # Mock implementation for testing
    
    if "vaccine" in claim.lower() and "autism" in claim.lower():
        return {
            "status": ClaimStatus.FALSE,
            "confidence": 0.98,
            "explanation": "Multiple large-scale studies have found no link between vaccines and autism. The original study suggesting this connection was retracted due to fraud.",
            "evidence": [
                {
                    "source_url": "https://www.cdc.gov/vaccinesafety/concerns/autism.html",
                    "source_title": "Vaccines Do Not Cause Autism",
                    "excerpt": "Studies have shown no link between receiving vaccines and developing ASD."
                }
            ]
        }
    
    elif "earth" in claim.lower() and "flat" in claim.lower():
        return {
            "status": ClaimStatus.FALSE,
            "confidence": 0.95,
            "explanation": "Scientific evidence conclusively shows the Earth is spherical. This includes satellite imagery, physics, and direct observation.",
            "evidence": [
                {
                    "source_url": "https://www.nasa.gov/audience/forstudents/k-4/stories/nasa-knows/what-is-orbit-k4.html",
                    "source_title": "What Is an Orbit? | NASA",
                    "excerpt": "Earth orbits the Sun at an average distance of 93 million miles."
                }
            ]
        }
    
    elif "climate change" in claim.lower() and "fake" in claim.lower():
        return {
            "status": ClaimStatus.FALSE,
            "confidence": 0.92,
            "explanation": "Climate change is supported by overwhelming scientific consensus. Multiple lines of evidence show human activities are causing global warming.",
            "evidence": [
                {
                    "source_url": "https://climate.nasa.gov/evidence/",
                    "source_title": "Climate Change Evidence | NASA",
                    "excerpt": "Multiple studies show warming is primarily caused by human activities."
                }
            ]
        }
    
    else:
        return {
            "status": ClaimStatus.INCONCLUSIVE,
            "confidence": 0.5,
            "explanation": "Unable to definitively verify or refute this claim based on available evidence.",
            "evidence": []
        }

def generate_search_queries(claim: str) -> list:
    """Generate targeted search queries for the claim"""
    # TODO: Use LLM to create 3-5 specific search queries
    pass

async def search_for_evidence(queries: list) -> list:
    """Search for evidence using Google/Bing APIs"""
    # TODO: Implement web search
    pass

def score_source_credibility(results: list) -> list:
    """Score source credibility and relevance"""
    # TODO: Implement credibility scoring
    pass

async def analyze_with_llm(claim: str, evidence: list) -> dict:
    """Use LLM to analyze evidence against claim"""
    # TODO: Implement LLM analysis
    pass
