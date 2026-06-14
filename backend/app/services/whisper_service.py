"""OpenAI Whisper transcription service.

Returns normalized output: full text, segments [{start,end,text}] or None,
audio duration, and language as 'en' | 'tr' (defaults to 'en' if Whisper
reports anything else).

Model notes:
  whisper-1            — supports verbose_json + segment timestamps; slower.
  gpt-4o-mini-transcribe — plain JSON only (no verbose_json); faster + cheaper.
  gpt-4o-transcribe    — same as gpt-4o-mini-transcribe regarding verbose_json.
"""
import time
from typing import BinaryIO

from app.config import settings
from app.utils.exceptions import ExternalServiceError
from app.utils.logging import get_logger

log = get_logger(__name__)

_LANGUAGE_NORMALIZE = {"english": "en", "turkish": "tr", "en": "en", "tr": "tr"}
_COST_PER_MINUTE_USD = 0.006

_TR_CHARS = set("çğıöşüÇĞİÖŞÜ")


def _detect_language_from_text(text: str) -> str:
    """Lightweight EN/TR detection for models that don't return a language
    (gpt-4o-mini-transcribe / gpt-4o-transcribe). Turkish prose is dense with
    ç/ğ/ı/ö/ş/ü, which English never uses; require a small minimum to ignore a
    stray loanword or proper noun."""
    if not text:
        return "en"
    tr_count = sum(1 for ch in text if ch in _TR_CHARS)
    return "tr" if tr_count >= 3 else "en"


def _uses_verbose_json(model: str) -> bool:
    """Only whisper-1 supports verbose_json with timestamp_granularities."""
    return model == "whisper-1"


class WhisperService:
    def __init__(self) -> None:
        self._client = None

    def _ensure_client(self):
        if self._client is None:
            if not settings.OPENAI_API_KEY:
                raise ExternalServiceError("OPENAI_API_KEY not configured")
            from openai import AsyncOpenAI
            self._client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
        return self._client

    async def transcribe(self, audio_file: BinaryIO, language: str | None = None) -> dict:
        """Transcribe a file-like audio object.

        `language`: optional ISO-639-1 hint ('en' or 'tr'). If None, auto-detected.
        Returns: {full_text, language, segments, duration_seconds}.
          - segments is a list of {start, end, text} dicts for whisper-1.
          - segments is [] for gpt-4o-mini-transcribe / gpt-4o-transcribe (empty
            list satisfies the NOT NULL constraint on the transcripts.segments column).
        """
        client = self._ensure_client()
        model = settings.OPENAI_TRANSCRIPTION_MODEL
        verbose = _uses_verbose_json(model)
        started = time.monotonic()

        try:
            if verbose:
                response = await client.audio.transcriptions.create(
                    model=model,
                    file=audio_file,
                    response_format="verbose_json",
                    timestamp_granularities=["segment"],
                    language=language,
                )
            else:
                response = await client.audio.transcriptions.create(
                    model=model,
                    file=audio_file,
                    response_format="json",
                    language=language,
                )
        except Exception as exc:
            log.exception("Whisper API call failed")
            raise ExternalServiceError(f"Whisper API error: {exc}") from exc

        api_seconds = time.monotonic() - started

        if verbose:
            audio_seconds = float(getattr(response, "duration", 0.0) or 0.0)
            raw_language = (getattr(response, "language", None) or "").lower()
            segments: list[dict] = [
                {"start": float(s.start), "end": float(s.end), "text": s.text}
                for s in (getattr(response, "segments", None) or [])
            ]
        else:
            audio_seconds = 0.0
            raw_language = _detect_language_from_text(response.text)
            segments = []

        normalized_language = _LANGUAGE_NORMALIZE.get(raw_language, "en")
        cost = (audio_seconds / 60.0) * _COST_PER_MINUTE_USD

        log.info(
            "Whisper transcribe: model=%s api=%.2fs audio=%.2fs cost=$%.4f lang=%s->%s segments=%s",
            model, api_seconds, audio_seconds, cost, raw_language, normalized_language,
            len(segments),
        )
        return {
            "full_text": response.text,
            "language": normalized_language,
            "segments": segments,
            "duration_seconds": audio_seconds,
        }
