from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app import models, schemas
from app.database import get_db

router = APIRouter()


@router.post("/send", response_model=schemas.MessageOut)
async def send_message(
    request: schemas.MessageCreate,
    db: Session = Depends(get_db),
) -> schemas.MessageOut:
    # إذا لم يرسل project_id نستخدم 1 كقيمة افتراضية
    project_id = request.project_id if request.project_id is not None else 1

    message = models.Message(
        role="user",
        content=request.content,
        project_id=project_id,
        session_id=request.session_id,
        user_id=None,
    )
    db.add(message)
    db.commit()
    db.refresh(message)
    return message


@router.post("/reply", response_model=schemas.MessageOut)
async def chat_reply(
    request: schemas.MessageCreate,
    db: Session = Depends(get_db),
) -> schemas.MessageOut:
    # نفس التعامل مع project_id
    project_id = request.project_id if request.project_id is not None else 1

    # رد مؤقت (لاحقًا نستبدله بكود الذكاء الاصطناعي الحقيقي)
    ai_text = f"تم استلام رسالتك: {request.content}"

    ai_message = models.Message(
        role="assistant",
        content=ai_text,
        project_id=project_id,
        session_id=request.session_id,
        user_id=None,
    )
    db.add(ai_message)
    db.commit()
    db.refresh(ai_message)
    return ai_message
