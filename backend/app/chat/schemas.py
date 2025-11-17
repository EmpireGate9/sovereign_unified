from typing import Optional
from pydantic import BaseModel

class ChatRequest(BaseModel):
    content: str
    project_id: Optional[int] = None
    session_id: Optional[str] = None

# يُستخدم من /api/chat/send حاليًا، نخليه يرث من ChatRequest
# حتى يصبح project_id اختياري أيضًا
class MessageCreate(ChatRequest):
    pass
