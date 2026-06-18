"""ElevenLabs Scribe v2 transcription service.

Sends audio to ElevenLabs' speech-to-text endpoint and returns normalized
output matching the contract the pipeline expects:
    {full_text, language, segments, duration_seconds}

Scribe v2 auto-detects language per segment, so mixed-language (e.g. Turkish/
English code-switched) recordings transcribe in full without translation.
Diarization is intentionally OFF in v1 — it roughly 10x's latency. Speaker
labels / segment timestamps are a planned Pro fast-follow (the API already
returns word-level timestamps for free when we want to build them).
"""
import mimetypes
import os
import time
from typing import BinaryIO

import httpx

from app.config import settings
from app.utils.exceptions import ExternalServiceError
from app.utils.logging import get_logger

log = get_logger(__name__)

_ENDPOINT = "https://api.elevenlabs.io/v1/speech-to-text"
_MODEL_ID = "scribe_v2"
_COST_PER_MINUTE_USD = 0.22 / 60.0  # ElevenLabs Scribe v2 ≈ $0.22/hour
_REQUEST_TIMEOUT = httpx.Timeout(600.0, connect=15.0)

# ElevenLabs returns ISO-639-3 (e.g. "tur", "eng") or 2-letter codes. We store
# 'en'/'tr' for the UI language badge; anything else falls back to 'en'.
_LANGUAGE_NORMALIZE = {"tur": "tr", "tr": "tr", "eng": "en", "en": "en"}

_CONTENT_TYPES = {
    ".m4a": "audio/mp4",
    ".mp3": "audio/mpeg",
    ".wav": "audio/wav",
    ".ogg": "audio/ogg",
    ".webm": "audio/webm",
    ".flac": "audio/flac",
    ".mp4": "audio/mp4",
}


def _content_type_for(filename: str) -> str:
    ctype, _ = mimetypes.guess_type(filename)
    if ctype:
        return ctype
    ext = os.path.splitext(filename)[1].lower()
    return _CONTENT_TYPES.get(ext, "application/octet-stream")


class TranscriptionService:
    async def transcribe(self, audio_file: BinaryIO, language: str | None = None) -> dict:
        """Transcribe a file-like audio object with ElevenLabs Scribe v2.

        `language` is accepted for interface compatibility but intentionally not
        forwarded — Scribe v2 auto-detects per segment, which is what makes
        mixed-language audio work. Returns {full_text, language, segments,
        duration_seconds}; segments is [] in v1 (see module docstring).
        """
        if not settings.ELEVENLABS_API_KEY:
            raise ExternalServiceError("ELEVENLABS_API_KEY not configured")

        filename = getattr(audio_file, "name", "audio.m4a")
        content_type = _content_type_for(filename)
        audio_bytes = audio_file.read()

        files = {"file": (filename, audio_bytes, content_type)}
        data = {
            "model_id": _MODEL_ID,
            "diarize": "false",
            "tag_audio_events": "false",
        }
        headers = {"xi-api-key": settings.ELEVENLABS_API_KEY}

        started = time.monotonic()
        try:
            async with httpx.AsyncClient(timeout=_REQUEST_TIMEOUT) as client:
                response = await client.post(
                    _ENDPOINT, headers=headers, data=data, files=files
                )
        except Exception as exc:
            log.exception("ElevenLabs API call failed")
            raise ExternalServiceError(f"ElevenLabs API error: {exc}") from exc

        if response.status_code != 200:
            log.error(
                "ElevenLabs returned %s: %s", response.status_code, response.text[:500]
            )
            raise ExternalServiceError(
                f"ElevenLabs API error: HTTP {response.status_code}"
            )

        api_seconds = time.monotonic() - started
        body = response.json()

        full_text = body.get("text") or ""
        raw_language = (body.get("language_code") or "").lower()
        normalized_language = _LANGUAGE_NORMALIZE.get(raw_language, "en")

        # Duration: derive from the last word's end timestamp when present.
        duration_seconds = 0.0
        for w in reversed(body.get("words") or []):
            end = w.get("end")
            if end is not None:
                duration_seconds = float(end)
                break

        cost = (duration_seconds / 60.0) * _COST_PER_MINUTE_USD
        log.info(
            "Scribe transcribe: model=%s api=%.2fs audio=%.2fs cost=$%.4f lang=%s->%s chars=%d",
            _MODEL_ID, api_seconds, duration_seconds, cost, raw_language,
            normalized_language, len(full_text),
        )

        return {
            "full_text": full_text,
            "language": normalized_language,
            "segments": [],
            "duration_seconds": duration_seconds,
        }
