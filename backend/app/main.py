from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from app.config import settings
from app.limiter import limiter
from app.utils.logging import configure_logging, get_logger
from app.utils.exceptions import SummarexError

configure_logging(settings.LOG_LEVEL)

from app.routers import meetings, transcription, summary, share, health, entitlement  # noqa: E402

log = get_logger(__name__)

app = FastAPI(title="Summarex API", version="0.1.0")

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.FRONTEND_URL],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(meetings.router, prefix="/api/v1")
app.include_router(transcription.router, prefix="/api/v1")
app.include_router(summary.router, prefix="/api/v1")
app.include_router(share.router, prefix="/api/v1")
app.include_router(health.router, prefix="/api/v1")
app.include_router(entitlement.router, prefix="/api/v1")


@app.exception_handler(SummarexError)
async def summarex_exception_handler(request: Request, exc: SummarexError):
    log.info("%s %s -> %d %s", request.method, request.url.path, exc.status_code, exc.detail)
    return JSONResponse(status_code=exc.status_code, content={"detail": exc.detail})


@app.get("/")
async def root():
    return {"name": "Summarex API", "version": "0.1.0"}
