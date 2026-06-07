# Summarex

> AI-powered meeting assistant — record or upload audio, get structured summaries, decisions, and action items.

## Tech Stack

- **Frontend:** React 18, TypeScript, Vite, Tailwind CSS, Framer Motion, react-i18next
- **Backend:** FastAPI (Python 3.11+), Pydantic v2
- **AI:** OpenAI Whisper (transcription) + Anthropic Claude (summarization)
- **Database / Auth / Storage:** Supabase
- **Deployment:** Vercel (frontend) + Railway/Render (backend)

## Project Structure

```
Summarex/
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

## Deployment

The backend deploys to **Render** (Docker) and the frontend to **Vercel**. Supabase is a
hosted project — there is nothing to deploy for the database beyond applying the migrations.
Tone here is operational: follow the steps in order.

### 1. Prerequisites

- A Supabase project (free tier is fine).
- Apply the migrations in order via **Supabase Dashboard → SQL Editor**: paste and run
  `supabase/migrations/001_*.sql` (schema + RLS), then `supabase/migrations/002_*.sql`
  (storage bucket).
- **Authentication → Providers → Email**: enable Email auth. Decide whether to keep
  **"Confirm email"** ON (users must click a link before logging in) or OFF (instant login,
  simpler for a demo). This choice affects the redirect URLs you configure in step 4.
- Have your `OPENAI_API_KEY` and `ANTHROPIC_API_KEY` ready.

### 2. Backend → Render

1. In Render, choose **New → Blueprint** and point it at this GitHub repo. Render reads
   [`render.yaml`](render.yaml) and provisions the `summarex-backend` web service
   (Docker runtime, Frankfurt region, free plan).
2. Set the secret env vars in the dashboard (they are `sync: false` in the blueprint, so they
   are never committed): `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`,
   `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `BACKEND_URL`, `FRONTEND_URL`.
   - **`SUPABASE_URL` must be the bare host** — e.g. `https://abcdefgh.supabase.co`. Do **not**
     append `/rest/v1`, `/auth/v1`, or a trailing slash.
3. The deploy URL looks like `https://summarex-backend.onrender.com`. The `master` branch
   is wired for auto-deploy — every push to `master` triggers a new build.

> **Free plan note:** the service sleeps after 15 minutes of inactivity; the first request
> after sleep takes ~30–60s to wake (cold start). Upgrade to **Starter ($7/mo)** before any
> mobile launch to remove cold starts.

### 3. Frontend → Vercel

1. Import the GitHub repo into Vercel and set the **Root Directory** to `frontend/`. Vercel
   detects Vite; [`frontend/vercel.json`](frontend/vercel.json) pins the build, SPA rewrites,
   and asset caching.
2. Set env vars: `VITE_SUPABASE_URL` (bare host, same no-suffix rule), `VITE_SUPABASE_ANON_KEY`,
   `VITE_API_URL` (= the Render backend URL from step 2), and `VITE_APP_URL` (set this to the
   Vercel URL once the first deploy assigns one).
3. SPA routing on hard-refresh (e.g. `/dashboard`, `/meetings/:id`) and long-lived asset
   caching come from `vercel.json` automatically.

### 4. Post-deploy wiring

Once both services are live, close the loop so CORS and auth redirects line up:

- On **Render**, set `FRONTEND_URL` to the real Vercel URL (the backend's CORS allow-list
  depends on it) and redeploy.
- On **Vercel**, set `VITE_APP_URL` to its own URL (auth redirect links depend on it) and
  redeploy.
- In **Supabase Dashboard → Authentication → URL Configuration**, add the Vercel URL to both
  **Site URL** and **Redirect URLs** so email confirmation and password-reset links resolve
  back to the app.

### 5. Local container run (optional)

To run the production backend image locally instead of `uvicorn --reload`:

```bash
docker build -t summarex-backend ./backend && \
  docker run --rm --env-file backend/.env -p 8000:8000 summarex-backend
```

The frontend stays on `npm run dev` for hot reload during local development.

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
