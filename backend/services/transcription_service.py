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
from typing import List, Dict, Any, AsyncGenerator, Optional, Iterable
import logging
import yt_dlp
from openai import OpenAI
import tempfile
import os
import subprocess
from dotenv import load_dotenv

# Load environment variables
load_dotenv()
logger = logging.getLogger(__name__)

def chunk_segments_into_sentences(segments: Iterable[Any]) -> List[Dict[str, Any]]:
    """
    Combine transcript segments into complete sentences.
    Returns: [{"start": float, "text": str}, ...]
    """
    segments = list(segments or [])
    if not segments:
        return []

    sentences: List[Dict[str, Any]] = []
    current_sentence = ""
    current_start_time: Optional[float] = None

    for seg in segments:
        text = (getattr(seg, "text", None) or seg.get("text", "")).strip()
        start = getattr(seg, "start", None) if hasattr(seg, "start") else seg.get("start")

        if not text:
            continue

        if current_start_time is None:
            current_start_time = float(start or 0.0)

        current_sentence = (current_sentence + " " + text).strip() if current_sentence else text

        if text.endswith((".", "!", "?")):
            sentences.append({"start": float(current_start_time), "text": current_sentence})
            current_sentence = ""
            current_start_time = None

    if current_sentence.strip():
        # If last sentence has no end punctuation, anchor it to last segment start
        last_seg_start = getattr(segments[-1], "start", None) if hasattr(segments[-1], "start") else segments[-1].get("start", 0.0)
        sentences.append({"start": float(current_start_time if current_start_time is not None else last_seg_start or 0.0),
                          "text": current_sentence.strip()})

    logger.info(f"Chunked {len(segments)} segments into {len(sentences)} complete sentences")
    return sentences

async def download_audio_from_youtube(video_url: str) -> str:
    """
    Download best audio from YouTube using yt-dlp, then transcode to mono WebM (Opus).
    Returns path to .mono.webm
    """
    raw_download_path = None
    webm_path = None
    try:
        temp_dir = tempfile.gettempdir()
        base = os.path.join(temp_dir, f"yt_{abs(hash(video_url))}")
        webm_path = base + ".mono.webm"

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

        if os.path.abspath(raw_download_path) == os.path.abspath(webm_path):
            webm_path = base + ".transcoded.mono.webm"

        ffmpeg_cmd = [
            "ffmpeg", "-hide_banner", "-nostdin", "-y",
            "-i", raw_download_path,
            "-ac", "1", "-ar", "16000",
            "-c:a", "libopus", "-b:a", "24k",
            "-application", "voip",
            "-vn", webm_path,
        ]
        proc = subprocess.run(ffmpeg_cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        if proc.returncode != 0 or not os.path.exists(webm_path):
            raise RuntimeError(f"ffmpeg failed: {proc.stderr.decode('utf-8', errors='ignore')}")

        return webm_path
    finally:
        try:
            if raw_download_path and os.path.exists(raw_download_path):
                os.remove(raw_download_path)
        except Exception as ce:
            logger.warning(f"Failed to remove temp raw file '{raw_download_path}': {ce}")

def _collect_segments_and_words(transcript: Any) -> Dict[str, List[Dict[str, Any]]]:
    """
    Normalize different SDK response shapes into:
    {
      "segments": [{"start": float, "end": float, "text": str}, ...],
      "words":    [{"word": str, "start": float, "end": float}, ...]
    }
    """
    segs: List[Dict[str, Any]] = []
    words: List[Dict[str, Any]] = []

    # Try attribute-style first (as in pydantic objects), then dict-style
    raw_segments = getattr(transcript, "segments", None) or getattr(transcript, "data", None)
    if raw_segments is None:
        raw_segments = getattr(transcript, "json", lambda: {})().get("segments") if hasattr(transcript, "json") else None

    if raw_segments is None:
        raw_segments = transcript.get("segments") if isinstance(transcript, dict) else None

    if raw_segments:
        # Normalize segments
        for s in raw_segments:
            # s might be object or dict
            start = getattr(s, "start", None) if hasattr(s, "start") else s.get("start")
            end = getattr(s, "end", None) if hasattr(s, "end") else s.get("end")
            text = getattr(s, "text", None) if hasattr(s, "text") else s.get("text")
            segs.append({"start": float(start or 0.0),
                         "end": float(end or 0.0),
                         "text": str(text or "").strip()})
            # Collect nested words if present
            s_words = getattr(s, "words", None) if hasattr(s, "words") else s.get("words") if isinstance(s, dict) else None
            if s_words:
                for w in s_words:
                    w_text = getattr(w, "word", None) if hasattr(w, "word") else w.get("word")
                    w_start = getattr(w, "start", None) if hasattr(w, "start") else w.get("start")
                    w_end = getattr(w, "end", None) if hasattr(w, "end") else w.get("end")
                    if w_text is not None:
                        words.append({"word": str(w_text), "start": float(w_start or 0.0), "end": float(w_end or 0.0)})

    # Top-level words (some SDKs return this)
    top_words = getattr(transcript, "words", None) if hasattr(transcript, "words") else transcript.get("words") if isinstance(transcript, dict) else None
    if top_words:
        for w in top_words:
            w_text = getattr(w, "word", None) if hasattr(w, "word") else w.get("word")
            w_start = getattr(w, "start", None) if hasattr(w, "start") else w.get("start")
            w_end = getattr(w, "end", None) if hasattr(w, "end") else w.get("end")
            if w_text is not None:
                words.append({"word": str(w_text), "start": float(w_start or 0.0), "end": float(w_end or 0.0)})

    return {"segments": segs, "words": words}

async def transcribe_from_url_streaming(
    video_url: str,
    *,
    yield_mode: str = "sentence",   # "sentence" | "word" | "both"
    words_store: Optional[Dict[int, Dict[str, Any]]] = None
) -> AsyncGenerator[Dict[str, Any], None]:
    """
    Stream transcription results from a YouTube URL.

    yield_mode="sentence": yields {"start": float, "text": str}
    yield_mode="word":     yields {"i": int, "word": str, "start": float, "end": float}
    yield_mode="both":     yields words first, then sentences

    If words_store is provided, it will be populated as:
      { idx: {"word": str, "start": float, "end": float} }
    """
    audio_path = None
    try:
        logger.info(f"Starting transcription for video: {video_url}")
        audio_path = await download_audio_from_youtube(video_url)
        logger.info(f"Audio downloaded/transcoded to: {audio_path}")

        client = OpenAI()  # api key from env
        logger.info("Starting Whisper API transcription...")

        with open(audio_path, "rb") as audio_file:
            # Request BOTH granularities so you can do words and sentences
            transcript = client.audio.transcriptions.create(
                model="whisper-1",
                file=audio_file,
                response_format="verbose_json",
                timestamp_granularities=["segment", "word"],
            )

        norm = _collect_segments_and_words(transcript if isinstance(transcript, dict) else getattr(transcript, "model_dump", lambda: transcript)())
        segs = norm["segments"]
        words = norm["words"]

        logger.info(f"Transcription done. Segments: {len(segs)}, Words: {len(words)}")

        # Optionally store words in a dict by index
        if words_store is not None:
            words_store.clear()
            for i, w in enumerate(words):
                words_store[i] = {"word": w["word"], "start": w["start"], "end": w["end"]}

        async def _yield_words():
            for i, w in enumerate(words):
                item = {"i": i, "word": w["word"], "start": w["start"], "end": w["end"]}
                logger.info(f"Word {i} [{item['start']:.2f}-{item['end']:.2f}s]: {item['word']}")
                yield item

        async def _yield_sentences():
            sentences = chunk_segments_into_sentences(segs)
            for s in sentences:
                logger.info(f"Sentence at {s['start']:.2f}s: {s['text'][:80]}...")
                yield s

        if yield_mode == "word":
            async for w in _yield_words():
                yield w
        elif yield_mode == "both":
            async for w in _yield_words():
                yield w
            async for s in _yield_sentences():
                yield s
        else:  # "sentence"
            async for s in _yield_sentences():
                yield s

    except Exception as e:
        logger.error(f"Error in transcription: {e}")
        return
    finally:
        if audio_path and os.path.exists(audio_path):
            try:
                os.remove(audio_path)
                logger.info(f"Cleaned up audio file: {audio_path}")
            except Exception as e:
                logger.warning(f"Failed to cleanup audio file: {e}")
