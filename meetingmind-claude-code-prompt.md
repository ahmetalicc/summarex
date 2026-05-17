# MeetingMind — Claude Code Master Prompt

## Overview

You are building **MeetingMind**, an AI-powered meeting assistant web application. Before writing ANY code, you must first set up the multi-agent development environment by creating the agent definition files and project structure described below.

Read the full project scope and requirements in `meetingmind-project-scope.md` before starting.

---

## Model Assignment Per Agent

Each agent uses the Claude model best suited to its role:

| Agent | Model | Reason |
|-------|-------|--------|
| 🏗️ Architect | **claude-opus-4** | Complex system design, architectural decisions, cross-cutting concerns |
| ⚙️ Backend | **claude-sonnet-4** | Fast, high-quality code generation, API implementation |
| 🎨 Frontend | **claude-sonnet-4** | Fast, high-quality code generation, UI implementation |
| 🚀 DevOps | **claude-sonnet-4** | Config files, CI/CD pipelines, Docker |
| 🧪 QA | **claude-sonnet-4** | Test writing, fixture generation |

**How to switch models in Claude Code:**
- Use `/model` command to switch between models
- Or set `CLAUDE_MODEL` environment variable
- Switch to Opus before running Architect agent, then back to Sonnet for the rest

---

## Dual-Terminal Workflow (Orchestrator + Worker)

This project is designed to be developed using **two Claude Code terminals** running simultaneously:

### Terminal 1 — Orchestrator (Opus)
- **Purpose:** Planning, review, debugging, generating prompts for Terminal 2
- **Model:** claude-opus-4
- **What it does:**
  - Reads the project scope and agent files
  - Plans what needs to be implemented next
  - Generates specific, detailed prompts for Terminal 2
  - Reviews code written by Terminal 2
  - Diagnoses issues and provides fix instructions
  - Tracks overall progress against success criteria
- **What it does NOT do:** Write application code directly

### Terminal 2 — Worker (Sonnet)
- **Purpose:** Writing actual code, running commands, creating files
- **Model:** claude-sonnet-4
- **What it does:**
  - Receives prompts from Terminal 1 (via you copying them)
  - Writes all application code (backend, frontend, tests, config)
  - Runs builds, tests, linters
  - Creates and edits files
- **What it does NOT do:** Make architectural decisions on its own

### Workflow Loop

```
┌─────────────────────────────────────────────────────────┐
│  YOU                                                     │
│                                                          │
│  1. Tell Terminal 1 what you want to work on next        │
│              ↓                                           │
│  Terminal 1 (Opus) generates a detailed prompt           │
│              ↓                                           │
│  2. Copy that prompt → paste into Terminal 2             │
│              ↓                                           │
│  Terminal 2 (Sonnet) writes the code                     │
│              ↓                                           │
│  3. If issues arise → describe to Terminal 1             │
│              ↓                                           │
│  Terminal 1 (Opus) diagnoses and gives fix instructions  │
│              ↓                                           │
│  4. Apply fix in Terminal 2                              │
│              ↓                                           │
│  5. When feature is done → tell Terminal 1 to plan next  │
└─────────────────────────────────────────────────────────┘
```

### Orchestrator Starter Prompt (for Terminal 1)

Use this prompt to initialize the Orchestrator terminal:

```
You are the Orchestrator for the MeetingMind project. Your role:

1. Read meetingmind-project-scope.md and meetingmind-claude-code-prompt.md
2. Track which agents/features are complete and what's next
3. Generate specific, copy-pasteable prompts for the Worker terminal (Sonnet)
4. Review code when I share it with you
5. Diagnose issues when I describe them
6. Never write application code yourself — only plan and generate prompts

Start by reading both md files and telling me the first step.
```

### Worker Starter Prompt (for Terminal 2)

Use this prompt to initialize the Worker terminal:

```
You are the Worker for the MeetingMind project. Your role:

1. Read meetingmind-project-scope.md and meetingmind-claude-code-prompt.md for context
2. Execute coding tasks given to you
3. Write clean, production-quality code
4. Follow the project structure and conventions defined in the scope
5. Make granular git commits with Conventional Commits format
6. Ask for clarification if a task is ambiguous

Wait for my first task.
```

---

## Phase 0: Agent Setup

Create the following 5 agent `.md` files inside a `agents/` directory at the project root. Each agent has a specific role, responsibility boundary, and set of rules. After creating all agent files, the Architect agent should be invoked FIRST to establish the project foundation.

---

### Agent 1: 🏗️ Architect Agent (`agents/architect.md`)

**Role:** System designer and project bootstrapper. Runs FIRST and ONCE to set up the entire project skeleton.

**Responsibilities:**
- Create the full directory structure as defined in `meetingmind-project-scope.md`
- Initialize frontend (Vite + React + TypeScript) and backend (FastAPI) projects with all dependencies
- Set up Supabase schema (SQL migration files)
- Define all TypeScript interfaces and Pydantic models (the "contracts" between frontend and backend)
- Create `.env.example` files with all required environment variables
- Set up `docker-compose.yml` for local development
- Create base configuration files (tailwind.config.ts, vite.config.ts, tsconfig.json, pyproject.toml or requirements.txt)
- Set up i18n configuration skeleton (en.json and tr.json with empty structure)
- Write the project README.md

**Rules:**
- Do NOT implement any business logic — only structure, configuration, types, and models
- Every TypeScript interface must have a matching Pydantic model and vice versa
- All API endpoint paths must be defined as constants in both frontend and backend
- Use absolute imports configured in tsconfig.json (e.g., `@/components/...`)
- Tailwind config must include the custom design tokens from the scope document (colors, fonts)
- Include comments in migration SQL explaining each table and relationship
- requirements.txt must pin exact versions for reproducibility

**Output:** The complete project skeleton that other agents can build on top of.

---

### Agent 2: ⚙️ Backend Agent (`agents/backend.md`)

**Role:** FastAPI backend developer. Implements all server-side logic.

**Responsibilities:**
- Implement all API endpoints defined in the scope document
- Build the Whisper integration service (audio upload → Whisper API → transcript)
- Build the Claude integration service (transcript → structured summary)
- Implement the background task pipeline (upload → transcribe → summarize → done)
- Set up Supabase client for auth verification and database operations
- Implement audio validation and processing (format check, duration extraction, optional FFmpeg conversion)
- Build the sharing system (generate token, public access endpoint)
- Implement proper error handling and HTTP status codes
- Create the prompt templates for Claude summarization

**Rules:**
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

**Claude Summarization Prompt Requirements:**
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

---

### Agent 3: 🎨 Frontend Agent (`agents/frontend.md`)

**Role:** React frontend developer and UI/UX implementer. Creates a visually stunning, production-grade interface.

**Responsibilities:**
- Implement all pages: Landing, Dashboard, RecordPage, MeetingDetail, SharedMeeting
- Build the audio recording system using MediaRecorder API with live waveform visualization
- Build the file upload system with drag-and-drop and progress indication
- Implement the meeting detail split-view (transcript + summary)
- Build all reusable UI components (Button, Card, Input, Modal, Skeleton, Badge, etc.)
- Implement authentication flow with Supabase Auth UI
- Set up i18n with react-i18next (English + Turkish)
- Implement dark/light mode toggle with smooth transitions
- Add Framer Motion animations throughout the app
- Connect to backend API with proper loading/error states
- Implement responsive design (mobile-first)

**Design Rules — CRITICAL:**
- This is a PORTFOLIO PROJECT. The UI must be exceptional — not generic, not "another SaaS template."
- **Typography:** Use Google Fonts — pick distinctive display + body fonts. NOT Inter, NOT Roboto, NOT Arial. Consider: Cabinet Grotesk, Satoshi, Plus Jakarta Sans, General Sans, Space Grotesk (only if it truly fits), Sora, Outfit.
- **Color scheme (Dark mode):** Deep navy/charcoal backgrounds, vibrant teal or electric blue accent, warm amber secondary. No boring gray-on-white.
- **Animations:** Page transitions (Framer Motion), staggered list reveals on Dashboard, smooth waveform during recording, skeleton loading states, hover micro-interactions on cards.
- **Landing page:** Must be a "wow" page. Animated waveform or audio visualization in the hero. Clear value proposition. CTA buttons with hover effects. Possibly a demo section showing what the summary output looks like.
- **Recording page:** Large centered record button with pulse animation when active. Live waveform (canvas or wavesurfer.js). Timer. Minimal distractions.
- **Dashboard:** Card-based layout with subtle glassmorphism. Quick status badges (processing, done, error). Empty state with illustration when no meetings yet.
- **Meeting detail:** Clean split-pane layout. Transcript on left with timestamp markers. Summary on right with collapsible sections. Smooth scroll.
- **Auth pages:** Integrated into the landing page or minimal separate page. Supabase Auth UI customized to match the app theme.
- Use **CSS custom properties** for all theme colors (dark/light mode switching).
- All components must have proper TypeScript types — no `any`.
- Implement proper error boundaries and fallback UIs.

**State Management:**
- React Query (TanStack Query) for all server state (meetings list, meeting detail, status polling)
- Zustand for client-only state (theme, language, recording state)
- Status polling: use React Query's `refetchInterval` on the status endpoint (every 2 seconds while processing)

**API Client:**
- Create a typed API client (`lib/apiClient.ts`) with all endpoints
- Attach Supabase auth token to every request
- Handle 401 → redirect to login
- Handle network errors gracefully

---

### Agent 4: 🚀 DevOps Agent (`agents/devops.md`)

**Role:** Infrastructure, deployment, and CI/CD setup.

**Responsibilities:**
- Write `Dockerfile` for the backend (Python, with FFmpeg installed)
- Write `docker-compose.yml` for local development (backend + local PostgreSQL for dev)
- Set up GitHub Actions CI workflows:
  - `ci-backend.yml`: lint (ruff) + type check (mypy) + test (pytest) on push/PR
  - `ci-frontend.yml`: lint (eslint) + type check (tsc) + test (vitest) on push/PR
- Create deployment configurations:
  - Railway `railway.toml` or `Procfile` for backend
  - Vercel `vercel.json` for frontend
- Write `DEPLOYMENT.md` with step-by-step deployment guide
- Set up environment variable documentation

**Rules:**
- Dockerfile must use multi-stage build (builder + runtime) for smaller image
- Docker image must include FFmpeg
- CI must fail on lint errors and type errors, not just test failures
- All secrets must come from environment variables, never committed
- Vercel config must include proper API proxy/rewrite rules to backend
- Include health check in Docker configuration
- GitHub Actions must cache dependencies (pip cache, node_modules cache)

---

### Agent 5: 🧪 QA Agent (`agents/qa.md`)

**Role:** Quality assurance, testing, and code quality enforcement.

**Responsibilities:**
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

**Rules:**
- Backend services must be tested with mocked Whisper and Claude responses
- Mock responses must be realistic (actual Whisper/Claude output format)
- Test the error paths: what happens when Whisper fails? When Claude returns malformed JSON?
- Frontend tests must test user interactions, not implementation details
- Every API endpoint must have at least: 1 happy path test, 1 auth failure test, 1 validation error test
- E2E test can be a stretch goal — unit/integration tests are priority

---

## Phase 0.5: Git Initialization

Before any agent starts coding, initialize the repository:

```bash
# 1. Create GitHub repo (do this manually on github.com first)
#    Repo name: meetingmind
#    Visibility: Public
#    Do NOT initialize with README (we'll push our own)

# 2. Local setup
mkdir meetingmind && cd meetingmind
git init
git remote add origin https://github.com/<your-username>/meetingmind.git

# 3. Initial commit on main
# Copy meetingmind-project-scope.md and meetingmind-claude-code-prompt.md to root
git add .
git commit -m "docs: add project scope and development prompt"
git push -u origin main

# 4. Create develop branch
git checkout -b develop
git push -u origin develop
```

After this, every agent follows the Git workflow defined in `meetingmind-project-scope.md`.

---

## Phase 1: Execution Order (with Git)

After creating all agent files, execute in this order. **Each agent works on its own feature branch.**

```
1. Architect Agent
   git checkout -b feature/project-skeleton develop
   → Project skeleton, types, models, config, DB schema
   → Commits with: feat(arch): ..., chore: ...
   → When done: merge feature/project-skeleton → develop

2. Backend Agent
   git checkout -b feature/backend-api develop
   → All API endpoints, services, pipeline
   → Commits with: feat(backend): ..., fix(backend): ...
   → When done: merge feature/backend-api → develop

3. Frontend Agent
   git checkout -b feature/frontend-ui develop
   → All pages, components, styling, animations
   → Commits with: feat(frontend): ..., style(frontend): ...
   → When done: merge feature/frontend-ui → develop

4. DevOps Agent
   git checkout -b feature/devops-ci develop
   → Docker, CI/CD, deployment config
   → Commits with: ci: ..., chore(devops): ...
   → When done: merge feature/devops-ci → develop

5. QA Agent
   git checkout -b feature/tests develop
   → Tests for backend and frontend
   → Commits with: test(backend): ..., test(frontend): ...
   → When done: merge feature/tests → develop
```

Each agent should ONLY work within its responsibility boundary. If an agent needs something from another agent's domain, it should reference the types/interfaces created by the Architect agent.

**IMPORTANT:** Each agent must make granular, meaningful commits — NOT one giant commit per agent. For example, the Backend agent might have:
```
feat(backend): add meeting CRUD endpoints
feat(backend): implement whisper transcription service
feat(backend): implement claude summarization service
feat(backend): add background task pipeline
feat(backend): add sharing system endpoints
chore(backend): add environment config with pydantic settings
```

---

## Phase 2: Integration, Polish & Release

After all agents have completed their work:

```bash
# All agents done, develop has everything
git checkout develop

# Integration verification:
```

1. Verify frontend ↔ backend integration (API calls work, auth flows work)
2. Run all tests and fix any failures
3. Test the full flow: Register → Login → Record/Upload → View Summary → Share
4. Verify i18n works (switch between EN and TR)
5. Verify dark/light mode works
6. Check responsive design on mobile viewport

```bash
# When everything works:
git checkout main
git merge develop --no-ff -m "feat: MeetingMind MVP v1.0.0"
git tag -a v1.0.0 -m "MeetingMind MVP - Faz 1 complete"
git push origin main --tags
```

7. Deploy to production and verify

---

## Key Environment Variables Needed

```env
# Supabase
SUPABASE_URL=your-project-url
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# OpenAI (Whisper)
OPENAI_API_KEY=your-openai-key

# Anthropic (Claude)
ANTHROPIC_API_KEY=your-anthropic-key

# App
BACKEND_URL=http://localhost:8000
FRONTEND_URL=http://localhost:5173
```

---

## Success Criteria

The project is DONE when:
- [ ] A new user can sign up with Google OAuth or email
- [ ] User can upload an audio file and see it being processed
- [ ] User can record audio in the browser and see it being processed
- [ ] Processing pipeline completes: audio → transcript → summary
- [ ] Dashboard shows all meetings with search and filter
- [ ] Meeting detail shows transcript + summary in split view
- [ ] User can share a meeting via link (no auth required to view)
- [ ] UI is in English by default, switchable to Turkish
- [ ] Dark/light mode works
- [ ] App is deployed and accessible via public URL
- [ ] All critical path tests pass
- [ ] The UI looks exceptional — not generic, not template-like
