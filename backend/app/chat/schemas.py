from typing import Optional

from pydantic import BaseModel


class ChatRequest(BaseModel):
    content: str
    project_id: Optional[int] = None
    session_id: Optional[str] = None  # هوية الجلسة للزائر
