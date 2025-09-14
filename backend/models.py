"""
Pydantic data models for the YouTube Fact-Checker
"""
from datetime import datetime

from pydantic import BaseModel
from typing import List, Dict, Any, Optional
from enum import Enum


# ClaimStatus as simple string literals (categorical variable)
ClaimStatus = str  # "verified", "false", "disputed", "inconclusive"

class VideoRequest(BaseModel):
    """Request to process a video"""
    video_url: str


class Evidence(BaseModel):
    """Evidence for a fact-check"""
    source_url: str
    source_title: str
    snippet: str # short summary of source

class Claim(BaseModel):
    """A fact-checked claim with timestamp"""
    start: float
    claim: str

class ClaimWithAllEvidence(BaseModel):
    """A fact-checked claim with all evidence"""
    start: float
    claim: Claim # claim with timestamp
    summary: str # overall summary of claim
    evidence: List[Evidence] # list of all evidence for the claim; multiple sources


class ClaimResponse(BaseModel):
    """Final fact-check response with written summary"""
    claim: Claim
    status: str  # "verified", "false", "disputed", "inconclusive"
    written_summary: str  # Written explanation of the fact-check result
    evidence: List[Evidence]

class Sentence(BaseModel):
    """A transcribed sentence with timestamp"""
    start: float  # Start time in seconds
    text: str     # Complete sentence text


class VideoResponse(BaseModel):
    """Response after processing a video"""
    video_id: str
    title: str
    total_claims: int
    claims: List[Claim]
    summary: Dict[str, int]  # {"verified": 2, "false": 1, etc.}

