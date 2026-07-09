"""Supabase Storage facade + DB wrappers for the meeting pipeline and CRUD routes."""
import secrets
from datetime import datetime, timezone

from app.lib.supabase import get_service_client
from app.services.audio_service import AudioService
from app.utils.exceptions import ExternalServiceError, SummarexError
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

    def clear_audio_url(self, meeting_id: str) -> None:
        """Null out audio_url after the original file is deleted. Swallows errors — cleanup must not crash the pipeline."""
        try:
            self._ensure_client().table("meetings").update({"audio_url": None}).eq("id", meeting_id).execute()
        except Exception as exc:
            log.warning("Failed to clear audio_url for meeting %s (ignored): %s", meeting_id, exc)

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

    def get_minutes_used_this_month(self, user_id: str) -> float:
        """Sum duration_seconds for all of this user's meetings since UTC month start, return as minutes."""
        from datetime import datetime, timezone
        now = datetime.now(timezone.utc)
        start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        try:
            result = (
                self._ensure_client()
                .table("meetings")
                .select("duration_seconds")
                .eq("user_id", user_id)
                .gte("created_at", start.isoformat())
                .execute()
            )
        except Exception as exc:
            raise ExternalServiceError(f"Failed to sum meeting minutes: {exc}") from exc
        total_seconds = sum(
            row["duration_seconds"] for row in result.data if row.get("duration_seconds")
        )
        return total_seconds / 60.0

    def get_user_tier(self, user_id: str) -> str:
        """Return the user's tier. Defaults to 'free' if no profile row exists."""
        try:
            result = (
                self._ensure_client()
                .table("user_profiles")
                .select("tier")
                .eq("user_id", user_id)
                .limit(1)
                .execute()
            )
        except Exception as exc:
            raise ExternalServiceError(f"Failed to fetch user tier: {exc}") from exc
        if result.data:
            return result.data[0]["tier"]
        return "free"

    def get_entitlement(self, user_id: str) -> dict:
        """Return full entitlement snapshot: tier, minutes_used, minutes_limit, resets_at."""
        from datetime import datetime, timezone
        from app.config import settings
        tier = self.get_user_tier(user_id)
        minutes_used = self.get_minutes_used_this_month(user_id)
        minutes_limit = (
            settings.PRO_MONTHLY_MINUTES if tier == "pro" else settings.FREE_MONTHLY_MINUTES
        )
        now = datetime.now(timezone.utc)
        if now.month == 12:
            resets_at = now.replace(year=now.year + 1, month=1, day=1,
                                    hour=0, minute=0, second=0, microsecond=0)
        else:
            resets_at = now.replace(month=now.month + 1, day=1,
                                    hour=0, minute=0, second=0, microsecond=0)
        return {
            "tier": tier,
            "minutes_used": round(minutes_used, 2),
            "minutes_limit": minutes_limit,
            "resets_at": resets_at.isoformat(),
        }

    def create_meeting(
        self,
        user_id: str,
        title: str | None,
        audio_url: str,
        duration_seconds: float | None,
        meeting_id: str | None = None,
    ) -> dict:
        row: dict = {
            "user_id": user_id,
            "audio_url": audio_url,
            "status": "queued",
        }
        if title is not None:
            row["title"] = title
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

    # ── Transcripts DB ────────────────────────────────────────────────────────

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

    def get_transcript(self, meeting_id: str, user_id: str) -> dict | None:
        """Return transcript only if the caller owns the parent meeting."""
        if not self.get_meeting(meeting_id, user_id):
            return None
        return self.get_transcript_by_meeting_id(meeting_id)

    def get_transcript_by_meeting_id(self, meeting_id: str) -> dict | None:
        """Internal — no user scope. Used by regenerate pipeline after router verifies ownership."""
        try:
            result = (
                self._ensure_client()
                .table("transcripts")
                .select("*")
                .eq("meeting_id", meeting_id)
                .limit(1)
                .execute()
            )
        except Exception as exc:
            raise ExternalServiceError(f"Failed to fetch transcript: {exc}") from exc
        return result.data[0] if result.data else None

    # ── Summaries DB ──────────────────────────────────────────────────────────

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

    def get_summary(self, meeting_id: str, user_id: str) -> dict | None:
        """Return summary only if the caller owns the parent meeting."""
        if not self.get_meeting(meeting_id, user_id):
            return None
        try:
            result = (
                self._ensure_client()
                .table("summaries")
                .select("*")
                .eq("meeting_id", meeting_id)
                .limit(1)
                .execute()
            )
        except Exception as exc:
            raise ExternalServiceError(f"Failed to fetch summary: {exc}") from exc
        return result.data[0] if result.data else None

    def delete_summary(self, meeting_id: str) -> None:
        """Internal — no user scope. Called by regenerate after router verifies ownership."""
        try:
            self._ensure_client().table("summaries").delete().eq("meeting_id", meeting_id).execute()
        except Exception as exc:
            raise ExternalServiceError(f"Failed to delete summary: {exc}") from exc

    # ── Shared Links DB ───────────────────────────────────────────────────────

    def create_shared_link(self, meeting_id: str, user_id: str) -> dict | None:
        """Idempotent — returns existing active link if one already exists for this meeting."""
        if not self.get_meeting(meeting_id, user_id):
            return None
        try:
            existing = (
                self._ensure_client()
                .table("shared_links")
                .select("*")
                .eq("meeting_id", meeting_id)
                .eq("is_active", True)
                .limit(1)
                .execute()
            )
        except Exception as exc:
            raise ExternalServiceError(f"Failed to query shared links: {exc}") from exc
        if existing.data:
            return existing.data[0]
        token = secrets.token_urlsafe(32)
        try:
            result = (
                self._ensure_client()
                .table("shared_links")
                .insert({"meeting_id": meeting_id, "token": token, "is_active": True})
                .execute()
            )
        except Exception as exc:
            raise ExternalServiceError(f"Failed to create shared link: {exc}") from exc
        return result.data[0]

    def get_shared_link_by_token(self, token: str) -> dict | None:
        """Public lookup — no user scope. Returns None if not found, inactive, or expired."""
        try:
            result = (
                self._ensure_client()
                .table("shared_links")
                .select("*")
                .eq("token", token)
                .eq("is_active", True)
                .limit(1)
                .execute()
            )
        except Exception as exc:
            raise ExternalServiceError(f"Failed to look up shared link: {exc}") from exc
        if not result.data:
            return None
        link = result.data[0]
        expires_at = link.get("expires_at")
        if expires_at:
            try:
                exp = datetime.fromisoformat(expires_at.replace("Z", "+00:00"))
                if exp < datetime.now(timezone.utc):
                    return None
            except (ValueError, AttributeError):
                pass
        return link

    def delete_shared_link(self, meeting_id: str, user_id: str) -> bool:
        """Returns True if a link was deleted, False if not found or not owned."""
        if not self.get_meeting(meeting_id, user_id):
            return False
        try:
            result = (
                self._ensure_client()
                .table("shared_links")
                .delete()
                .eq("meeting_id", meeting_id)
                .execute()
            )
        except Exception as exc:
            raise ExternalServiceError(f"Failed to delete shared link: {exc}") from exc
        return bool(result.data)

    def get_public_meeting_view(self, token: str) -> dict | None:
        """Composite public view: link → meeting + transcript + summary. Excludes private fields."""
        link = self.get_shared_link_by_token(token)
        if not link:
            return None
        meeting_id = str(link["meeting_id"])
        try:
            m = (
                self._ensure_client()
                .table("meetings")
                .select("title, created_at, duration_seconds, language")
                .eq("id", meeting_id)
                .execute()
            )
        except Exception as exc:
            raise ExternalServiceError(f"Failed to fetch public meeting data: {exc}") from exc
        if not m.data:
            return None
        meeting = m.data[0]
        try:
            t = (
                self._ensure_client()
                .table("transcripts")
                .select("full_text, segments, language")
                .eq("meeting_id", meeting_id)
                .limit(1)
                .execute()
            )
            transcript = t.data[0] if t.data else None
        except Exception:
            transcript = None
        try:
            s = (
                self._ensure_client()
                .table("summaries")
                .select("overview, decisions, action_items, topics, sentiment, key_quotes")
                .eq("meeting_id", meeting_id)
                .limit(1)
                .execute()
            )
            summary = s.data[0] if s.data else None
        except Exception:
            summary = None
        language = (transcript or {}).get("language") or meeting.get("language")
        return {
            "title": meeting.get("title"),
            "created_at": meeting.get("created_at"),
            "duration_seconds": meeting.get("duration_seconds"),
            "language": language,
            "transcript": transcript,
            "summary": summary,
        }

    # ── Account deletion ──────────────────────────────────────────────────────

    def delete_user_account(self, user_id: str) -> None:
        """Permanently delete all of a user's data and their auth account.

        1. Remove every meeting's audio object from Storage (idempotent — audio
           already purged post-pipeline 404s and is ignored).
        2. Delete all meeting rows (cascades to transcripts/summaries/shared_links).
        3. Best-effort remove the user_profiles row.
        4. Delete the Supabase auth user via the service-role admin API.

        Raises ExternalServiceError if the DB cleanup fails (502) and SummarexError
        (500) if the auth admin delete fails after data was already removed.
        """
        client = self._ensure_client()

        try:
            result = (
                client.table("meetings")
                .select("id, audio_url")
                .eq("user_id", user_id)
                .execute()
            )
        except Exception as exc:
            raise ExternalServiceError(f"Failed to fetch meetings for deletion: {exc}") from exc

        for row in result.data or []:
            audio_url = row.get("audio_url")
            if audio_url:
                self.delete_audio(audio_url)  # idempotent — logs and ignores 404s

        try:
            client.table("meetings").delete().eq("user_id", user_id).execute()
        except Exception as exc:
            raise ExternalServiceError(f"Failed to delete meetings: {exc}") from exc

        # Profile cleanup is best-effort — a leftover profile row must not block
        # account deletion (and may already cascade from the auth user delete).
        try:
            client.table("user_profiles").delete().eq("user_id", user_id).execute()
        except Exception as exc:
            log.warning("Failed to delete user_profiles for %s (ignored): %s", user_id, exc)

        try:
            client.auth.admin.delete_user(user_id)
        except Exception as exc:
            log.exception("Auth admin delete_user failed for %s", user_id)
            raise SummarexError(
                "Your recordings were removed but deleting the account failed. "
                "Please contact support."
            ) from exc

        log.info("Deleted account and all data for user %s", user_id)
