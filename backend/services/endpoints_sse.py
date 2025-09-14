# services/endpoints_sse.py
from fastapi import APIRouter, Query
from fastapi.responses import StreamingResponse
import asyncio, json, logging, itertools, hashlib

from services.transcription_service import transcribe_from_url_streaming
from services.claim_service import extract_claims_from_sentence
from services.fact_checking_service import fact_check_claim

router_sse = APIRouter()
logger = logging.getLogger(__name__)

def sse_pack(data: dict, event: str | None = None) -> bytes:
    # Format per SSE spec: optional "event:", then "data:", then blank line
    lines = []
    if event:
        lines.append(f"event: {event}")
    lines.append("data: " + json.dumps(data, ensure_ascii=False))
    lines.append("")
    return ("\n".join(lines)).encode("utf-8")

def _make_claim_id(start: float, text: str) -> str:
    raw = f"{start:.2f}::{text}"
    return hashlib.sha1(raw.encode("utf-8")).hexdigest()[:16]

@router_sse.get("/api/process-video/sse")
async def process_video_sse(url: str = Query(..., alias="url")):
    """
    SSE stream:
      event: start/sentence/claim/fact_check/done/error
      data:  JSON payload
    """
    async def event_gen():
        out_q: asyncio.Queue[bytes] = asyncio.Queue()
        tasks = []
        FC_CONCURRENCY = 3
        fc_sema = asyncio.Semaphore(FC_CONCURRENCY)
        sent_id_counter = itertools.count(1)

        async def emit(ev: dict, event: str | None = None):
            await out_q.put(sse_pack(ev, event))

        async def do_fact_check(claim_id, claim):
            try:
                async with fc_sema:
                    fc = await fact_check_claim(claim)
                await emit({
                    "type": "fact_check",
                    "claim_id": claim_id,
                    "start": getattr(fc.claim, "start", claim.start),
                    "claim": getattr(fc.claim, "claim", claim.claim),
                    "status": getattr(fc, "status", "inconclusive"),
                    "summary": getattr(fc, "written_summary", "") or getattr(fc, "summary", ""),
                    "evidence": [
                        {
                            "title": getattr(e, "source_title", ""),
                            "url": getattr(e, "source_url", ""),
                            "snippet": getattr(e, "snippet", "")
                        } for e in (getattr(fc, "evidence", []) or [])
                    ]
                }, event="fact_check")
            except Exception as e:
                logger.exception("fact_check failed")
                await emit({"type": "error", "scope": "fact_check", "message": str(e), "claim_id": claim_id}, event="error")

        async def do_claims_for_sentence(sentence, sentence_id):
            try:
                claims = await extract_claims_from_sentence(sentence)
                for claim in claims:
                    claim_id = _make_claim_id(claim.start, claim.claim)
                    await emit({
                        "type": "claim",
                        "claim_id": claim_id,
                        "sentence_id": sentence_id,
                        "start": claim.start,
                        "claim": claim.claim,
                        "status": "checking"
                    }, event="claim")
                    tasks.append(asyncio.create_task(do_fact_check(claim_id, claim)))
            except Exception as e:
                logger.exception("claims failed")
                await emit({"type": "error", "scope": "claims", "message": str(e)}, event="error")

        async def producer():
            await emit({"type": "start", "url": url}, event="start")
            async for sentence in transcribe_from_url_streaming(url):
                sentence_id = next(sent_id_counter)
                await emit({
                    "type": "sentence",
                    "sentence_id": sentence_id,
                    "start": sentence.start,
                    "text": sentence.text
                }, event="sentence")
                tasks.append(asyncio.create_task(do_claims_for_sentence(sentence, sentence_id)))
                await asyncio.sleep(0)
            if tasks:
                await asyncio.gather(*tasks, return_exceptions=True)
            await emit({"type": "done"}, event="done")

        prod_task = asyncio.create_task(producer())

        try:
            while True:
                if prod_task.done() and out_q.empty():
                    break
                try:
                    item = await asyncio.wait_for(out_q.get(), timeout=0.5)
                    # yield *bytes*, not str
                    yield item
                except asyncio.TimeoutError:
                    # Optionally send a comment heartbeat:
                    # yield b": keep-alive\n\n"
                    continue
        finally:
            for t in tasks:
                if not t.done():
                    t.cancel()
            if not prod_task.done():
                prod_task.cancel()

    # Important headers for SSE
    headers = {
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
        "X-Accel-Buffering": "no",  # helps if behind proxies (no buffering)
    }
    return StreamingResponse(event_gen(), media_type="text/event-stream", headers=headers)
