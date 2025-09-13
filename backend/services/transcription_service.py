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
import yt_dlp
import openai
import tempfile
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

logger = logging.getLogger(__name__)


def chunk_segments_into_sentences(segments):
    """
    Combine transcript segments into complete sentences
    
    Args:
        segments: List of transcript segments from Whisper API
        
    Returns:
        List of sentences with start times from first segment
    """
    if not segments:
        return []
    
    sentences = []
    current_sentence = ""
    current_start_time = None
    
    for segment in segments:
        text = segment.text.strip()
        
        # If this is the start of a new sentence, save the start time
        if current_start_time is None:
            current_start_time = segment.start
        
        # Add this segment's text to current sentence
        if current_sentence:
            current_sentence += " " + text
        else:
            current_sentence = text
        
        # Check if this segment ends with sentence-ending punctuation
        if text.endswith(('.', '!', '?')):
            # Complete sentence found
            sentences.append({
                "start": current_start_time,
                "text": current_sentence.strip()
            })
            
            # Reset for next sentence
            current_sentence = ""
            current_start_time = None
    
    # Handle any remaining text that doesn't end with punctuation
    if current_sentence.strip():
        sentences.append({
            "start": current_start_time if current_start_time is not None else segments[-1].start,
            "text": current_sentence.strip()
        })
    
    logger.info(f"Chunked {len(segments)} segments into {len(sentences)} complete sentences")
    return sentences


async def download_audio_from_youtube(video_url: str) -> str:
    """
    Download audio from YouTube video using yt-dlp
    
    Args:
        video_url: YouTube video URL
        
    Returns:
        str: Path to downloaded audio file
    """
    try:
        # Create temporary file
        temp_dir = tempfile.gettempdir()
        audio_path = os.path.join(temp_dir, f"audio_{hash(video_url)}.wav")
        
        # yt-dlp options for audio extraction
        ydl_opts = {
            'format': 'bestaudio/best',
            'outtmpl': audio_path,
            'postprocessors': [{
                'key': 'FFmpegExtractAudio',
                'preferredcodec': 'wav',
                'preferredquality': '192',
            }],
            'quiet': True,
            'no_warnings': True,
        }
        
        # Download audio
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            ydl.download([video_url])
        
        # yt-dlp adds .wav extension
        final_audio_path = audio_path + ".wav"
        
        if not os.path.exists(final_audio_path):
            raise Exception(f"Audio file not created at {final_audio_path}")
        
        return final_audio_path
        
    except Exception as e:
        logger.error(f"Failed to download audio from {video_url}: {e}")
        raise


async def transcribe_from_url_streaming(video_url: str):
    """
    Stream sentences from YouTube URL as async generator
    
    Yields sentences one by one with start timestamps
    
    1. Download audio from YouTube URL using yt-dlp
    2. Call OpenAI Whisper API with verbose_json format
    3. Yield each sentence with start time as it's processed
    4. Clean up temporary audio file
    
    Yields:
        dict: {"start": 5.2, "text": "This is a sentence."}
    """
    
    audio_path = None
    
    try:
        logger.info(f"Starting transcription for video: {video_url}")
        
        # Step 1: Download audio from YouTube
        audio_path = await download_audio_from_youtube(video_url)
        logger.info(f"Audio downloaded to: {audio_path}")
        
        # Step 2: Transcribe with OpenAI Whisper API
        logger.info("Starting Whisper API transcription...")
        
        with open(audio_path, "rb") as audio_file:
            client = openai.OpenAI()
            transcript = client.audio.transcriptions.create(
                model="whisper-1",
                file=audio_file,
                response_format="verbose_json",
                timestamp_granularities=["segment"]
            )
        
        logger.info(f"Transcription completed. Found {len(transcript.segments)} segments")
        
        # Step 3: Chunk segments into full sentences
        sentences = chunk_segments_into_sentences(transcript.segments)
        
        for sentence in sentences:
            logger.info(f"Streaming sentence at {sentence['start']}s: '{sentence['text'][:50]}...'")
            yield sentence
        
        logger.info("Finished streaming all sentences")
        
    except Exception as e:
        logger.error(f"Error in transcription: {e}")
        # Yield empty result on error
        return
        
    finally:
        # Step 4: Cleanup temporary audio file
        if audio_path and os.path.exists(audio_path):
            try:
                os.remove(audio_path)
                logger.info(f"Cleaned up audio file: {audio_path}")
            except Exception as e:
                logger.warning(f"Failed to cleanup audio file: {e}")


