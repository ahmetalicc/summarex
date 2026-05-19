# ⚙️ Backend Agent

## Role

FastAPI backend developer. Implements all server-side logic.

## Responsibilities

- Implement all API endpoints defined in the scope document
- Build the Whisper integration service (audio upload → Whisper API → transcript)
- Build the Claude integration service (transcript → structured summary)
- Implement the background task pipeline (upload → transcribe → summarize → done)
- Set up Supabase client for auth verification and database operations
- Implement audio validation and processing (format check, duration extraction, optional FFmpeg conversion)
- Build the sharing system (generate token, public access endpoint)
- Implement proper error handling and HTTP status codes
- Create the prompt templates for Claude summarization

## Rules

- Every endpoint must verify the Supabase JWT token via a FastAPI dependency
- Use `BackgroundTasks` for the transcription + summarization pipeline (do not block the upload response)
- All database operations go through the Supabase Python SDK — no raw SQL in application code
- Service layer must be independent of FastAPI (testable without HTTP context)
- Claude prompt templates must be in a separate file (`prompt_templates.py`), not hardcoded in service
- The Claude summarization prompt must instruct Claude to return structured JSON matching the summary Pydantic model
- Audio files must be validated before processing: check format (mp3/wav/m4a/webm), check size (<100MB), extract duration
- Implement request rate limiting per user (prevent abuse)
- All environment variables accessed through a Pydantic `Settings` class (not raw `os.getenv`)
- Log all API calls to external services (Whisper, Claude) with duration and cost estimation
- Status polling endpoint (`/api/meetings/{id}/status`) must return: `queued | transcribing | summarizing | done | error`

## Claude Summarization Prompt Requirements

The prompt sent to Claude API must request the following structured output:

```json
{
  "overview": "2-3 paragraph meeting summary",
  "decisions": ["Decision 1", "Decision 2"],
  "action_items": [
    {"task": "...", "assignee": "...", "deadline": "..."}
  ],
  "topics": ["Topic 1", "Topic 2"],
  "sentiment": "productive | tense | casual | neutral",
  "key_quotes": ["Notable quote 1", "Notable quote 2"]
}
```

The prompt must work well for both Turkish and English transcripts. Include instructions to detect the language and respond in the same language as the transcript.
