"""Supabase Storage facade + DB wrappers for the meeting pipeline and CRUD routes."""
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

    # ── Storage ───────────────────────────────────────────────────────────────

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

    def download_audio(self, path: str) -> bytes:
        try:
            return self._ensure_client().storage.from_(BUCKET).download(path)
        except Exception as exc:
            log.exception("Storage download failed for %s", path)
            raise ExternalServiceError(f"Storage download failed: {exc}") from exc

    def delete_audio(self, path: str) -> None:
        """Idempotent — logs and ignores errors so callers never fail on storage cleanup."""
        try:
            self._ensure_client().storage.from_(BUCKET).remove([path])
        except Exception as exc:
            log.warning("Storage delete failed for %s (ignored): %s", path, exc)

    def create_signed_audio_url(self, path: str, expires_in_seconds: int = 3600) -> str:
        try:
            result = self._ensure_client().storage.from_(BUCKET).create_signed_url(
                path=path, expires_in=expires_in_seconds,
            )
        except Exception as exc:
            raise ExternalServiceError(f"Signed URL generation failed: {exc}") from exc
        for key in ("signedURL", "signed_url", "url"):
            if isinstance(result, dict) and result.get(key):
                return result[key]
        raise ExternalServiceError(f"Unexpected signed URL response shape: {result!r}")

    # ── Meetings DB ───────────────────────────────────────────────────────────

    def create_meeting(
        self,
        user_id: str,
        title: str,
        audio_url: str,
        duration_seconds: float | None,
        meeting_id: str | None = None,
    ) -> dict:
        row: dict = {
            "user_id": user_id,
            "title": title,
            "audio_url": audio_url,
            "status": "queued",
        }
        if meeting_id is not None:
            row["id"] = meeting_id
        if duration_seconds is not None:
            row["duration_seconds"] = int(duration_seconds)
        try:
            result = self._ensure_client().table("meetings").insert(row).execute()
        except Exception as exc:
            raise ExternalServiceError(f"Failed to create meeting: {exc}") from exc
        return result.data[0]

    def get_meeting(self, meeting_id: str, user_id: str) -> dict | None:
        try:
            result = (
                self._ensure_client()
                .table("meetings")
                .select("*")
                .eq("id", meeting_id)
                .eq("user_id", user_id)
                .execute()
            )
        except Exception as exc:
            raise ExternalServiceError(f"Failed to fetch meeting: {exc}") from exc
        return result.data[0] if result.data else None

    def list_meetings(
        self, user_id: str, limit: int = 20, offset: int = 0, search: str | None = None
    ) -> list[dict]:
        try:
            q = (
                self._ensure_client()
                .table("meetings")
                .select("*")
                .eq("user_id", user_id)
                .order("created_at", desc=True)
                .range(offset, offset + limit - 1)
            )
            if search:
                q = q.ilike("title", f"%{search}%")
            return q.execute().data
        except Exception as exc:
            raise ExternalServiceError(f"Failed to list meetings: {exc}") from exc

    def update_meeting(self, meeting_id: str, user_id: str, fields: dict) -> dict | None:
        if not fields:
            return self.get_meeting(meeting_id, user_id)
        try:
            result = (
                self._ensure_client()
                .table("meetings")
                .update(fields)
                .eq("id", meeting_id)
                .eq("user_id", user_id)
                .execute()
            )
        except Exception as exc:
            raise ExternalServiceError(f"Failed to update meeting: {exc}") from exc
        return result.data[0] if result.data else None

    def delete_meeting(self, meeting_id: str, user_id: str) -> dict | None:
        try:
            result = (
                self._ensure_client()
                .table("meetings")
                .delete()
                .eq("id", meeting_id)
                .eq("user_id", user_id)
                .execute()
            )
        except Exception as exc:
            raise ExternalServiceError(f"Failed to delete meeting: {exc}") from exc
        return result.data[0] if result.data else None

    def update_meeting_status(
        self, meeting_id: str, status: str, error_message: str | None = None
    ) -> None:
        fields: dict = {"status": status}
        if error_message is not None:
            fields["error_message"] = error_message
        try:
            self._ensure_client().table("meetings").update(fields).eq("id", meeting_id).execute()
        except Exception as exc:
            # Don't re-raise — losing a status update is bad but must not crash the pipeline.
            log.error("Failed to update status for meeting %s: %s", meeting_id, exc)

    # ── Transcripts / Summaries DB ────────────────────────────────────────────

    def create_transcript(
        self, meeting_id: str, full_text: str, language: str, segments: list[dict]
    ) -> dict:
        try:
            result = (
                self._ensure_client()
                .table("transcripts")
                .insert({
                    "meeting_id": meeting_id,
                    "full_text": full_text,
                    "language": language,
                    "segments": segments,
                })
                .execute()
            )
        except Exception as exc:
            raise ExternalServiceError(f"Failed to create transcript: {exc}") from exc
        return result.data[0]

    def create_summary(self, meeting_id: str, payload: dict) -> dict:
        # Store the structured summary dict as raw_ai_response (excludes our internal raw_response key).
        raw_ai_response = {k: v for k, v in payload.items() if k != "raw_response"}
        try:
            result = (
                self._ensure_client()
                .table("summaries")
                .insert({
                    "meeting_id": meeting_id,
                    "overview": payload["overview"],
                    "decisions": payload["decisions"],
                    "action_items": payload["action_items"],
                    "topics": payload["topics"],
                    "sentiment": payload.get("sentiment"),
                    "key_quotes": payload["key_quotes"],
                    "raw_ai_response": raw_ai_response,
                })
                .execute()
            )
        except Exception as exc:
            raise ExternalServiceError(f"Failed to create summary: {exc}") from exc
        return result.data[0]
