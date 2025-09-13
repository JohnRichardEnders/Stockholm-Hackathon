"""
Fact-Checking Service using OpenAI API with Search
"""

import logging
import os
from openai import OpenAI
from dotenv import load_dotenv
from models import Claim, ClaimResponse, ClaimStatus

# Load environment variables
load_dotenv()

logger = logging.getLogger(__name__)


async def fact_check_claim(claim: Claim) -> ClaimResponse:
    """
    Fact-check a claim using OpenAI API with search capability
    
    Args:
        claim: Claim object with start time and claim text
        
    Returns:
        ClaimResponse: Complete fact-check result with status, summary, and evidence
    """
    
    try:
        logger.info(f"Fact-checking claim: '{claim.claim}'")
        
        # Initialize OpenAI client
        client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
        
        # Create fact-checking prompt
        messages = [
            {
                "role": "system",
                "content": """You are a professional fact-checker. Analyze the given claim and provide a thorough fact-check using reliable sources.

Your response must include:
1. Status: "verified", "false", "disputed", or "inconclusive"
2. A clear summary explaining your verdict
3. Evidence from credible sources

Use web search to find current, reliable information. Prioritize:
- Government sources (.gov)
- Academic institutions (.edu) 
- Established medical/scientific organizations
- Peer-reviewed research

Be objective and base your assessment on evidence."""
            },
            {
                "role": "user", 
                "content": f"Fact-check this claim: '{claim.claim}'\n\nProvide a thorough analysis with sources."
            }
        ]
        
        # Generate schema from ClaimResponse model
        schema = ClaimResponse.model_json_schema()
        
        # Call OpenAI with structured response
        response = client.chat.completions.create(
            model="gpt-4o",
            messages=messages,
            response_format={
                "type": "json_schema",
                "json_schema": {
                    "name": "fact_check_result",
                    "strict": True,
                    "schema": schema
                }
            },
            max_tokens=500,
            temperature=0.1
        )
        
        # Parse structured response directly to ClaimResponse
        result_text = response.choices[0].message.content
        claim_response = ClaimResponse.model_validate_json(result_text)
        
        logger.info(f"Fact-check completed: {claim.claim} -> {claim_response.status}")
        return claim_response
        
    except Exception as e:
        logger.error(f"Fact-checking failed for claim '{claim.claim}': {e}")
        
        # Return inconclusive result on error
        return ClaimResponse(
            claim=claim,
            status=ClaimStatus.INCONCLUSIVE,
            summary="Could not fact-check this claim due to technical error.",
            evidence=[]
        )


