"""OpenAI Whisper transcription service.

Returns normalized output: full text, segments [{start,end,text}], audio duration,
and language as 'en' | 'tr' (defaults to 'en' if Whisper reports anything else).
"""
import time
from typing import BinaryIO

from app.config import settings
from app.utils.exceptions import ExternalServiceError
from app.utils.logging import get_logger

log = get_logger(__name__)

_LANGUAGE_NORMALIZE = {"english": "en", "turkish": "tr", "en": "en", "tr": "tr"}
_COST_PER_MINUTE_USD = 0.006


class WhisperService:
    MODEL = "whisper-1"

    def __init__(self) -> None:
        self._client = None

    def _ensure_client(self):
        if self._client is None:
            if not settings.OPENAI_API_KEY:
                raise ExternalServiceError("OPENAI_API_KEY not configured")
            from openai import OpenAI
            self._client = OpenAI(api_key=settings.OPENAI_API_KEY)
        return self._client

    def transcribe(self, audio_file: BinaryIO, language: str | None = None) -> dict:
        """Transcribe a file-like audio object.

        `language`: optional ISO-639-1 hint ('en' or 'tr'). If None, Whisper auto-detects.
        Returns: {full_text, language, segments, duration_seconds}.
        """
        client = self._ensure_client()
        started = time.monotonic()
        try:
            response = client.audio.transcriptions.create(
                model=self.MODEL,
                file=audio_file,
                response_format="verbose_json",
                timestamp_granularities=["segment"],
                language=language,
            )
        except Exception as exc:
            log.exception("Whisper API call failed")
            raise ExternalServiceError(f"Whisper API error: {exc}") from exc

        api_seconds = time.monotonic() - started
        audio_seconds = float(getattr(response, "duration", 0.0) or 0.0)
        cost = (audio_seconds / 60.0) * _COST_PER_MINUTE_USD
        raw_language = (getattr(response, "language", None) or "").lower()
        normalized_language = _LANGUAGE_NORMALIZE.get(raw_language, "en")

        segments = [
            {"start": float(s.start), "end": float(s.end), "text": s.text}
            for s in (getattr(response, "segments", None) or [])
        ]
        log.info(
            "Whisper transcribe: api=%.2fs audio=%.2fs cost=$%.4f lang=%s->%s segments=%d",
            api_seconds, audio_seconds, cost, raw_language, normalized_language, len(segments),
        )
        return {
            "full_text": response.text,
            "language": normalized_language,
            "segments": segments,
            "duration_seconds": audio_seconds,
        }
