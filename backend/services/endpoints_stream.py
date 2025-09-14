# --- add to an API file (e.g., api/endpoints_stream.py) or main, and include router if needed ---
from fastapi import APIRouter, Body
from fastapi.responses import StreamingResponse
import asyncio
import json
import logging

from services.transcription_service import transcribe_from_url_streaming  # yields Sentence(start, text)
from services.claim_service import extract_claims_from_sentence
from services.fact_checking_service import fact_check_claim

router_stream = APIRouter()
logger = logging.getLogger(__name__)

def _jsonl(obj: dict) -> str:
    return json.dumps(obj, ensure_ascii=False) + "\n"

@router_stream.post("/api/process-video/stream")
async def process_video_stream(payload: dict = Body(...)):
    """
    Streams JSON lines as the pipeline progresses:
    sentence -> claim(s) -> fact_check (per claim)
    """
    video_url = payload.get("url")
    if not video_url:
        return StreamingResponse(iter([_jsonl({"type": "error", "message": "missing url"})]),
                                 media_type="application/jsonl")

    async def event_gen():
        try:
            # Tell client we started
            yield _jsonl({"type": "start", "url": video_url})

            async for sentence in transcribe_from_url_streaming(video_url):
                # 1) Sentence
                yield _jsonl({"type": "sentence", "start": sentence.start, "text": sentence.text})

                # 2) Claims from sentence
                claims = await extract_claims_from_sentence(sentence)
                for claim in claims:
                    yield _jsonl({"type": "claim", "start": claim.start, "claim": claim.claim})

                    # 3) Fact-check claim (serial for now; see parallel note below)
                    fc = await fact_check_claim(claim)
                    out = {
                        "type": "fact_check",
                        "start": getattr(fc.claim, "start", claim.start),
                        "claim": getattr(fc.claim, "claim", claim.claim),
                        "status": getattr(fc, "status", "inconclusive"),
                        "summary": getattr(fc, "written_summary", "") or getattr(fc, "summary", ""),
                        "evidence": [
                            {
                                "title": getattr(e, "source_title", ""),
                                "url": getattr(e, "source_url", ""),
                                "snippet": getattr(e, "snippet", ""),
                            } for e in getattr(fc, "evidence", []) or []
                        ],
                    }
                    yield _jsonl(out)

                # Give the event loop a chance to flush
                await asyncio.sleep(0)

            yield _jsonl({"type": "done"})
        except Exception as e:
            logger.exception("Streaming pipeline failed")
            yield _jsonl({"type": "error", "message": str(e)})

    return StreamingResponse(event_gen(), media_type="application/jsonl")

# In main.py (or where you build FastAPI):
# from api.endpoints_stream import router_stream
# app.include_router(router_stream)
