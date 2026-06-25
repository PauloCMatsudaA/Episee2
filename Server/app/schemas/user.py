from datetime import datetime
from typing import Optional

from pydantic import BaseModel, EmailStr

from app.models.user import UserRole

class SectorBasic(BaseModel):
    id: int
    name: str

    model_config = {"from_attributes": True}

class UserBase(BaseModel):
    name: str
    email: EmailStr
    role: UserRole = UserRole.trabalhador
    sector_id: Optional[int] = None
    phone: Optional[str] = None

class UserCreate(UserBase):
    password: str

class UserUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    role: Optional[UserRole] = None
    sector_id: Optional[int] = None
    phone: Optional[str] = None
    password: Optional[str] = None

class UserResponse(UserBase):
    id: int
    is_system_admin: bool = False
    sector: Optional[SectorBasic] = None
    created_at: datetime

    model_config = {"from_attributes": True}

class Token(BaseModel):
    access_token: str
    token_type: str
    user: UserResponse

class TokenData(BaseModel):
    user_id: Optional[int] = None
