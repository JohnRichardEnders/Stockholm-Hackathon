"""
Claim Extraction Service - OpenAI Integration

FUNCTION TO IMPLEMENT:
async def extract_claims_from_segment(segment: dict) -> List[dict]

INPUT:
Single segment with timestamp:
{
  "id": 1,
  "start": 5.2,
  "end": 9.8,
  "text": "Today we'll discuss how vaccines cause autism."
}

OUTPUT:
List of claims (empty list if no claims):
[
  {
    "text": "vaccines cause autism",
    "category": "health",
    "confidence": 0.9
  }
]

OR empty list [] if no verifiable claims in segment

IMPLEMENTATION NOTES:
- Use OpenAI GPT-4o-mini for cost efficiency
- Analyze each segment individually
- Only extract clear, verifiable factual claims
- Skip opinions, questions, greetings, conclusions
- Categories: "science", "health", "politics", "history", "technology", "other"
- Confidence: 0.0 to 1.0 (how confident the extraction is)
- Return empty list if no claims found

PROMPT STRATEGY:
- Ask LLM to identify factual claims that can be verified
- Ignore subjective statements, opinions, questions
- Focus on specific, testable assertions
- Return structured JSON response

DEPENDENCIES:
- openai library
- Set OPENAI_API_KEY environment variable
"""

from __future__ import annotations
import asyncio
import logging
import os
from typing import Dict, List, Any, Optional

from dotenv import load_dotenv
from openai import OpenAI
from openai._exceptions import RateLimitError, APIStatusError

load_dotenv()



logger = logging.getLogger(__name__)

# You can inject this client or create once at module import.
_client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))  # uses OPENAI_API_KEY env var


SYSTEM_PROMPT = """You are ChatGPT, a meticulous detector for verifiable factual claims in spoken transcripts.

Task: For a given segment, decide if it contains at least one concrete, checkable factual assertion that should be sent for fact checking.

Positive examples (return True):
- “Vaccines cause autism.”
- “The earth is flat.”
- “He graduated from MIT in 2012.”
- “Twitter was renamed to X in 2023.”
- “She moved to Paris last year.”

Return False for:
- Greetings/farewells (“hey”, “thanks”, “see you”)
- Fillers/backchannels (“uh”, “you know”)
- Pure opinions/feelings (“I think this is awesome”), jokes, sarcasm
- Commands/intentions (“we should go”, “I’ll try to…”)
- Meta talk (“as I said”, “let’s move on”)
- Obvious nonsense, laughter markers ([laughter], “haha”, “lol”) unless surrounded by sober assertions
- Hedges with no concrete proposition (“maybe it could be that…”)
- Vague or incomplete statements that don’t assert a checkable fact

Policy: Be conservative. Return True only if the segment contains a concrete proposition about reality that can be verified. Output MUST be a single boolean field."""


def _response_schema() -> Dict[str, Any]:
    return {
        "name": "fact_check_gate",
        "schema": {
            "type": "object",
            "properties": {
                "needs_fact_check": {"type": "boolean"}
            },
            "required": ["needs_fact_check"],
            "additionalProperties": False,
        },
        "strict": True,
    }


async def _call_openai_json(
    text: str,
    model: str = "gpt-4.1-mini",
    max_retries: int = 3,
    timeout: Optional[float] = None,
    _client_override: Optional[OpenAI] = None,
) -> Dict[str, Any]:
    """
    Try Responses API + Structured Outputs.
    Fallback to Chat Completions + Function Calling if 'response_format' isn't supported.
    Returns {"needs_fact_check": bool}.
    """
    use_client = _client_override or _client
    backoff = 0.8

    tool = {
        "type": "function",
        "function": {
            "name": "fact_check_gate",
            "description": "Boolean gate: does the segment contain a verifiable factual claim that should be fact-checked?",
            "parameters": _response_schema()["schema"],
        },
    }

    for attempt in range(1, max_retries + 1):
        try:
            # --- Preferred: Responses API + structured outputs ---
            try:
                resp = use_client.responses.create(
                    model=model,
                    temperature=0.1,
                    instructions=SYSTEM_PROMPT,
                    input=[{
                        "role": "user",
                        "content": f"Transcript segment:\n{text}\n\nReturn JSON with only needs_fact_check.",
                    }],
                    response_format={"type": "json_schema", "json_schema": _response_schema()},
                    max_output_tokens=100,
                )
                try:
                    parsed = resp.output[0].content[0].parsed  # parsed dict
                except Exception:
                    import json
                    parsed = json.loads(resp.output_text)
                parsed.setdefault("needs_fact_check", False)
                return parsed

            except TypeError:
                # --- Fallback: Chat Completions + Function Calling ---
                resp = use_client.chat.completions.create(
                    model=model,
                    temperature=0.1,
                    messages=[
                        {"role": "system", "content": SYSTEM_PROMPT},
                        {"role": "user", "content": f"Transcript segment:\n{text}\nReturn ONLY via the function tool."},
                    ],
                    tools=[tool],
                    tool_choice={"type": "function", "function": {"name": "fact_check_gate"}},
                    max_tokens=100,
                )
                choice = resp.choices[0]
                tool_calls = getattr(choice.message, "tool_calls", None) or \
                             (choice.message.get("tool_calls") if hasattr(choice, "message") and isinstance(choice.message, dict) else None)
                if not tool_calls:
                    return {"needs_fact_check": False}
                import json
                parsed = json.loads(tool_calls[0].function.arguments)
                parsed.setdefault("needs_fact_check", False)
                return parsed

        except RateLimitError:
            if attempt == max_retries:
                raise
            import asyncio
            await asyncio.sleep(backoff * (2 ** (attempt - 1)))
        except APIStatusError as e:
            if e.status_code and 500 <= e.status_code < 600 and attempt < max_retries:
                import asyncio
                await asyncio.sleep(backoff * (2 ** (attempt - 1)))
            else:
                raise

# existing module-level client (prefer env var in real code)
# _client = OpenAI()

async def extract_claims_from_segment(
    segment: Dict,
    model: str = "gpt-4.1-mini",
    client: Optional[OpenAI] = None,
) -> bool:
    """
    Return True iff the segment contains a verifiable factual claim that should be fact-checked.
    """
    text = (segment.get("text") or "").strip()
    if not text:
        logger.info("Empty segment text; skipping.")
        return False

    # Fast path: skip short greetings/farewells without calling the API
    lowered = text.lower()
    greeting_words = ("hello", "welcome", "thanks", "thank you", "goodbye", "see you")
    if any(w in lowered for w in greeting_words) and len(text.split()) <= 8:
        return False

    result = await _call_openai_json(text=text, model=model, _client_override=client)
    needs = bool(result.get("needs_fact_check", False))
    logger.info(f"Segment id={segment.get('id')} needs_fact_check={needs} text='{text[:60]}...'")
    return needs





async def test():
    client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))  # requires OPENAI_API_KEY set
    segs = [
        {"id": 100, "text": "Vaccines cause autism."},  # claim (health)
        {"id": 101, "text": "Hello there!"},  # greeting, skip
        {"id": 102, "text": "The Earth is flat and climate change is fake."},  # claims (science, environment)
        {"id": 103, "text": "For it to be just talking about the bullying stuff..."},  # vague, skip

        # more examples:
        {"id": 104, "text": "Barack Obama was elected president in 2008."},  # claim (politics)
        {"id": 105, "text": "I think pizza is the best food ever."},  # opinion, skip
        {"id": 106, "text": "Global average temperatures have risen by about 1.1°C since pre-industrial times."},  # claim (environment/science)
        {"id": 107, "text": "Our company revenue grew 20 percent last quarter."},  # claim (economics)
        {"id": 108, "text": "Did you hear that Facebook was renamed Meta?"},  # claim embedded in a question → extractor may still catch
        {"id": 109, "text": "Uh, you know, like, we just kept talking and stuff."},  # filler, skip
        {"id": 110, "text": "Cristiano Ronaldo scored over 800 career goals."},  # claim (sports)
        {"id": 111, "text": "Elon Musk owns Tesla and SpaceX."},  # claim (tech/business)
        {"id": 112, "text": "See you tomorrow!"},  # farewell, skip
        {"id": 113, "text": "Mount Everest is the tallest mountain on Earth."},  # claim (science/geography)
        {"id": 114, "text": "My favorite color is blue."},  # personal preference, skip
        {"id": 114, "text": "Donald trump just got shot."},
    ]
    segs = [
        {"id": 100, "text": "Vaccines cause autism."},
        {"id": 101, "text": "Hello there!"},
        {"id": 102, "text": "The Earth is flat and climate change is fake."},
        {"id": 103, "text": "For it to be just talking about the bullying stuff..."},
        {"id": 104, "text": "Barack Obama was elected president in 2008."},
        {"id": 105, "text": "I think pizza is the best food ever."},
        {"id": 106, "text": "Global average temperatures have risen by about 1.1°C since pre-industrial times."},
        {"id": 107, "text": "Our company revenue grew 20 percent last quarter."},
        {"id": 108, "text": "Did you hear that Facebook was renamed Meta?"},
        {"id": 109, "text": "Uh, you know, like, we just kept talking and stuff."},
        {"id": 110, "text": "Cristiano Ronaldo scored over 800 career goals."},
        {"id": 111, "text": "Elon Musk owns Tesla and SpaceX."},
        {"id": 112, "text": "See you tomorrow!"},
        {"id": 113, "text": "Mount Everest is the tallest mountain on Earth."},
        {"id": 114, "text": "My favorite color is blue."},
        {"id": 115, "text": "Donald Trump just got shot."},  # event-style claim
    ]
    for s in segs:
        needs = await extract_claims_from_segment(s, model="gpt-4.1-mini", client=client)
        print(needs)


if __name__ == "__main__":
    asyncio.run(test())
