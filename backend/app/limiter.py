"""slowapi rate limiter instance shared across the app."""
from slowapi import Limiter
from slowapi.util import get_remote_address

# IP-based limiting for MVP. Per-user limiting would require running auth inside key_func,
# which slowapi does not support natively without a custom key function.
limiter = Limiter(key_func=get_remote_address, default_limits=["100/minute"])
