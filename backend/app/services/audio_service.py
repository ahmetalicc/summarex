"""Audio validation. Format check + size check only.

Duration is derived later from the transcription service (ElevenLabs Scribe word
timestamps), so we don't probe files locally and we don't depend on FFmpeg in this layer.
"""
from app.utils.exceptions import AudioValidationError

ALLOWED_EXTENSIONS = {"mp3", "wav", "m4a", "mp4", "webm", "ogg", "oga", "opus"}
MAX_SIZE_BYTES = 25 * 1024 * 1024  # 25 MB
CONTENT_TYPES = {
    "mp3": "audio/mpeg",
    "wav": "audio/wav",
    "m4a": "audio/mp4",
    "mp4": "video/mp4",
    "webm": "audio/webm",
    "ogg": "audio/ogg",
    "oga": "audio/ogg",
    "opus": "audio/ogg",
}


class AudioService:
    @staticmethod
    def validate(filename: str, size_bytes: int) -> str:
        """Validate and return the lowercased extension (without the dot)."""
        if "." not in filename:
            raise AudioValidationError("Filename must include an extension")
        ext = filename.rsplit(".", 1)[1].lower()
        if ext not in ALLOWED_EXTENSIONS:
            raise AudioValidationError(
                f"Unsupported format '{ext}'. Allowed: {sorted(ALLOWED_EXTENSIONS)}"
            )
        if size_bytes <= 0:
            raise AudioValidationError("File is empty")
        if size_bytes > MAX_SIZE_BYTES:
            raise AudioValidationError(
                f"File too large: {size_bytes / 1_000_000:.1f} MB (max 25 MB)"
            )
        return ext

    @staticmethod
    def content_type_for(extension: str) -> str:
        return CONTENT_TYPES.get(extension, "application/octet-stream")
