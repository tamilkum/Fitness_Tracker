"""Password hashing using bcrypt directly."""

import bcrypt


def hash_password(plain: str) -> str:
    """Return a bcrypt hash of *plain*. Never store plaintext."""
    return bcrypt.hashpw(plain.encode("utf-8"), bcrypt.gensalt(rounds=12)).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    """Return True if *plain* matches the stored *hashed* value."""
    return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))
