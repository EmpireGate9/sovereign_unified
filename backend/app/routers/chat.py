# backend/app/routers/chat.py

from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from openai import OpenAI

from app.database import get_db
from app import models, schemas

router = APIRouter(prefix="/chat", tags=["chat"])

# عميل OpenAI (يستخدم OPENAI_API_KEY من البيئة)
client = OpenAI()


# ------------------------------------------------------
# 1) تخزين رسالة المستخدم فقط
# ------------------------------------------------------
@router.post("/send", response_model=schemas.MessageOut)
def send_message(
    message_in: schemas.MessageCreate,
    db: Session = Depends(get_db),
):
    """
    تخزين رسالة المستخدم في جدول messages.
    """
    # حالياً نستخدم user_id ثابت (يمكن ربطه بنظام الدخول لاحقاً)
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


# ------------------------------------------------------
# 2) إرجاع تاريخ الدردشة لجلسة معينة
# ------------------------------------------------------
@router.get("/history", response_model=List[schemas.MessageOut])
def get_history(
    session_id: str = Query(..., description="معرّف الجلسة"),
    project_id: Optional[int] = Query(None, description="رقم المشروع (اختياري)"),
    db: Session = Depends(get_db),
):
    """
    إرجاع جميع الرسائل المخزّنة لجلسة معيّنة (ويمكن تقييدها بمشروع).
    """
    q = db.query(models.Message).filter(models.Message.session_id == session_id)

    if project_id is not None:
        q = q.filter(models.Message.project_id == project_id)

    msgs = q.order_by(models.Message.id.asc()).all()
    return msgs


# ------------------------------------------------------
# 3) الحصول على رد الدردشة
#    أولوية:
#      أ) إذا يوجد تحليل محفوظ للمشروع → نرجعه مباشرة.
#      ب) إذا لا يوجد تحليل → نستدعي OpenAI بالأسلوب القديم.
# ------------------------------------------------------
@router.post("/reply", response_model=schemas.MessageOut)
def chat_reply(
    chat: schemas.ChatRequest,
    db: Session = Depends(get_db),
):
    """
    • إذا كان هناك تحليل محفوظ (role='analysis') لنفس المشروع → نرجع آخر تحليل.
    • إذا لا يوجد تحليل محفوظ → نستدعي OpenAI باستخدام تاريخ الجلسة.
    """
    user_id = 1

    # 1) إذا حدّد المستخدم project_id نحاول نجيب آخر تحليل لهذا المشروع
    analysis_message: Optional[models.Message] = None
    if chat.project_id is not None:
        analysis_message = (
            db.query(models.Message)
            .filter(
                models.Message.project_id == chat.project_id,
                models.Message.role == "analysis",
            )
            .order_by(models.Message.id.desc())
            .first()
        )

    # إذا وجدنا تحليل محفوظ → نرجعه كجواب الدردشة بدون استدعاء OpenAI
    if analysis_message is not None:
        answer_text = (
            "هذا هو آخر تحليل محفوظ لهذا المشروع:\n\n"
            f"{analysis_message.content}"
        )

        db_reply = models.Message(
            user_id=user_id,
            project_id=chat.project_id,
            session_id=chat.session_id,
            role="assistant",
            content=answer_text,
        )
        db.add(db_reply)
        db.commit()
        db.refresh(db_reply)
        return db_reply

    # 2) لا يوجد تحليل محفوظ → نرجع لسلوك OpenAI القديم
    #    نبني التاريخ من messages حسب session_id
    history: List[models.Message] = (
        db.query(models.Message)
        .filter(models.Message.session_id == chat.session_id)
        .order_by(models.Message.id.asc())
        .all()
    )

    messages_payload = [
        {"role": msg.role if msg.role in ("user", "assistant", "system") else "user",
         "content": msg.content}
        for msg in history
    ]
    # إضافة رسالة المستخدم الحالية
    messages_payload.append({"role": "user", "content": chat.content})

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
