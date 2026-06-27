"""Meeting CRUD + upload/record + transcript/summary/share endpoints.

Upload/record flow (POST /upload  or  POST /record):
  1. Validate file format/size via AudioService.
  2. Generate a UUID before any DB write so audio is named deterministically.
  3. Upload audio to Supabase Storage.
  4. Insert the meeting row using the pre-generated UUID.
  5. Schedule the transcribe→summarize pipeline as a BackgroundTask.
  6. Return 202 Accepted with the meeting row.

Both /upload and /record accept the same multipart payload. The frontend chooses
the path based on source (/upload = file picker, /record = MediaRecorder stream).

This order ensures that if the storage upload fails, no orphaned DB row is created.
If the DB insert fails after a successful upload, the storage object is cleaned up.
"""
from __future__ import annotations

from typing import Literal

import uuid

from fastapi import APIRouter, BackgroundTasks, File, Form, Query, Request, UploadFile

from app.dependencies import CurrentUser
from app.limiter import limiter
from app.models.meeting import Meeting, MeetingStatusOut, MeetingUpdate
from app.models.summary import Summary
from app.models.transcript import Transcript
from app.config import settings
from app.services.audio_service import AudioService
from app.services.pipeline import run_meeting_pipeline, run_resummarize, run_transcription
from app.services.supabase_service import SupabaseService
from app.utils.exceptions import ExternalServiceError, MeetingNotFoundError, UsageLimitError
from app.utils.logging import get_logger

log = get_logger(__name__)

router = APIRouter(prefix="/meetings", tags=["meetings"])


@router.post("/upload", status_code=202, response_model=Meeting)
@router.post("/record", status_code=202, response_model=Meeting)
@limiter.limit("10/hour")
async def create_meeting_from_audio(
    request: Request,
    current_user: CurrentUser,
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    title: str | None = Form(None),
    mode: Literal["summary", "transcript"] = Form("summary"),
    duration_seconds: float | None = Form(None),
) -> dict:
    user_id = str(current_user["id"])
    file_bytes = await file.read()
    ext = AudioService.validate(file.filename or "audio.bin", len(file_bytes))

    meeting_id = str(uuid.uuid4())
    svc = SupabaseService()

    used = svc.count_meetings_this_month(user_id)
    if used >= settings.MONTHLY_UPLOAD_CAP:
        raise UsageLimitError(
            f"Monthly limit of {settings.MONTHLY_UPLOAD_CAP} uploads reached. It resets at the start of next month."
        )

    audio_path = svc.upload_audio(user_id, meeting_id, file_bytes, ext)
    try:
        meeting = svc.create_meeting(
            user_id=user_id,
            title=title or None,
            audio_url=audio_path,
            duration_seconds=duration_seconds,
            meeting_id=meeting_id,
        )
    except ExternalServiceError:
        svc.delete_audio(audio_path)
        raise

    if mode == "transcript":
        background_tasks.add_task(run_transcription, meeting_id, audio_path, ext)
        log.info("Queued transcription for meeting %s (user %s)", meeting_id, user_id)
    else:
        background_tasks.add_task(run_meeting_pipeline, meeting_id, audio_path, ext)
        log.info("Queued summarize pipeline for meeting %s (user %s)", meeting_id, user_id)
    return meeting


@router.get("", response_model=list[Meeting])
async def list_meetings(
    current_user: CurrentUser,
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    search: str | None = Query(default=None),
) -> list[dict]:
    return SupabaseService().list_meetings(
        user_id=str(current_user["id"]),
        limit=limit,
        offset=offset,
        search=search,
    )


@router.get("/{meeting_id}", response_model=Meeting)
async def get_meeting(meeting_id: str, current_user: CurrentUser) -> dict:
    meeting = SupabaseService().get_meeting(meeting_id, str(current_user["id"]))
    if not meeting:
        raise MeetingNotFoundError()
    return meeting


@router.patch("/{meeting_id}", response_model=Meeting)
async def update_meeting(
    meeting_id: str, body: MeetingUpdate, current_user: CurrentUser
) -> dict:
    fields = body.model_dump(exclude_none=True)
    meeting = SupabaseService().update_meeting(meeting_id, str(current_user["id"]), fields)
    if meeting is None:
        raise MeetingNotFoundError()
    return meeting


@router.delete("/{meeting_id}", response_model=Meeting)
async def delete_meeting(meeting_id: str, current_user: CurrentUser) -> dict:
    svc = SupabaseService()
    meeting = svc.delete_meeting(meeting_id, str(current_user["id"]))
    if meeting is None:
        raise MeetingNotFoundError()
    audio_url = meeting.get("audio_url")
    if audio_url:
        svc.delete_audio(audio_url)  # idempotent — logs and ignores errors
    return meeting


@router.get("/{meeting_id}/status", response_model=MeetingStatusOut)
async def get_meeting_status(meeting_id: str, current_user: CurrentUser) -> dict:
    meeting = SupabaseService().get_meeting(meeting_id, str(current_user["id"]))
    if not meeting:
        raise MeetingNotFoundError()
    return {"status": meeting["status"], "error_message": meeting.get("error_message")}


@router.get("/{meeting_id}/transcript", response_model=Transcript)
async def get_transcript(meeting_id: str, current_user: CurrentUser) -> dict:
    transcript = SupabaseService().get_transcript(meeting_id, str(current_user["id"]))
    if transcript is None:
        raise MeetingNotFoundError("Transcript not found")
    return transcript


@router.get("/{meeting_id}/summary", response_model=Summary)
async def get_summary(meeting_id: str, current_user: CurrentUser) -> dict:
    summary = SupabaseService().get_summary(meeting_id, str(current_user["id"]))
    if summary is None:
        raise MeetingNotFoundError("Summary not found")
    return summary


@router.post("/{meeting_id}/regenerate-summary", status_code=202)
@limiter.limit("5/hour")
async def regenerate_summary(
    request: Request,
    meeting_id: str,
    current_user: CurrentUser,
    background_tasks: BackgroundTasks,
) -> dict:
    svc = SupabaseService()
    meeting = svc.get_meeting(meeting_id, str(current_user["id"]))
    if not meeting:
        raise MeetingNotFoundError()
    transcript = svc.get_transcript_by_meeting_id(meeting_id)
    if not transcript:
        raise MeetingNotFoundError("No transcript available — run transcription first")
    svc.delete_summary(meeting_id)
    svc.update_meeting_status(meeting_id, "summarizing")
    background_tasks.add_task(run_resummarize, meeting_id)
    log.info("Queued re-summarize for meeting %s", meeting_id)
    return {"status": "summarizing"}


@router.post("/{meeting_id}/share", tags=["sharing"])
async def create_share(meeting_id: str, current_user: CurrentUser) -> dict:
    link = SupabaseService().create_shared_link(meeting_id, str(current_user["id"]))
    if link is None:
        raise MeetingNotFoundError()
    token = link["token"]
    return {"token": token, "share_path": f"/shared/{token}"}


@router.delete("/{meeting_id}/share", status_code=204, tags=["sharing"])
async def revoke_share(meeting_id: str, current_user: CurrentUser) -> None:
    deleted = SupabaseService().delete_shared_link(meeting_id, str(current_user["id"]))
    if not deleted:
        raise MeetingNotFoundError("No active shared link for this meeting")
