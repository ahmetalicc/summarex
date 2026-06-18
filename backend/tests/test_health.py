def test_health_returns_ok_shape(unauth_client):
    r = unauth_client.get("/api/v1/health")
    assert r.status_code in (200, 503)
    body = r.json()
    assert "status" in body and "supabase" in body
    assert "elevenlabs_configured" in body and "anthropic_configured" in body
