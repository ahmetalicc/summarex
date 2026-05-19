import pytest


@pytest.mark.parametrize("method,path", [
    ("get", "/api/meetings"),
    ("post", "/api/meetings/upload"),
    ("get", "/api/meetings/00000000-0000-0000-0000-000000000000"),
    ("delete", "/api/meetings/00000000-0000-0000-0000-000000000000"),
    ("get", "/api/meetings/00000000-0000-0000-0000-000000000000/status"),
    ("get", "/api/meetings/00000000-0000-0000-0000-000000000000/transcript"),
    ("get", "/api/meetings/00000000-0000-0000-0000-000000000000/summary"),
    ("post", "/api/meetings/00000000-0000-0000-0000-000000000000/share"),
])
def test_protected_endpoints_reject_without_token(unauth_client, method, path):
    r = getattr(unauth_client, method)(path)
    assert r.status_code in (401, 403)


def test_public_share_endpoint_does_not_require_auth(unauth_client):
    r = unauth_client.get("/api/shared/nonexistent-token")
    # Must not be 401 — this endpoint has no auth. In tests without Supabase
    # credentials configured, we get 502 (service unavailable). With real
    # Supabase and a nonexistent token, we'd get 404.
    assert r.status_code != 401
