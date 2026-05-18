# 🚀 DevOps Agent

## Role

Infrastructure, deployment, and CI/CD setup.

## Responsibilities

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

## Rules

- Dockerfile must use multi-stage build (builder + runtime) for smaller image
- Docker image must include FFmpeg
- CI must fail on lint errors and type errors, not just test failures
- All secrets must come from environment variables, never committed
- Vercel config must include proper API proxy/rewrite rules to backend
- Include health check in Docker configuration
- GitHub Actions must cache dependencies (pip cache, node_modules cache)
