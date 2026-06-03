from __future__ import annotations
from datetime import datetime
from pydantic import BaseModel
from typing import Optional


class RegisterRequest(BaseModel):
    username: str
    password: str
    display_name: Optional[str] = None


class LoginRequest(BaseModel):
    username: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user_id: int


class OAuthLoginRequest(BaseModel):
    provider: str  # google, apple, wechat, etc.
    token: str
    email: Optional[str] = None
    name: Optional[str] = None


class UserProfile(BaseModel):
    id: int
    username: str
    display_name: Optional[str] = None
    bio: Optional[str] = None
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True
