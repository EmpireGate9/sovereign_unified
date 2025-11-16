from typing import Optional

from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter(
    prefix="/api/chat",
    tags=["chat"],
)


class ChatRequest(BaseModel):
    content: str
    session_id: Optional[str] = None


class ChatResponse(BaseModel):
    reply: str
    session_id: Optional[str] = None


@router.post("/send", response_model=ChatResponse)
async def send_chat(request: ChatRequest) -> ChatResponse:
    """
    نقطة دردشة بسيطة:
    - لا تحتاج تسجيل دخول.
    - لا تحتاج project_id.
    - تستقبل content + session_id (اختياري).
    - ترجع رد تجريبي الآن، ويمكن لاحقاً ربطها بنموذج الذكاء الفعلي.
    """
    # هنا لاحقاً نستبدل المنطق باستدعاء نموذج الذكاء الفعلي (OpenAI أو غيره)
    reply_text = f"هذا رد تجريبي على رسالتك: {request.content}"

    return ChatResponse(
        reply=reply_text,
        session_id=request.session_id,
    )
