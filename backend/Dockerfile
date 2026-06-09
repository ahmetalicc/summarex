# syntax=docker/dockerfile:1
FROM python:3.12-slim

# Keep Python lean and unbuffered for container logs.
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

WORKDIR /app

# Install dependencies first so the layer caches across code changes.
# Transcription uses the OpenAI Whisper API (not the local model), so no
# ffmpeg or other system audio libraries are required — keep the image lean.
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Copy the application code.
COPY app/ ./app/

# Run as an unprivileged user.
RUN adduser --disabled-password --gecos "" appuser \
    && chown -R appuser:appuser /app
USER appuser

# Render injects $PORT; default to 8000 for local runs.
ENV PORT=8000
EXPOSE 8000

# Probe the mounted health router. Uses urllib so no extra deps are needed.
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
    CMD python -c "import os,urllib.request,sys; \
url='http://localhost:%s/api/v1/health' % os.environ.get('PORT','8000'); \
sys.exit(0 if urllib.request.urlopen(url, timeout=4).status == 200 else 1)"

CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
