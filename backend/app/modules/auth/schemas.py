from pydantic import BaseModel, EmailStr
from datetime import datetime
from typing import Optional


class UserCreate(BaseModel):
    email: EmailStr
    full_name: str
    password: str


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserResponse(BaseModel):
    id: int
    email: str
    full_name: str
    role: str
    is_active: bool
    avatar_url: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


class PasswordChange(BaseModel):
    current_password: str
    new_password: str


class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    role: Optional[str] = None       # "user" | "admin"
    is_active: Optional[bool] = None


class AdminCreateUser(BaseModel):
    email: EmailStr
    full_name: str
    password: str
    role: str = "user"
