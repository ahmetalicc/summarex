from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class SharedLink(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    meeting_id: UUID
    token: str
    expires_at: datetime | None = None
    is_active: bool
    created_at: datetime


class SharedLinkCreate(BaseModel):
    expires_at: datetime | None = None
