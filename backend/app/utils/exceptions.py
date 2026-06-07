"""Domain exceptions. The global handler in main.py converts these to HTTP responses."""


class SummarexError(Exception):
    status_code: int = 500
    default_detail: str = "Internal server error"

    def __init__(self, detail: str | None = None):
        self.detail = detail or self.default_detail
        super().__init__(self.detail)


class UnauthorizedError(SummarexError):
    status_code = 401
    default_detail = "Authentication required"


class ForbiddenError(SummarexError):
    status_code = 403
    default_detail = "Access denied"


class MeetingNotFoundError(SummarexError):
    status_code = 404
    default_detail = "Meeting not found"


class AudioValidationError(SummarexError):
    status_code = 400
    default_detail = "Invalid audio file"


class ExternalServiceError(SummarexError):
    status_code = 502
    default_detail = "Upstream service error"
