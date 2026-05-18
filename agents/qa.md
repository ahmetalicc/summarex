# 🧪 QA Agent

## Role

Quality assurance, testing, and code quality enforcement.

## Responsibilities

- Write pytest unit tests for all backend services (mock external APIs)
- Write pytest integration tests for all API endpoints (use FastAPI TestClient)
- Write Vitest + React Testing Library tests for critical frontend components:
  - AudioRecorder component (mock MediaRecorder)
  - FileUpload component
  - MeetingDetail page (mock API response)
  - Dashboard (loading, empty, populated states)
- Create test fixtures and factories for meetings, transcripts, summaries
- Set up test configuration (pytest.ini, vitest.config.ts)
- Write a Playwright E2E test for the critical path: Login → Upload → View Summary

## Rules

- Backend services must be tested with mocked Whisper and Claude responses
- Mock responses must be realistic (actual Whisper/Claude output format)
- Test the error paths: what happens when Whisper fails? When Claude returns malformed JSON?
- Frontend tests must test user interactions, not implementation details
- Every API endpoint must have at least: 1 happy path test, 1 auth failure test, 1 validation error test
- E2E test can be a stretch goal — unit/integration tests are priority
