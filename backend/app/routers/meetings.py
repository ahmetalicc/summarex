"""Meeting CRUD + upload endpoints.

Upload flow (POST /upload):
  1. Validate file format/size via AudioService.
  2. Generate a UUID before any DB write so audio is named deterministically.
  3. Upload audio to Supabase Storage.
  4. Insert the meeting row using the pre-generated UUID.
  5. Schedule the transcribe→summarize pipeline as a BackgroundTask.
  6. Return 202 Accepted with the meeting row.

This order ensures that if the storage upload fails, no orphaned DB row is created.
If the DB insert fails after a successful upload, the storage object is cleaned up.
"""
from __future__ import annotations

import uuid

from fastapi import APIRouter, BackgroundTasks, File, Form, Query, UploadFile

from app.dependencies import CurrentUser
from app.models.meeting import Meeting, MeetingStatusOut, MeetingUpdate
from app.services.audio_service import AudioService
from app.services.pipeline import run_meeting_pipeline
from app.services.supabase_service import SupabaseService
from app.utils.exceptions import ExternalServiceError, MeetingNotFoundError
from app.utils.logging import get_logger

log = get_logger(__name__)

router = APIRouter(prefix="/meetings", tags=["meetings"])


@router.post("/upload", status_code=202, response_model=Meeting)
async def upload_meeting(
    current_user: CurrentUser,
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    title: str | None = Form(None),
) -> dict:
    user_id = str(current_user["id"])
    file_bytes = await file.read()
    ext = AudioService.validate(file.filename or "audio.bin", len(file_bytes))

    meeting_id = str(uuid.uuid4())
    svc = SupabaseService()

    audio_path = svc.upload_audio(user_id, meeting_id, file_bytes, ext)
    try:
        meeting = svc.create_meeting(
            user_id=user_id,
            title=title or "Untitled Meeting",
            audio_url=audio_path,
            duration_seconds=None,
            meeting_id=meeting_id,
        )
    except ExternalServiceError:
        svc.delete_audio(audio_path)
        raise

    background_tasks.add_task(run_meeting_pipeline, meeting_id, audio_path, ext)
    log.info("Queued pipeline for meeting %s (user %s)", meeting_id, user_id)
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
