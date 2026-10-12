"""Single-owner authentication.

SMASH Cloud has one owner for now, configured in .env. Login returns a signed JWT
(HS256 with SMASH_JWT_SECRET). Every other service verifies tokens with the same
secret, so auth stays in one place without each service needing a user database.
"""

import hmac
from datetime import UTC, datetime, timedelta

import jwt
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel

from .config import Settings, get_settings

router = APIRouter()
bearer = HTTPBearer(auto_error=False)


class LoginRequest(BaseModel):
    username: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_at: datetime
    username: str


@router.post("/login", response_model=TokenResponse)
def login(body: LoginRequest, settings: Settings = Depends(get_settings)) -> TokenResponse:
    user_ok = hmac.compare_digest(body.username, settings.smash_admin_username)
    pass_ok = hmac.compare_digest(body.password, settings.smash_admin_password)
    if not (user_ok and pass_ok):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid username or password")

    expires_at = datetime.now(UTC) + timedelta(hours=settings.smash_jwt_ttl_hours)
    token = jwt.encode(
        {"sub": body.username, "exp": expires_at, "iss": "smash-api"},
        settings.smash_jwt_secret,
        algorithm="HS256",
    )
    return TokenResponse(access_token=token, expires_at=expires_at, username=body.username)


def require_user(
    creds: HTTPAuthorizationCredentials | None = Depends(bearer),
    settings: Settings = Depends(get_settings),
) -> str:
    if creds is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Missing bearer token")
    try:
        payload = jwt.decode(creds.credentials, settings.smash_jwt_secret, algorithms=["HS256"])
    except jwt.PyJWTError:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid or expired token")
    return payload["sub"]


@router.get("/me")
def me(user: str = Depends(require_user)) -> dict:
    return {"username": user}
