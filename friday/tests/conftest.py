import os

# Settings are read at import time; no database is contacted unless a test queries it.
os.environ.setdefault("DATABASE_URL", "postgresql+asyncpg://test:test@localhost:1/test")
os.environ.setdefault("SMASH_JWT_SECRET", "test-secret")
