"""
Pydantic data models for the YouTube Fact-Checker
"""

from pydantic import BaseModel
from typing import List, Dict, Any, Optional


class VideoRequest(BaseModel):
    """Request to process a video"""
    video_url: str


class Evidence(BaseModel):
    """Evidence for a fact-check"""
    source_url: str
    source_title: str
    excerpt: str


class Claim(BaseModel):
    """A fact-checked claim with timestamp"""
    start: float
    end: float
    claim: str
    category: str
    status: str  # "verified", "false", "disputed", "inconclusive"
    confidence: float
    explanation: str
    evidence: List[Evidence] = []


class VideoResponse(BaseModel):
    """Response after processing a video"""
    video_id: str
    title: str
    total_claims: int
    claims: List[Claim]
    summary: Dict[str, int]  # {"verified": 2, "false": 1, etc.}
