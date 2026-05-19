# MeetingMind

> AI-powered meeting assistant — record or upload audio, get structured summaries, decisions, and action items.

## Tech Stack

- **Frontend:** React 18, TypeScript, Vite, Tailwind CSS, Framer Motion, react-i18next
- **Backend:** FastAPI (Python 3.11+), Pydantic v2
- **AI:** OpenAI Whisper (transcription) + Anthropic Claude (summarization)
- **Database / Auth / Storage:** Supabase
- **Deployment:** Vercel (frontend) + Railway/Render (backend)

## Project Structure

```
MeetingMind/
├── frontend/          # React + Vite SPA
├── backend/           # FastAPI application
├── supabase/          # SQL migrations and RLS policies
├── agents/            # Claude Code agent role definitions
└── .github/           # CI/CD workflows (DevOps phase)
```

See [meetingmind-project-scope.md](meetingmind-project-scope.md) for the full directory tree and feature list.

## Quick Start

### Prerequisites

Node 20+, Python 3.11+, a Supabase project, OpenAI + Anthropic API keys.

### Backend

```bash
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1   # Windows PowerShell
# source .venv/bin/activate    # macOS/Linux
pip install -r requirements.txt
cp .env.example .env           # then fill in keys
uvicorn app.main:app --reload
```

### Frontend

```bash
cd frontend
npm install
cp .env.example .env           # then fill in VITE_* keys
npm run dev
```

## Development Workflow

This project follows the multi-agent workflow defined in [meetingmind-claude-code-prompt.md](meetingmind-claude-code-prompt.md).
Each agent (architect / backend / frontend / devops / qa) works on a dedicated feature branch off `develop`.
See `agents/` for role definitions.

| Branch                      | Agent     | Scope                                      |
|-----------------------------|-----------|--------------------------------------------|
| `feature/project-skeleton`  | Architect | Directory structure, scaffold, DB schema   |
| `feature/backend-api`       | Backend   | API endpoints, Whisper, Claude pipeline    |
| `feature/frontend-ui`       | Frontend  | Pages, components, recording UI            |
| `feature/devops-ci`         | DevOps    | Dockerfile, GitHub Actions, deploy configs |
| `feature/tests`             | QA        | pytest + Vitest test suites                |

## Status

MVP in development. See [meetingmind-project-scope.md](meetingmind-project-scope.md) § "Success Criteria" for the definition of done.

## Docs

- [Project scope & requirements](meetingmind-project-scope.md)
- [Development prompt & agent setup](meetingmind-claude-code-prompt.md)
