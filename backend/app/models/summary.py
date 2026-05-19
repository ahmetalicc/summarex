from __future__ import annotations

from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict

Sentiment = Literal["productive", "tense", "casual", "neutral"]


class ActionItem(BaseModel):
    task: str
    assignee: str | None = None
    deadline: str | None = None


class Summary(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    meeting_id: UUID
    overview: str
    decisions: list[str]
    action_items: list[ActionItem]
    topics: list[str]
    sentiment: Sentiment | None = None
    key_quotes: list[str]
    raw_ai_response: dict | None = None
    created_at: datetime


class SummaryCreate(BaseModel):
    overview: str
    decisions: list[str]
    action_items: list[ActionItem]
    topics: list[str]
    sentiment: Sentiment | None = None
    key_quotes: list[str]
    raw_ai_response: dict | None = None
