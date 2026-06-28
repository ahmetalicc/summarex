import io
from unittest.mock import patch


def test_upload_returns_429_when_minute_limit_reached(client):
    over_limit = {
        "tier": "free",
        "minutes_used": 90.0,
        "minutes_limit": 90,
        "resets_at": "2026-08-01T00:00:00+00:00",
    }
    with (
        patch("app.routers.meetings.AudioService.validate", return_value="mp3"),
        patch(
            "app.routers.meetings.SupabaseService.get_entitlement",
            return_value=over_limit,
        ),
    ):
        r = client.post(
            "/api/v1/meetings/upload",
            files={"file": ("test.mp3", io.BytesIO(b"fake"), "audio/mpeg")},
        )
    assert r.status_code == 429
    assert "minutes" in r.json()["detail"].lower()
