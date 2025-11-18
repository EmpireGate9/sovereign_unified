from datetime import datetime
from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from openai import OpenAI

from app import models, schemas
from app.database import get_db

router = APIRouter(prefix="/api/chat", tags=["chat"])

# عميل OpenAI سيستخدم متغير البيئة OPENAI_API_KEY تلقائياً
client = OpenAI()


@router.post("/send", response_model=schemas.MessageOut)
def send_message(
    message_in: schemas.MessageCreate,
    db: Session = Depends(get_db),
):
    """
    تخزين رسالة المستخدم فقط (بدون رد الذكاء الاصطناعي).
    """
    # في الوقت الحالي نثبت user_id على 1 (يمكن ربطه بنظام الدخول لاحقاً)
    user_id = 1

    db_message = models.Message(
        user_id=user_id,
        project_id=message_in.project_id,
        session_id=message_in.session_id,
        role="user",
        content=message_in.content,
    )
    db.add(db_message)
    db.commit()
    db.refresh(db_message)
    return db_message


@router.post("/reply", response_model=schemas.MessageOut)
def chat_reply(
    chat: schemas.ChatRequest,
    db: Session = Depends(get_db),
):
    """
    استدعاء OpenAI بناءً على تاريخ الجلسة، وتخزين رد المساعد.
    """
    user_id = 1

    # جلب تاريخ المحادثة السابق لنفس session_id
    history: List[models.Message] = (
        db.query(models.Message)
        .filter(models.Message.session_id == chat.session_id)
        .order_by(models.Message.id.asc())
        .all()
    )

    messages_payload = [
        {"role": msg.role, "content": msg.content} for msg in history
    ]
    # إضافة رسالة المستخدم الحالية
    messages_payload.append({"role": "user", "content": chat.content})

    # استدعاء OpenAI
    try:
        completion = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=messages_payload,
        )
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"OpenAI error: {exc}",
        )

    assistant_reply = completion.choices[0].message.content

    # تخزين رد المساعد في قاعدة البيانات
    db_message = models.Message(
        user_id=user_id,
        project_id=None,
        session_id=chat.session_id,
        role="assistant",
        content=assistant_reply,
    )
    db.add(db_message)
    db.commit()
    db.refresh(db_message)
    return db_message
