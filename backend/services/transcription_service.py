"""
Transcription Service - Whisper API Integration

FUNCTION TO IMPLEMENT:
async def transcribe_audio(audio_path: str) -> List[dict]

INPUT:
- audio_path: "/tmp/audio_12345.wav" (path to downloaded audio file)

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

IMPLEMENTATION NOTES:
- Use OpenAI Whisper API
- Call with response_format="verbose_json" and timestamp_granularities=["segment"]
- Convert response.segments to our format
- Handle errors gracefully
- Return empty list on failure

DEPENDENCIES:
- openai library
- Set OPENAI_API_KEY environment variable
"""

from typing import List, Dict
import logging

logger = logging.getLogger(__name__)


async def transcribe_audio(audio_path: str) -> List[Dict]:
    """
    Transcribe audio file using Whisper API
    
    TODO: Implement this function
    1. Open audio file
    2. Call OpenAI Whisper API with segments
    3. Convert response to our format
    4. Return list of segments with timestamps
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
