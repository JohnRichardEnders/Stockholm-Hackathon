"""
Transcription Service - Full URL to Transcript

FUNCTION TO IMPLEMENT:
async def transcribe_from_url(video_url: str) -> List[dict]

INPUT:
- video_url: "https://youtube.com/watch?v=dQw4w9WgXcQ" (YouTube URL)

OUTPUT:
List of segments with exact timestamps:
[
  {
    "id": 0,
    "start": 0.0,
    "end": 5.2,
    "text": "Hello everyone, welcome to today's show."
  },
  {
    "id": 1,
    "start": 5.2,
    "end": 9.8,
    "text": "Today we'll discuss how vaccines cause autism."
  },
  {
    "id": 2,
    "start": 9.8,
    "end": 12.5,
    "text": "This is a very controversial topic."
  }
]

IMPLEMENTATION STEPS:
1. Download audio from YouTube URL using yt-dlp
2. Call OpenAI Whisper API with response_format="verbose_json" and timestamp_granularities=["segment"]
3. Convert response.segments to our format
4. Clean up temporary audio file
5. Return segments list

DEPENDENCIES:
- openai library (for Whisper API)
- yt-dlp library (for YouTube audio download)
- Set OPENAI_API_KEY environment variable

ERROR HANDLING:
- Return empty list on failure
- Log errors for debugging
- Clean up temp files even on error
"""

from typing import List, Dict
import logging

logger = logging.getLogger(__name__)


async def transcribe_from_url(video_url: str) -> List[Dict]:
    """
    Get full transcript from YouTube URL
    
    TODO: Implement this function
    1. Download audio from YouTube URL using yt-dlp
    2. Call OpenAI Whisper API with segments
    3. Convert response to our format
    4. Clean up temporary audio file
    5. Return list of segments with timestamps
    """
    
    # TODO: Replace with real implementation
    # Mock response for testing
    mock_segments = [
        {
            "id": 0,
            "start": 0.0,
            "end": 5.2,
            "text": "Hello everyone, welcome to today's show."
        },
        {
            "id": 1,
            "start": 5.2,
            "end": 9.8,
            "text": "Today we'll discuss how vaccines cause autism."
        },
        {
            "id": 2,
            "start": 9.8,
            "end": 12.5,
            "text": "This is a very controversial topic."
        },
        {
            "id": 3,
            "start": 12.5,
            "end": 18.3,
            "text": "The Earth is actually flat, not round like they tell us."
        },
        {
            "id": 4,
            "start": 18.3,
            "end": 22.1,
            "text": "Thanks for watching, see you next time."
        }
    ]
    
    logger.info(f"Transcribed audio with {len(mock_segments)} segments")
    return mock_segments
