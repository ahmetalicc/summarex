from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.routers import meetings, transcription, summary, share, health

app = FastAPI(title="MeetingMind API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.FRONTEND_URL],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(meetings.router, prefix="/api")
app.include_router(transcription.router, prefix="/api")
app.include_router(summary.router, prefix="/api")
app.include_router(share.router, prefix="/api")
app.include_router(health.router, prefix="/api")


@app.get("/")
async def root():
    return {"name": "MeetingMind API", "version": "0.1.0"}
