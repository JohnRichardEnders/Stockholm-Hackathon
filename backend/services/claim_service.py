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

# Load environment variables
load_dotenv()


# add near the top
import re
import string

# ===== filters =====
VAGUE = {"it","this","that","they","he","she","these","those"}
HEDGES = {"maybe","might","could","possibly","likely","appears","seems","probably"}
REL_TIME = {"today","yesterday","tomorrow","recently","last year","this year","last month","this month","last week","this week"}
AUX = {"is","are","was","were","has","have","had","do","does","did","will","would","should","can","cannot","cant"}

def _tokens(s: str):
    return re.findall(r"\w+", s.lower())

def _jaccard(a, b):
    ia = set(a); ib = set(b)
    inter = ia & ib; union = ia | ib
    return len(inter) / max(1, len(union))

def _has_verb(toks):
    return any(t in AUX or t.endswith(("ed","es","ing")) for t in toks)

def _non_claim(s: str) -> bool:
    s = s.strip()
    if not s: return True
    if s.endswith("?"): return True
    if re.match(r"^\s*(please|do|make|tell|consider)\b", s.lower()): return True
    toks = _tokens(s)
    if len(toks) < 3 or len(toks) > 60: return True
    if not _has_verb(toks): return True
    return False

def _ambiguous(s: str) -> bool:
    toks = _tokens(s)
    if not toks: return True
    if toks[0] in VAGUE and len(toks) < 5: return True
    if set(toks) & HEDGES: return True
    return False

def _temporal_vague(s: str) -> bool:
    low = s.lower()
    return any(rt in low for rt in REL_TIME)

def _grounded(claim: str, src: str) -> bool:
    return _jaccard(_tokens(claim), _tokens(src)) >= 0.35

def _numeric_ok(claim: str, src: str) -> bool:
    nums = re.findall(r"\d[\d,.\-]*", claim)
    return all(n in src for n in nums)

def _near_dup(s: str, kept: list) -> bool:
    ta = set(_tokens(s))
    for k in kept:
        tb = set(_tokens(k))
        if _jaccard(ta, tb) > 0.9:
            return True
    return False

def _clean_end(s: str) -> str:
    s = s.strip()
    if s and s[-1].isalnum():
        s += "."
    return s

def filter_claims(claims: list, source: str) -> list:
    out = []
    for c in claims:
        if _non_claim(c): continue
        if _ambiguous(c): continue
        if _temporal_vague(c): continue
        if not _grounded(c, source): continue
        if not _numeric_ok(c, source): continue
        if _near_dup(c, out): continue
        out.append(_clean_end(c))
    return out



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
        
        # Call RunPod to extract claims
        response = client.chat.completions.create(
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
            temperature=0.1
        )
        
        # Parse response and create Claim objects
        result_text = response.choices[0].message.content
        logger.info(f"RunPod raw response: {result_text}")
        
        result = json.loads(result_text)
        logger.info(f"Parsed result: {result}")
        
        claim_texts = result.get("claims", [])
        logger.info(f"Claim texts: {claim_texts}")
        
        claim_texts = filter_claims(claim_texts, text)

        logger.info(f"Filtered claim texts: {claim_texts}")

        claims = [Claim(start=sentence.start, claim=c) for c in claim_texts]
        
        logger.info(f"Extracted {len(claims)} claims from: '{text[:50]}...'")
        return claims
        
    except Exception as e:
        logger.error(f"RunPod extraction failed: {e}")
        raise RuntimeError(f"RunPod extraction failed: {e}")
        