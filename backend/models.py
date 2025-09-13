"""
Pydantic data models for the YouTube Fact-Checker
"""
from datetime import datetime

from pydantic import BaseModel
from typing import List, Dict, Any, Optional
from enum import Enum


class ClaimStatus(str, Enum):
    """Status values for fact-checked claims"""
    VERIFIED = "verified"  # Claim is accurate/true
    FALSE = "false"  # Claim is demonstrably false
    DISPUTED = "disputed"  # Mixed evidence, controversial
    INCONCLUSIVE = "inconclusive"  # Insufficient evidence

class VideoRequest(BaseModel):
    """Request to process a video"""
    video_url: str


class Evidence(BaseModel):
    """Evidence for a fact-check"""
    source_url: str
    source_title: str
    excerpt: str # short summary of source


class Claim(BaseModel):
    """A fact-checked claim with timestamp"""
    start: float
    end: float
    claim: str

class ClaimResponse(BaseModel):
    claim: Claim
    status: ClaimStatus
    summary: str # overall summary of claim
    evidence: List[Evidence]

class VideoResponse(BaseModel):
    """Response after processing a video"""
    video_id: str
    title: str
    total_claims: int
    claims: List[Claim]
    summary: Dict[str, int]  # {"verified": 2, "false": 1, etc.}
