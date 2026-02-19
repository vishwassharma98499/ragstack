"""
Azure AD SSO Authentication for RAG Chatbot
Validates JWT tokens and provides user dependency injection for FastAPI routes.
"""
import os
from datetime import datetime, timedelta
from typing import Optional

import httpx
import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jwt import PyJWKClient

from app.core.config import settings

security = HTTPBearer(auto_error=False)

# Azure AD endpoints
AUTHORITY = f"https://login.microsoftonline.com/{settings.AZURE_TENANT_ID}"
TOKEN_ENDPOINT = f"{AUTHORITY}/oauth2/v2.0/token"
JWKS_URI = f"{AUTHORITY}/discovery/v2.0/keys"


class AuthenticatedUser:
    def __init__(self, id: str, email: str, name: str, roles: list[str] = []):
        self.id = id
        self.email = email
        self.name = name
        self.roles = roles


def create_app_token(user_data: dict) -> str:
    """Create an internal app JWT from Azure AD user data."""
    payload = {
        "sub": user_data["oid"],
        "email": user_data.get("email") or user_data.get("preferred_username", ""),
        "name": user_data.get("name", ""),
        "roles": user_data.get("roles", []),
        "exp": datetime.utcnow() + timedelta(hours=24),
    }
    return jwt.encode(payload, settings.SECRET_KEY, algorithm="HS256")


async def exchange_code_for_token(code: str, code_verifier: str) -> dict:
    """Exchange Azure AD authorization code for tokens."""
    async with httpx.AsyncClient() as client:
        response = await client.post(
            TOKEN_ENDPOINT,
            data={
                "client_id": settings.AZURE_CLIENT_ID,
                "client_secret": settings.AZURE_CLIENT_SECRET,
                "code": code,
                "redirect_uri": settings.REDIRECT_URI,
                "grant_type": "authorization_code",
                "code_verifier": code_verifier,
            },
            headers={"Content-Type": "application/x-www-form-urlencoded"},
        )
        if response.status_code != 200:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Azure token exchange failed: {response.text}",
            )
        return response.json()


async def validate_azure_token(token: str) -> dict:
    """Validate Azure AD ID token using JWKS."""
    try:
        jwks_client = PyJWKClient(JWKS_URI)
        signing_key = jwks_client.get_signing_key_from_jwt(token)
        decoded = jwt.decode(
            token,
            signing_key.key,
            algorithms=["RS256"],
            audience=settings.AZURE_CLIENT_ID,
            issuer=f"https://login.microsoftonline.com/{settings.AZURE_TENANT_ID}/v2.0",
        )
        return decoded
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token expired")
    except jwt.InvalidTokenError as e:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=f"Invalid token: {e}")


async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
) -> AuthenticatedUser:
    """
    FastAPI dependency — extracts and validates the Bearer JWT.
    Raises 401 if missing or invalid.
    """
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )
    try:
        payload = jwt.decode(
            credentials.credentials,
            settings.SECRET_KEY,
            algorithms=["HS256"],
        )
        return AuthenticatedUser(
            id=payload["sub"],
            email=payload["email"],
            name=payload["name"],
            roles=payload.get("roles", []),
        )
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")


async def get_optional_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
) -> Optional[AuthenticatedUser]:
    """
    Optional auth dependency — returns None if no token instead of raising.
    Used when AUTH_REQUIRED=false to allow unauthenticated access.
    """
    if not credentials:
        return None
    try:
        payload = jwt.decode(
            credentials.credentials,
            settings.SECRET_KEY,
            algorithms=["HS256"],
        )
        return AuthenticatedUser(
            id=payload["sub"],
            email=payload["email"],
            name=payload["name"],
            roles=payload.get("roles", []),
        )
    except jwt.InvalidTokenError:
        return None


def require_auth(user: Optional[AuthenticatedUser] = Depends(get_optional_user)) -> Optional[AuthenticatedUser]:
    """
    Conditionally enforce auth based on AUTH_REQUIRED setting.
    If AUTH_REQUIRED=false, allows all requests through (dev mode).
    If AUTH_REQUIRED=true, enforces JWT validation.
    """
    if not settings.AUTH_REQUIRED:
        return user  # pass-through in dev mode

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return user
