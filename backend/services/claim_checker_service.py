import json
from typing import List
from openai import OpenAI
import os
from dotenv import load_dotenv

from pydantic import BaseModel

load_dotenv()

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

from models import ClaimResponse, Claim, ClaimStatus, Evidence, ClaimWithAllEvidence


def check_claim(claim: ClaimWithAllEvidence) -> ClaimResponse:
    """
    Check a claim using OpenAI's structured output to ensure reliable fact-checking results.
    Returns a structured ClaimResponse with status, summary, and evidence.
    """
    
    response = client.chat.completions.parse(
        model="gpt-4o-2024-08-06",
        messages=[
            {
                "role": "system",
                "content": (
                    "You are a fact-checking assistant. "
                    "Given a claim with evidence, analyze the claim and return a structured response. "
                    "Classify the claim as one of: verified, false, disputed, or inconclusive. "
                    "Provide a clear summary explaining your reasoning based on the available evidence. "
                    "If evidence is provided, reference it in your analysis. "
                    "If no evidence is provided, indicate that the claim cannot be properly verified."
                )
            },
            {
                "role": "user", 
                "content": f"Claim: {claim.claim.claim} (at {claim.claim.start}s)\nSummary: {claim.summary}\nEvidence: {[f'{e.source_title}: {e.snippet}' for e in claim.evidence]}"
            }
        ],
        response_format=ClaimResponse
    )
    
    # Extract the parsed response
    return response.choices[0].message.parsed


# Test the function
if __name__ == "__main__":
    test_claim = ClaimWithAllEvidence(
        claim=Claim(start=0.1, claim="trump is the first US president"), 
        summary="Claim about Trump being the first US president", 
        evidence=[]
    )
    
    result = check_claim(test_claim)
    print("Fact-check result:")
    print(f"Status: {result.status}")
    print(f"Summary: {result.summary}")
    print(f"Evidence count: {len(result.evidence)}")