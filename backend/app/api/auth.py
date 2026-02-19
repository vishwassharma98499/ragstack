"""
Authentication routes — Azure AD OAuth2 PKCE flow.
POST /auth/token    — exchange code for app JWT
GET  /auth/me       — get current user profile
POST /auth/logout   — invalidate session
"""
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.core.auth import (
    exchange_code_for_token,
    validate_azure_token,
    create_app_token,
    get_current_user,
    AuthenticatedUser,
)
from app.core.config import settings

router = APIRouter()

# In-memory session store (swap for Redis in production)
user_sessions: dict = {}


class TokenRequest(BaseModel):
    code: str
    code_verifier: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str
    expires_in: int
    user: dict


@router.post("/token", response_model=TokenResponse)
async def login(request: TokenRequest):
    """
    Step 3 of PKCE flow:
    - Receive auth code from frontend callback
    - Exchange with Azure AD for ID token
    - Validate the ID token
    - Issue our own app JWT
    """
    if not settings.AZURE_TENANT_ID or not settings.AZURE_CLIENT_ID:
        raise HTTPException(
            status_code=501,
            detail="Azure AD not configured. Set AZURE_TENANT_ID, AZURE_CLIENT_ID, AZURE_CLIENT_SECRET in .env",
        )

    azure_tokens = await exchange_code_for_token(request.code, request.code_verifier)
    user_data = await validate_azure_token(azure_tokens["id_token"])
    app_token = create_app_token(user_data)

    user_id = user_data["oid"]
    email = user_data.get("email") or user_data.get("preferred_username", "")

    user_sessions[user_id] = {
        "logged_in_at": datetime.utcnow().isoformat(),
        "email": email,
    }

    return TokenResponse(
        access_token=app_token,
        token_type="Bearer",
        expires_in=86400,
        user={
            "id": user_id,
            "email": email,
            "name": user_data.get("name", ""),
            "roles": user_data.get("roles", []),
        },
    )


@router.get("/me")
async def get_me(current_user: AuthenticatedUser = Depends(get_current_user)):
    """Return the current authenticated user's profile."""
    return {
        "id": current_user.id,
        "email": current_user.email,
        "name": current_user.name,
        "roles": current_user.roles,
    }


@router.post("/logout")
async def logout(current_user: AuthenticatedUser = Depends(get_current_user)):
    """Invalidate the user session."""
    user_sessions.pop(current_user.id, None)
    return {"message": "Logged out successfully"}
