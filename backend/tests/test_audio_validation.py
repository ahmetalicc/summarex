import pytest
from app.services.audio_service import AudioService
from app.utils.exceptions import AudioValidationError


def test_accepts_valid_extensions():
    for filename in ["meeting.mp3", "voice.wav", "clip.m4a", "clip.mp4", "rec.webm", "note.ogg", "voice.opus"]:
        assert AudioService.validate(filename, 1024) == filename.rsplit(".", 1)[1]


def test_rejects_bad_extension():
    with pytest.raises(AudioValidationError):
        AudioService.validate("malware.exe", 1024)


def test_rejects_empty_file():
    with pytest.raises(AudioValidationError):
        AudioService.validate("ok.mp3", 0)


def test_rejects_oversized_file():
    with pytest.raises(AudioValidationError):
        AudioService.validate("ok.mp3", 200 * 1024 * 1024)


def test_rejects_no_extension():
    with pytest.raises(AudioValidationError):
        AudioService.validate("noextension", 1024)
