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

from typing import List, Dict, AsyncGenerator
import logging
import yt_dlp
import openai
import tempfile
import os
import subprocess
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

logger = logging.getLogger(__name__)


def chunk_segments_into_sentences(segments) -> List[Dict[str, any]]:
    """
    Combine transcript segments into complete sentences
    
    Args:
        segments: List of transcript segments from Whisper API
        
    Returns:
        List[Dict]: List of sentence dictionaries with format:
            {"start": float, "text": str}
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
    Download best audio from YouTube using yt-dlp, then transcode to
    **mono WebM (Opus)** for faster uploads and smaller size.

    Returns:
        str: Path to the transcoded .webm file (ends with .mono.webm)
    """
    raw_download_path = None
    webm_path = None

    try:
        # Temporary base names
        temp_dir = tempfile.gettempdir()
        base = os.path.join(temp_dir, f"yt_{abs(hash(video_url))}")
        webm_path = base + ".mono.webm"   # <-- ensure output is a different filename

        # 1) Download bestaudio (no conversion here)
        ydl_opts = {
            "format": "bestaudio/best",
            "outtmpl": base + ".%(ext)s",
            "noplaylist": True,
            "quiet": True,
            "no_warnings": True,
            "retries": 3,
            "fragment_retries": 3,
            "postprocessors": [],
        }

        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(video_url, download=True)
            # Resolve the actual downloaded file path
            raw_download_path = (
                info.get("requested_downloads", [{}])[0].get("filepath")
                or base + f".{info.get('ext','m4a')}"
            )

        if not raw_download_path or not os.path.exists(raw_download_path):
            raise FileNotFoundError("yt-dlp did not produce a downloadable audio file.")

        # If yt-dlp already wrote to the same name (it shouldn't now), adjust target again
        if os.path.abspath(raw_download_path) == os.path.abspath(webm_path):
            webm_path = base + ".transcoded.mono.webm"

        # 2) Transcode to mono WebM (Opus) with ffmpeg
        ffmpeg_cmd = [
            "ffmpeg", "-hide_banner", "-nostdin", "-y",
            "-i", raw_download_path,
            "-ac", "1",
            "-ar", "16000",
            "-c:a", "libopus",
            "-b:a", "24k",
            "-application", "voip",
            "-vn",
            webm_path,
        ]
        proc = subprocess.run(ffmpeg_cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        if proc.returncode != 0 or not os.path.exists(webm_path):
            raise RuntimeError(
                f"ffmpeg failed: {proc.stderr.decode('utf-8', errors='ignore')}"
            )

        return webm_path

    except Exception as e:
        logger.error(f"Failed to download/transcode audio from {video_url}: {e}")
        raise
    finally:
        # Clean up the original download; keep only the .mono.webm we return
        try:
            if raw_download_path and os.path.exists(raw_download_path):
                os.remove(raw_download_path)
        except Exception as ce:
            logger.warning(f"Failed to remove temp raw file '{raw_download_path}': {ce}")


async def transcribe_from_url_streaming(video_url: str) -> AsyncGenerator[Dict[str, any], None]:
    """
    Stream sentences from YouTube URL as async generator
    
    Yields sentences one by one with start timestamps
    
    1. Download audio from YouTube URL using yt-dlp (now as mono WebM/Opus)
    2. Call OpenAI Whisper API with verbose_json format
    3. Yield each sentence with start time as it's processed
    4. Clean up temporary audio file
    
    Yields:
        dict: {"start": 5.2, "text": "This is a sentence."}
    """
    
    audio_path = None
    
    try:
        logger.info(f"Starting transcription for video: {video_url}")
        
        # Step 1: Download & transcode to mono WebM/Opus
        audio_path = await download_audio_from_youtube(video_url)
        logger.info(f"Audio downloaded/transcoded to: {audio_path}")
        
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
