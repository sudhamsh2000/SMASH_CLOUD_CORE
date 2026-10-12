from contextlib import asynccontextmanager

from fastapi import FastAPI

from . import auth, system
from .config import get_settings


@asynccontextmanager
async def lifespan(_: FastAPI):
    get_settings()  # fail fast if required env vars are missing
    yield


app = FastAPI(title="SMASH Cloud API", version="0.1.0", lifespan=lifespan, docs_url="/api/docs", openapi_url="/api/openapi.json")

app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(system.router, prefix="/api/system", tags=["system"])


@app.get("/api/health")
def health() -> dict:
    return {"service": "smash-api", "status": "ok"}
