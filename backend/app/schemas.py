from datetime import datetime
from typing import Optional

from pydantic import BaseModel, EmailStr


class UserBase(BaseModel):
    email: EmailStr
    full_name: Optional[str] = None


class UserCreate(UserBase):
    password: str


class UserOut(UserBase):
    id: int

    class Config:
        orm_mode = True


class Login(BaseModel):
    email: EmailStr
    password: str


class Token(BaseModel):
    access_token: str
    token_type: str


from typing import Optional

class MessageCreate(BaseModel):
    content: str
    project_id: Optional[int] = None
    session_id: Optional[str] = None


class MessageOut(BaseModel):
    id: int
    role: str
    content: str
    created_at: datetime

    class Config:
        orm_mode = True
