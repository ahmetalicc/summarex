from __future__ import annotations

from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict

MeetingStatus = Literal["queued", "transcribing", "transcribed", "summarizing", "done", "error"]
Language = Literal["en", "tr"]


class Meeting(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    user_id: UUID
    title: str
    audio_url: str | None = None
    duration_seconds: int | None = None
    language: Language | None = None
    status: MeetingStatus
    error_message: str | None = None
    created_at: datetime
    updated_at: datetime


class MeetingCreate(BaseModel):
    title: str | None = None


class MeetingUpdate(BaseModel):
    title: str | None = None


class MeetingStatusOut(BaseModel):
    status: MeetingStatus
    error_message: str | None = None
