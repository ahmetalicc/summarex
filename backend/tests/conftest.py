import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.dependencies import get_current_user


def fake_user():
    return {"id": "00000000-0000-0000-0000-000000000001", "email": "test@example.com"}


@pytest.fixture
def client():
    app.dependency_overrides[get_current_user] = fake_user
    yield TestClient(app)
    app.dependency_overrides.clear()


@pytest.fixture
def unauth_client():
    app.dependency_overrides.clear()
    return TestClient(app)
