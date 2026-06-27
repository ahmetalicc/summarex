import io
from unittest.mock import patch

from app.config import settings


def test_upload_returns_429_when_monthly_cap_reached(client):
    with (
        patch(
            "app.routers.meetings.AudioService.validate",
            return_value="mp3",
        ),
        patch(
            "app.routers.meetings.SupabaseService.count_meetings_this_month",
            return_value=settings.MONTHLY_UPLOAD_CAP,
        ),
    ):
        r = client.post(
            "/api/v1/meetings/upload",
            files={"file": ("test.mp3", io.BytesIO(b"fake"), "audio/mpeg")},
        )
    assert r.status_code == 429
    assert "Monthly limit" in r.json()["detail"]
