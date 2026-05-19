"""Anthropic Claude summarization service.

Sends a transcript with a strict JSON-only system prompt, parses the response,
and returns a dict matching the summary content shape (without meeting_id /
raw_ai_response — those are added by the router that persists the row).
"""
import json
import time

from app.config import settings
from app.utils.exceptions import ExternalServiceError
from app.utils.logging import get_logger
from app.utils.prompt_templates import SUMMARIZATION_SYSTEM_PROMPT, SUMMARIZATION_USER_TEMPLATE

log = get_logger(__name__)

_INPUT_COST_PER_M_USD = 3.0
_OUTPUT_COST_PER_M_USD = 15.0


class ClaudeService:
    MODEL = "claude-sonnet-4-6"
    MAX_TOKENS = 4096

    def __init__(self) -> None:
        self._client = None

    def _ensure_client(self):
        if self._client is None:
            if not settings.ANTHROPIC_API_KEY:
                raise ExternalServiceError("ANTHROPIC_API_KEY not configured")
            from anthropic import Anthropic
            self._client = Anthropic(api_key=settings.ANTHROPIC_API_KEY)
        return self._client

    def summarize(self, transcript_text: str) -> dict:
        """Return {overview, decisions, action_items, topics, sentiment, key_quotes, raw_response}.

        `raw_response` is the verbatim text Claude returned (for the raw_ai_response column).
        """
        client = self._ensure_client()
        started = time.monotonic()
        try:
            response = client.messages.create(
                model=self.MODEL,
                max_tokens=self.MAX_TOKENS,
                system=SUMMARIZATION_SYSTEM_PROMPT,
                messages=[{
                    "role": "user",
                    "content": SUMMARIZATION_USER_TEMPLATE.format(transcript=transcript_text),
                }],
            )
        except Exception as exc:
            log.exception("Claude API call failed")
            raise ExternalServiceError(f"Claude API error: {exc}") from exc

        duration = time.monotonic() - started
        input_tokens = getattr(response.usage, "input_tokens", 0)
        output_tokens = getattr(response.usage, "output_tokens", 0)
        cost = (input_tokens / 1_000_000) * _INPUT_COST_PER_M_USD + \
               (output_tokens / 1_000_000) * _OUTPUT_COST_PER_M_USD
        log.info(
            "Claude summarize: %.2fs in=%d out=%d cost=$%.4f",
            duration, input_tokens, output_tokens, cost,
        )

        raw_text = response.content[0].text.strip() if response.content else ""
        payload = _parse_json_response(raw_text)
        _validate_shape(payload)
        payload["raw_response"] = raw_text
        return payload


def _parse_json_response(text: str) -> dict:
    cleaned = text.strip()
    # Strip accidental markdown fences even though the prompt forbids them.
    if cleaned.startswith("```"):
        cleaned = cleaned.strip("`")
        if cleaned.lower().startswith("json"):
            cleaned = cleaned[4:].strip()
    try:
        return json.loads(cleaned)
    except json.JSONDecodeError as exc:
        log.error("Claude returned non-JSON: %r", cleaned[:500])
        raise ExternalServiceError("Claude returned malformed JSON") from exc


_VALID_SENTIMENTS = {"productive", "tense", "casual", "neutral"}
_REQUIRED_FIELDS = ("overview", "decisions", "action_items", "topics", "sentiment", "key_quotes")


def _validate_shape(payload: dict) -> None:
    missing = [f for f in _REQUIRED_FIELDS if f not in payload]
    if missing:
        raise ExternalServiceError(f"Claude response missing fields: {missing}")
    if payload["sentiment"] not in _VALID_SENTIMENTS:
        raise ExternalServiceError(f"Invalid sentiment: {payload['sentiment']!r}")
