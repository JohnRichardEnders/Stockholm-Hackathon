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

from typing import List, Dict, AsyncGenerator, Any
import logging
import yt_dlp
import openai
import tempfile
import os
import subprocess
from dotenv import load_dotenv
from models import Sentence

# Load environment variables
load_dotenv()
logger = logging.getLogger(__name__)

# ---------- Helpers ----------

def chunk_segments_into_sentences(segments) -> List[Dict[str, Any]]:
    """
    Combine transcript segments into complete sentences.

    Args:
        segments: List of transcript segments from Whisper API (verbose_json)

    Returns:
        [{"start": float, "text": str}, ...]
    """
    if not segments:
        return []

    sentences: List[Dict[str, Any]] = []
    current_sentence = ""
    current_start_time = None

    for seg in segments:
        # segments can be dict-like from JSON; support both attribute and key access
        text = getattr(seg, "text", None)
        if text is None and hasattr(seg, 'get'):
            text = seg.get("text", "")
        text = (text or "").strip()
        
        start = getattr(seg, "start", None)
        if start is None and hasattr(seg, 'get'):
            start = seg.get("start", None)

        if not text:
            continue

        if current_start_time is None:
            current_start_time = float(start or 0.0)

        current_sentence = (current_sentence + " " + text).strip() if current_sentence else text

        if text.endswith(('.', '!', '?')):
            sentences.append({"start": current_start_time, "text": current_sentence.strip()})
            current_sentence = ""
            current_start_time = None

    if current_sentence.strip():
        # fallback start time to last segment if needed
        fallback_start = getattr(segments[-1], "start", None)
        if fallback_start is None and hasattr(segments[-1], 'get'):
            fallback_start = segments[-1].get("start", 0.0)
        fallback_start = float(fallback_start or 0.0)
        sentences.append({"start": current_start_time if current_start_time is not None else fallback_start,
                          "text": current_sentence.strip()})

    logger.info(f"Chunked {len(segments)} segments into {len(sentences)} complete sentences")
    return sentences


async def download_audio_from_youtube(video_url: str) -> str:
    """
    Download best audio via yt-dlp, then transcode to **mono WebM (Opus, 24 kbps, 16 kHz)**.
    Returns the path to the resulting .mono.webm file.

    Cleanup: removes the original download and leaves only the compact WebM.
    """
    raw_download_path = None
    webm_path = None

    try:
        temp_dir = tempfile.gettempdir()
        base = os.path.join(temp_dir, f"yt_{abs(hash(video_url))}")
        webm_path = base + ".mono.webm"

        # 1) Download bestaudio (container/codec may vary). No postprocessors here.
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
            raw_download_path = (
                info.get("requested_downloads", [{}])[0].get("filepath")
                or base + f".{info.get('ext','m4a')}"
            )

        if not raw_download_path or not os.path.exists(raw_download_path):
            raise FileNotFoundError("yt-dlp did not produce a downloadable audio file.")

        # avoid accidental same-path overwrite (paranoia)
        if os.path.abspath(raw_download_path) == os.path.abspath(webm_path):
            webm_path = base + ".transcoded.mono.webm"

        # 2) Transcode to compact mono WebM/Opus @16 kHz, ~24 kbps
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
            raise RuntimeError(f"ffmpeg failed: {proc.stderr.decode('utf-8', errors='ignore')}")

        return webm_path

    except Exception as e:
        logger.error(f"Failed to download/transcode audio from {video_url}: {e}")
        raise
    finally:
        # Always remove the raw original; keep the compact .mono.webm
        try:
            if raw_download_path and os.path.exists(raw_download_path):
                os.remove(raw_download_path)
        except Exception as ce:
            logger.warning(f"Failed to remove temp raw file '{raw_download_path}': {ce}")


# ---------- Whisper calls ----------

def _segments_to_dict_list(segments) -> List[Dict[str, Any]]:
    """
    Convert Whisper verbose_json segments to the required output shape:
    [{"id": int, "start": float, "end": float, "text": str}, ...]
    """
    out: List[Dict[str, Any]] = []
    for i, seg in enumerate(segments):
        # tolerate dict or object
        start = getattr(seg, "start", None)
        end = getattr(seg, "end", None)
        text = getattr(seg, "text", None)
        seg_id = getattr(seg, "id", None)
        
        if start is None and hasattr(seg, 'get'):
            start = seg.get("start", 0.0)
        if end is None and hasattr(seg, 'get'):
            end = seg.get("end", 0.0)
        if text is None and hasattr(seg, 'get'):
            text = seg.get("text", "")
        if seg_id is None and hasattr(seg, 'get'):
            seg_id = seg.get("id", i)

        out.append({
            "id": seg_id or i,
            "start": float(start or 0.0),
            "end": float(end or 0.0),
            "text": str(text or "").strip(),
        })
    return out


async def transcribe_from_url(video_url: str) -> List[Dict[str, Any]]:
    """
    Full URL -> Transcript (batch).
    Returns a list of segments: [{"id": 0, "start": 0.0, "end": 5.2, "text": "..."}]

    Error handling: returns [] on failure and logs errors.
    """
    audio_path = None
    try:
        logger.info(f"Starting transcription for video: {video_url}")
        audio_path = await download_audio_from_youtube(video_url)
        logger.info(f"Audio ready at: {audio_path}")

        with open(audio_path, "rb") as audio_file:
            client = openai.OpenAI()
            transcript = client.audio.transcriptions.create(
                model="whisper-1",
                file=audio_file,
                response_format="verbose_json",
                # keep segment and word timings available; we only return segments here,
                # but word timing can be useful for downstream features/logging.
                timestamp_granularities=["segment", "word"],
            )

        segs = getattr(transcript, "segments", None) or transcript.get("segments", [])
        logger.info(f"Transcription completed. Found {len(segs)} segments")
        return _segments_to_dict_list(segs)

    except Exception as e:
        logger.error(f"Error in transcribe_from_url: {e}")
        return []
    finally:
        if audio_path and os.path.exists(audio_path):
            try:
                os.remove(audio_path)
                logger.info(f"Cleaned up audio file: {audio_path}")
            except Exception as ce:
                logger.warning(f"Failed to cleanup audio file '{audio_path}': {ce}")


async def transcribe_from_url_streaming(video_url: str) -> AsyncGenerator[Sentence, None]:
    """
    Stream sentences from a YouTube URL as an async generator.

    Yields Sentence(start: float, text: str) to match existing consumers.
    """
    audio_path = None
    try:
        logger.info(f"Starting streaming transcription for video: {video_url}")
        audio_path = await download_audio_from_youtube(video_url)
        logger.info(f"Audio downloaded/transcoded to: {audio_path}")

        with open(audio_path, "rb") as audio_file:
            client = openai.OpenAI()
            transcript = client.audio.transcriptions.create(
                model="whisper-1",
                file=audio_file,
                response_format="verbose_json",
                timestamp_granularities=["segment", "word"],
            )

        segs = getattr(transcript, "segments", None) or transcript.get("segments", [])
        logger.info(f"Transcription completed. Found {len(segs)} segments")

        sentences = chunk_segments_into_sentences(segs)  # list of dicts
        for s in sentences:
            sent = Sentence(start=float(s["start"]), text=str(s["text"]))
            logger.info(f"Streaming sentence at {sent.start:.2f}s: {sent.text[:80]!r}")
            yield sent

        logger.info("Finished streaming all sentences")

    except Exception as e:
        logger.error(f"Error in streaming transcription: {e}")
        return
    finally:
        if audio_path and os.path.exists(audio_path):
            try:
                os.remove(audio_path)
                logger.info(f"Cleaned up audio file: {audio_path}")
            except Exception as ce:
                logger.warning(f"Failed to cleanup audio file '{audio_path}': {ce}")
