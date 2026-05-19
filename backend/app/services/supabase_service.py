"""Thin wrapper around Supabase Storage for audio files.

DB CRUD lives in the routers (sub-task 3) — this service is purely the storage facade.
"""
from app.lib.supabase import get_service_client
from app.services.audio_service import AudioService
from app.utils.exceptions import ExternalServiceError
from app.utils.logging import get_logger

log = get_logger(__name__)

BUCKET = "meeting-audio"


class SupabaseService:
    def __init__(self) -> None:
        self._client = None

    def _ensure_client(self):
        if self._client is None:
            self._client = get_service_client()
        return self._client

    def upload_audio(self, user_id: str, meeting_id: str, file_bytes: bytes, extension: str) -> str:
        """Upload to {user_id}/{meeting_id}.{ext} in the meeting-audio bucket. Returns the storage path."""
        path = f"{user_id}/{meeting_id}.{extension}"
        content_type = AudioService.content_type_for(extension)
        try:
            self._ensure_client().storage.from_(BUCKET).upload(
                path=path,
                file=file_bytes,
                file_options={"content-type": content_type, "upsert": "true"},
            )
        except Exception as exc:
            log.exception("Storage upload failed for %s", path)
            raise ExternalServiceError(f"Storage upload failed: {exc}") from exc
        log.info("Uploaded audio: %s (%d bytes)", path, len(file_bytes))
        return path

    def create_signed_audio_url(self, path: str, expires_in_seconds: int = 3600) -> str:
        try:
            result = self._ensure_client().storage.from_(BUCKET).create_signed_url(
                path=path, expires_in=expires_in_seconds,
            )
        except Exception as exc:
            raise ExternalServiceError(f"Signed URL generation failed: {exc}") from exc
        # Handle SDK shape variance.
        for key in ("signedURL", "signed_url", "url"):
            if isinstance(result, dict) and result.get(key):
                return result[key]
        raise ExternalServiceError(f"Unexpected signed URL response shape: {result!r}")
