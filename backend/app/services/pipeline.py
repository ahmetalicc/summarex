"""BackgroundTasks pipeline: transcribe -> summarize -> done.

This module is the single entry point for asynchronous processing. The upload
router schedules `run_meeting_pipeline` via BackgroundTasks. On any failure
the meeting's status is flipped to 'error' with a short message.

KNOWN LIMITATION (MVP): FastAPI BackgroundTasks does not survive a server
restart. If the worker process dies mid-pipeline, the meeting stays stuck
on its last status. Production fix is Celery/Arq/RQ — out of scope for MVP.
"""
import asyncio
from io import BytesIO

from app.services.claude_service import ClaudeService
from app.services.supabase_service import SupabaseService
from app.services.whisper_service import WhisperService
from app.utils.exceptions import SummarexError
from app.utils.logging import get_logger

log = get_logger(__name__)


async def run_meeting_pipeline(meeting_id: str, audio_path: str, extension: str) -> None:
    """Download audio, transcribe with Whisper, summarize with Claude, persist results."""
    supabase = SupabaseService()
    try:
        supabase.update_meeting_status(meeting_id, "transcribing")
        audio_bytes = await asyncio.to_thread(supabase.download_audio, audio_path)

        buf = BytesIO(audio_bytes)
        buf.name = f"audio.{extension}"  # OpenAI SDK uses .name for MIME sniffing
        whisper = WhisperService()
        whisper_result = await whisper.transcribe(buf)

        supabase.create_transcript(
            meeting_id=meeting_id,
            full_text=whisper_result["full_text"],
            language=whisper_result["language"],
            segments=whisper_result["segments"],
        )

        if whisper_result.get("duration_seconds"):
            supabase._ensure_client().table("meetings").update(
                {"duration_seconds": int(whisper_result["duration_seconds"])}
            ).eq("id", meeting_id).execute()

        supabase.update_meeting_status(meeting_id, "summarizing")
        claude = ClaudeService()
        summary_payload = await claude.summarize(whisper_result["full_text"])
        supabase.create_summary(meeting_id=meeting_id, payload=summary_payload)

        supabase.update_meeting_status(meeting_id, "done")
        log.info("Pipeline finished for meeting %s", meeting_id)
    except SummarexError as exc:
        log.error("Pipeline failed (domain) for meeting %s: %s", meeting_id, exc.detail)
        supabase.update_meeting_status(meeting_id, "error", error_message=exc.detail)
    except Exception as exc:  # noqa: BLE001 — final safety net before status is lost
        log.exception("Pipeline failed (unexpected) for meeting %s", meeting_id)
        supabase.update_meeting_status(meeting_id, "error", error_message=str(exc))
    finally:
        # Privacy: the original audio is never retained past processing. Delete it and
        # null the stored path regardless of success or failure — there is no re-transcribe
        # path that needs it (re-summarize works from the saved transcript).
        await asyncio.to_thread(supabase.delete_audio, audio_path)
        supabase.clear_audio_url(meeting_id)


async def run_transcription(meeting_id: str, audio_path: str, extension: str) -> None:
    """Transcribe-only flow: download audio, transcribe with Whisper, persist the transcript. No summary."""
    supabase = SupabaseService()
    try:
        supabase.update_meeting_status(meeting_id, "transcribing")
        audio_bytes = await asyncio.to_thread(supabase.download_audio, audio_path)

        buf = BytesIO(audio_bytes)
        buf.name = f"audio.{extension}"  # OpenAI SDK uses .name for MIME sniffing
        whisper = WhisperService()
        whisper_result = await whisper.transcribe(buf)

        supabase.create_transcript(
            meeting_id=meeting_id,
            full_text=whisper_result["full_text"],
            language=whisper_result["language"],
            segments=whisper_result["segments"],
        )

        if whisper_result.get("duration_seconds"):
            supabase._ensure_client().table("meetings").update(
                {"duration_seconds": int(whisper_result["duration_seconds"])}
            ).eq("id", meeting_id).execute()

        supabase.update_meeting_status(meeting_id, "transcribed")
        log.info("Transcription finished for meeting %s", meeting_id)
    except SummarexError as exc:
        log.error("Transcription failed (domain) for meeting %s: %s", meeting_id, exc.detail)
        supabase.update_meeting_status(meeting_id, "error", error_message=exc.detail)
    except Exception as exc:  # noqa: BLE001 — final safety net before status is lost
        log.exception("Transcription failed (unexpected) for meeting %s", meeting_id)
        supabase.update_meeting_status(meeting_id, "error", error_message=str(exc))
    finally:
        # Privacy: original audio is never retained past processing (mirrors run_meeting_pipeline).
        await asyncio.to_thread(supabase.delete_audio, audio_path)
        supabase.clear_audio_url(meeting_id)


async def run_resummarize(meeting_id: str) -> None:
    """Re-summarize from existing transcript. Skips Whisper entirely."""
    supabase = SupabaseService()
    try:
        supabase.update_meeting_status(meeting_id, "summarizing")
        transcript = supabase.get_transcript_by_meeting_id(meeting_id)
        if not transcript:
            raise SummarexError("Cannot regenerate summary — no transcript exists for this meeting")
        claude = ClaudeService()
        payload = await claude.summarize(transcript["full_text"])
        supabase.create_summary(meeting_id=meeting_id, payload=payload)
        supabase.update_meeting_status(meeting_id, "done")
        log.info("Re-summarize finished for meeting %s", meeting_id)
    except SummarexError as exc:
        log.error("Re-summarize failed (domain) for meeting %s: %s", meeting_id, exc.detail)
        supabase.update_meeting_status(meeting_id, "error", error_message=exc.detail)
    except Exception as exc:  # noqa: BLE001
        log.exception("Re-summarize failed (unexpected) for meeting %s", meeting_id)
        supabase.update_meeting_status(meeting_id, "error", error_message=str(exc))
