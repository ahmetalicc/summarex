# MeetingMind — Project Scope & Requirements Document

## 🎯 Project Vision

MeetingMind is an AI-powered meeting assistant that transforms audio recordings into structured, actionable summaries. Users can upload audio files or record meetings directly in the browser. The AI pipeline (Whisper + Claude) transcribes the audio and extracts key decisions, action items, topics discussed, and a concise summary.

**Target:** Portfolio-grade web application with live demo. Designed as Faz 1 of a product that will later expand to React Native mobile app.

**Live URL Target:** meetingmind.app or similar (deployed on Railway/Render + Vercel)

---

## 👤 User Personas

1. **Freelancer/Consultant** — Records client calls, needs quick summaries and action items
2. **Team Lead** — Records standup/sprint meetings, shares summaries with team
3. **Student** — Records lectures, gets structured notes automatically

---

## 🏗️ Core Features (MVP — Faz 1)

### F1: Audio File Upload & Transcription
- User uploads audio file (mp3, wav, m4a, webm — max 60 min for free tier)
- File is sent to backend → Whisper API transcribes → transcript stored in DB
- Progress indicator during transcription (estimated time based on file duration)
- Support for Turkish and English audio (Whisper auto-detects language)

### F2: In-Browser Live Recording
- "Record Meeting" button starts browser microphone capture via MediaRecorder API
- Real-time audio waveform visualization during recording
- Timer showing recording duration
- Stop → audio blob sent to backend → same transcription pipeline as F1
- Pause/Resume support

### F3: AI-Powered Smart Summary
- After transcription, Claude API analyzes the full transcript
- Generates structured output:
  - **Meeting Summary** (2-3 paragraph overview)
  - **Key Decisions** (bullet list of what was decided)
  - **Action Items** (who does what, with optional deadlines if mentioned)
  - **Topics Discussed** (tagged categories)
  - **Sentiment/Tone** (overall meeting mood — productive, tense, casual)
  - **Duration & Language** metadata
- Summary is stored alongside transcript in DB

### F4: Dashboard — Meeting History
- List of all past meetings with:
  - Title (auto-generated from summary, editable)
  - Date & duration
  - Language tag (TR/EN)
  - Quick preview of summary (first 2 lines)
- Search by keyword across all transcripts and summaries
- Filter by date range, language
- Sort by date (newest first default)

### F5: Meeting Detail Page
- Split-view layout:
  - **Left panel:** Full transcript with timestamps
  - **Right panel:** AI summary with sections (decisions, actions, topics)
- Highlight sync: clicking an action item highlights the relevant transcript section
- Edit capability: user can edit meeting title, add custom notes
- Share: generate a read-only shareable link

---

## 🔐 Authentication & User Management

- **Supabase Auth** (not custom JWT)
  - Google OAuth (primary — one-click signup)
  - Email + Password (secondary)
  - Magic Link (optional, low effort with Supabase)
- User profile: name, avatar (from Google), email
- Row Level Security on all tables (user can only see their own meetings)

---

## 🌐 Internationalization (i18n)

- UI language: English (default) + Turkish
- Language toggle in header/settings
- All UI strings externalized via i18n library (react-i18next)
- AI summary language matches the detected audio language
- Date/time formatting respects locale

---

## 🎨 UI/UX Design Direction

### Aesthetic
- **Modern, clean SaaS feel** — Think Linear, Notion, or Raycast
- Dark mode default with light mode toggle
- Generous whitespace, smooth animations
- Glass morphism accents for cards/panels

### Key UI Elements
- **Landing/Hero page:** Animated waveform background, clear CTA "Start Recording" or "Upload Audio"
- **Recording screen:** Large pulsing record button, live waveform, timer
- **Dashboard:** Card grid or list view, subtle hover animations
- **Detail page:** Split pane with smooth scroll sync
- **Loading states:** Skeleton screens + progress bars with estimated time

### Typography
- Display font: Something distinctive (e.g., Cabinet Grotesk, Satoshi, or General Sans)
- Body font: Clean and readable (e.g., Plus Jakarta Sans)
- Monospace for timestamps in transcript

### Color Palette (Dark Mode Primary)
- Background: Deep navy/charcoal (#0A0F1C or similar)
- Surface: Slightly lighter (#141B2D)
- Primary accent: Vibrant teal/cyan (#00D4AA) or electric blue
- Secondary accent: Warm amber for action items/warnings
- Text: Off-white (#E2E8F0)
- Success/Error: Standard green/red

---

## 🛠️ Tech Stack

### Frontend
- **React 18** + **TypeScript**
- **Vite** (build tool)
- **Tailwind CSS** + custom design tokens
- **Framer Motion** (animations)
- **react-i18next** (internationalization)
- **@supabase/auth-ui-react** (auth components)
- **wavesurfer.js** or custom canvas (audio waveform)
- **React Router v6** (routing)
- **Zustand** or **React Query** (state management)

### Backend
- **FastAPI** (Python 3.11+)
- **Supabase Python SDK** (auth verification, DB operations)
- **OpenAI Whisper API** (transcription)
- **Anthropic Claude API** (summarization — claude-sonnet-4-20250514)
- **Pydantic v2** (request/response models)
- **python-multipart** (file upload handling)
- **FFmpeg** (audio format conversion if needed)

### Database (Supabase PostgreSQL)
- `users` — managed by Supabase Auth
- `meetings` — id, user_id, title, audio_url, duration_seconds, language, created_at, updated_at
- `transcripts` — id, meeting_id, full_text, segments (JSONB — timestamped chunks), language
- `summaries` — id, meeting_id, overview, decisions (JSONB), action_items (JSONB), topics (JSONB[]), sentiment, raw_ai_response
- `shared_links` — id, meeting_id, token, expires_at, is_active

### Storage
- **Supabase Storage** — audio files stored in private bucket per user

### Deployment
- **Frontend:** Vercel (free tier)
- **Backend:** Railway or Render ($5-7/month)
- **Database + Auth + Storage:** Supabase (free tier — 500MB DB, 1GB storage)
- **Domain:** meetingmind.app or meetingmind.dev

---

## 📁 Project Structure

```
meetingmind/
├── frontend/                    # React + TypeScript + Vite
│   ├── public/
│   ├── src/
│   │   ├── assets/
│   │   ├── components/
│   │   │   ├── ui/              # Reusable UI components (Button, Card, Input, etc.)
│   │   │   ├── audio/           # AudioRecorder, Waveform, UploadZone
│   │   │   ├── meeting/         # MeetingCard, MeetingDetail, TranscriptView, SummaryPanel
│   │   │   ├── layout/          # Header, Sidebar, Footer
│   │   │   └── auth/            # LoginForm, AuthGuard
│   │   ├── pages/
│   │   │   ├── Landing.tsx
│   │   │   ├── Dashboard.tsx
│   │   │   ├── MeetingDetail.tsx
│   │   │   ├── RecordPage.tsx
│   │   │   └── SharedMeeting.tsx
│   │   ├── hooks/               # useRecorder, useMeetings, useAuth
│   │   ├── lib/                 # supabaseClient, apiClient, i18n config
│   │   ├── store/               # Zustand stores
│   │   ├── locales/
│   │   │   ├── en.json
│   │   │   └── tr.json
│   │   ├── types/               # TypeScript interfaces
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── tailwind.config.ts
│   ├── vite.config.ts
│   ├── tsconfig.json
│   └── package.json
│
├── backend/                     # FastAPI + Python
│   ├── app/
│   │   ├── main.py              # FastAPI app entry
│   │   ├── config.py            # Environment variables, settings
│   │   ├── dependencies.py      # Auth dependency, Supabase client
│   │   ├── routers/
│   │   │   ├── meetings.py      # CRUD + upload + record endpoints
│   │   │   ├── transcription.py # Whisper API integration
│   │   │   ├── summary.py       # Claude API integration
│   │   │   ├── share.py         # Shared link endpoints
│   │   │   └── health.py        # Health check
│   │   ├── services/
│   │   │   ├── whisper_service.py
│   │   │   ├── claude_service.py
│   │   │   ├── audio_service.py      # FFmpeg conversion, validation
│   │   │   └── supabase_service.py
│   │   ├── models/
│   │   │   ├── meeting.py
│   │   │   ├── transcript.py
│   │   │   └── summary.py
│   │   └── utils/
│   │       ├── audio_utils.py
│   │       └── prompt_templates.py   # Claude prompt templates for summarization
│   ├── tests/
│   │   ├── test_meetings.py
│   │   ├── test_transcription.py
│   │   └── test_summary.py
│   ├── requirements.txt
│   ├── Dockerfile
│   └── .env.example
│
├── supabase/
│   └── migrations/
│       └── 001_initial_schema.sql
│
├── docker-compose.yml
├── .github/
│   └── workflows/
│       ├── ci-backend.yml
│       └── ci-frontend.yml
├── README.md
└── .env.example
```

---

## 🔌 API Endpoints

### Auth (handled by Supabase — no custom endpoints needed)

### Meetings
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/meetings/upload` | Upload audio file → start transcription pipeline |
| POST | `/api/meetings/record` | Upload recorded audio blob → same pipeline |
| GET | `/api/meetings` | List user's meetings (paginated, searchable) |
| GET | `/api/meetings/{id}` | Get meeting detail (transcript + summary) |
| PATCH | `/api/meetings/{id}` | Update meeting title/notes |
| DELETE | `/api/meetings/{id}` | Delete meeting and associated data |

### Transcription (internal, triggered by upload)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/meetings/{id}/transcript` | Get transcript with timestamps |
| GET | `/api/meetings/{id}/status` | Check processing status (queued/transcribing/summarizing/done/error) |

### Summary
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/meetings/{id}/summary` | Get AI-generated summary |
| POST | `/api/meetings/{id}/regenerate` | Re-generate summary with different prompt |

### Share
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/meetings/{id}/share` | Generate shareable link |
| GET | `/api/share/{token}` | Access shared meeting (no auth required) |
| DELETE | `/api/meetings/{id}/share` | Revoke shared link |

### Health
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Health check + dependency status |

---

## 🔄 Processing Pipeline

```
User uploads/records audio
        ↓
Backend validates file (format, size, duration)
        ↓
Audio stored in Supabase Storage
        ↓
Meeting record created in DB (status: "processing")
        ↓
[Background Task] Audio sent to Whisper API
        ↓
Transcript stored in DB (status: "summarizing")
        ↓
[Background Task] Transcript sent to Claude API with summary prompt
        ↓
Summary stored in DB (status: "done")
        ↓
Frontend polls status → displays result when ready
```

---

## 🧪 Testing Strategy

- **Backend unit tests:** pytest — service layer mocking for Whisper/Claude APIs
- **API integration tests:** TestClient (FastAPI) with test database
- **Frontend component tests:** Vitest + React Testing Library
- **E2E tests (stretch):** Playwright for critical flows (upload → view summary)
- **CI:** GitHub Actions — lint + test on every PR

---

## 📊 Premium Features (Faz 2 — Future)

These are NOT in MVP scope but inform architecture decisions:
- Longer recording limits (free: 30 min, premium: 3 hours)
- Speaker diarization (who said what)
- Calendar integration (Google Calendar → auto-record)
- Team workspaces (shared meeting library)
- Custom summary templates
- Slack/Teams integration
- Export to Notion/Google Docs
- Real-time live transcription (WebSocket)
- React Native mobile app (iOS + Android)

---

## 🌿 Git Strategy

### Branch Model: Simplified Git Flow

```
main              → Production-ready code. Deploy triggers from here.
develop           → Integration branch. All feature branches merge here.
feature/*         → Individual feature work. One per agent/task.
hotfix/*          → Emergency fixes branching from main, merging back to main + develop.
```

### Branch Naming Convention

Each agent works on its own feature branch:

| Agent | Branch Name | Merges Into |
|-------|-------------|-------------|
| Architect | `feature/project-skeleton` | `develop` |
| Backend | `feature/backend-api` | `develop` |
| Frontend | `feature/frontend-ui` | `develop` |
| DevOps | `feature/devops-ci` | `develop` |
| QA | `feature/tests` | `develop` |

After all agents complete and integration is verified: `develop` → `main` (via PR).

### Commit Message Format: Conventional Commits

Every commit must follow this format:

```
<type>(<scope>): <short description>

[optional body]
```

**Types:**
- `feat` — New feature (e.g., `feat(backend): add whisper transcription service`)
- `fix` — Bug fix (e.g., `fix(frontend): recording timer not resetting`)
- `chore` — Tooling, config, dependencies (e.g., `chore: add docker-compose for local dev`)
- `docs` — Documentation (e.g., `docs: add API endpoint documentation to README`)
- `test` — Tests (e.g., `test(backend): add unit tests for claude service`)
- `style` — Code style/formatting, no logic change
- `refactor` — Code restructure, no behavior change
- `ci` — CI/CD changes (e.g., `ci: add GitHub Actions backend workflow`)

**Scope** is optional but recommended: `backend`, `frontend`, `devops`, `auth`, `i18n`, etc.

### Git Workflow Per Agent

```
1. git checkout develop
2. git pull origin develop
3. git checkout -b feature/<branch-name>
4. ... work and commit ...
5. git push origin feature/<branch-name>
6. Create PR → develop (with description of what was done)
7. Review → Merge → Delete branch
```

### Tags & Releases

- After Faz 1 MVP is complete and merged to main: tag as `v1.0.0`
- Use semantic versioning: `v<major>.<minor>.<patch>`

### .gitignore

Must include at minimum:
```
node_modules/
dist/
.env
.env.local
__pycache__/
*.pyc
.venv/
.pytest_cache/
.coverage
.DS_Store
*.log
```

### Protected Branch Rules (GitHub Settings)

- `main`: Require PR, require CI pass, no direct push
- `develop`: Require PR (optional — can be relaxed during solo development)

---

## ⚠️ Constraints & Notes

1. **Free tier limits:** Clearly communicate to users. Default: 5 meetings/month free, 30 min max per recording.
2. **API costs:** Whisper ($0.006/min) + Claude (~$0.03/meeting). Keep in mind for rate limiting.
3. **File size:** Max 100MB upload (roughly 2 hours of compressed audio).
4. **Error handling:** Graceful fallbacks — if Whisper fails, show error with retry option. If Claude fails, show transcript without summary.
5. **Privacy:** Audio files are private per user. Shared links only expose summary, not raw audio.
6. **Responsive:** Must work on mobile browsers (recording + viewing) even before React Native app.
