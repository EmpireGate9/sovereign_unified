from pydantic import BaseModel, EmailStr, Field
from typing import Optional, Any, Dict

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    full_name: Optional[str] = ""

class UserOut(BaseModel):
    id: int
    email: EmailStr
    full_name: str
    role: str
    is_active: bool
    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"

class ProjectCreate(BaseModel):
    name: str
    description: str = ""

class ProjectOut(BaseModel):
    id: int
    name: str
    description: str
    owner_id: int
    class Config:
        from_attributes = True

class MessageCreate(BaseModel):
    project_id: int
    content: str

class MessageOut(BaseModel):
    id: int
    project_id: int
    role: str
    content: str
    class Config:
        from_attributes = True

class TaskCreate(BaseModel):
    project_id: int
    title: str

class FileOut(BaseModel):
    id: int
    filename: str
    mime_type: str
    size: int
    class Config:
        from_attributes = True

class PolicyCreate(BaseModel):
    name: str
    rules: Dict[str, Any] = Field(default_factory=dict)
