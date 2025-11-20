from typing import List, Optional

from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from openai import OpenAI

from app import models, schemas
from app.database import get_db

# لا نضع /api هنا. الـ main.py يضيف /api و /chat
router = APIRouter(tags=["chat"])

# سيستخدم OPENAI_API_KEY من الـ env
client = OpenAI()


@router.post("/send", response_model=schemas.MessageOut)
def send_message(
    message_in: schemas.MessageCreate,
    db: Session = Depends(get_db),
):
    """
    تخزين رسالة المستخدم فقط (بدون استدعاء OpenAI).
    يمكن استخدامه مستقبلاً لو أردت تخزين الرسائل يدوياً.
    """
    user_id = 1  # مؤقتاً

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
    استدعاء OpenAI بناءً على تاريخ الجلسة وتخزين:
      - رسالة المستخدم الحالية
      - رد المساعد
    """
    user_id = 1  # مؤقتاً حتى نربطه بنظام الدخول لاحقاً

    if not chat.session_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="session_id is required for chat",
        )

    # أولاً: خزن رسالة المستخدم الحالية في الـ DB
    user_msg = models.Message(
        user_id=user_id,
        project_id=chat.project_id,
        session_id=chat.session_id,
        role="user",
        content=chat.content,
    )
    db.add(user_msg)
    db.commit()
    db.refresh(user_msg)

    # ثانياً: جلب كل تاريخ الجلسة (بعد إضافة الرسالة الحالية)
    history: List[models.Message] = (
        db.query(models.Message)
        .filter(models.Message.session_id == chat.session_id)
        .order_by(models.Message.id.asc())
        .all()
    )

    messages_payload = [
        {"role": msg.role, "content": msg.content} for msg in history
    ]

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

    # ثالثاً: تخزين رد المساعد في قاعدة البيانات
    db_message = models.Message(
        user_id=user_id,
        project_id=chat.project_id,
        session_id=chat.session_id,
        role="assistant",
        content=assistant_reply,
    )
    db.add(db_message)
    db.commit()
    db.refresh(db_message)
    return db_message


@router.get("/history", response_model=List[schemas.MessageOut])
def chat_history(
    session_id: Optional[str] = None,
    project_id: Optional[int] = None,
    db: Session = Depends(get_db),
):
    """
    جلب تاريخ المحادثة:
      - لو session_id موجود → رجّع رسائل هذه الجلسة
      - لو لا → لو project_id موجود → رجّع رسائل هذا المشروع
    """
    q = db.query(models.Message)

    if session_id:
        q = q.filter(models.Message.session_id == session_id)
    elif project_id is not None:
        q = q.filter(models.Message.project_id == project_id)

    q = q.order_by(models.Message.id.asc())
    msgs = q.all()
    return msgs
