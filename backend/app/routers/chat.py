# backend/app/routers/chat.py

from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from openai import OpenAI

from app import models, schemas
from app.database import get_db

# لا نضع prefix هنا، لأن main.py يضمّه تحت prefix="/chat"
# وفي النهاية يصبح المسار: /api/chat/...
router = APIRouter(tags=["chat"])

client = OpenAI()  # يستخدم OPENAI_API_KEY من متغيرات البيئة


@router.post("/send", response_model=schemas.MessageOut)
def send_message(
    message_in: schemas.MessageCreate,
    db: Session = Depends(get_db),
):
    """
    تخزين رسالة المستخدم في جدول messages.
    تُستخدم session_id لربط محادثة المتصفح الواحد،
    و project_id لربط الرسالة بمشروع معيّن (إن وُجد).
    """
    # يمكن لاحقاً ربط user_id بنظام الدخول الحقيقي
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
    - يجلب آخر تحليل محفوظ (رسالة assistant) للمشروع من جدول messages (إن وُجد).
    - يبني سؤال المستخدم + سياق التحليل.
    - يستدعي OpenAI للإجابة.
    - يحفظ رد المساعد في جدول messages ويرجعه.
    """

    user_question = chat.content.strip()
    project_id = chat.project_id

    if not user_question:
        raise HTTPException(status_code=400, detail="Empty question")

    analysis_text: Optional[str] = None

    if project_id is not None:
        last_analysis = (
            db.query(models.Message)
            .filter(
                models.Message.project_id == project_id,
                models.Message.role == "assistant",
            )
            .order_by(models.Message.id.desc())
            .first()
        )
        if last_analysis:
            analysis_text = last_analysis.content

    # بناء الرسائل المرسلة إلى OpenAI
    system_msg = (
        "أنت مساعد هندسي ذكي مرتبط بمنصة تحليل مشاريع.\n"
        "إن توفر لديك تحليل محفوظ للمشروع، استخدمه كأساس للإجابة.\n"
        "أجب بالعربية الفصحى، بإيجاز ووضوح وبنقاط مرتبة عند الحاجة."
    )

    if analysis_text:
        user_msg = (
            f"هذا سؤال من المستخدم حول مشروع هندسي (رقم المشروع: {project_id}).\n"
            f"سؤال المستخدم:\n{user_question}\n\n"
            f"هذا هو آخر تحليل محفوظ لهذا المشروع، استخدمه كأساس للإجابة:\n\n"
            f"{analysis_text}"
        )
    else:
        user_msg = (
            "سؤال من المستخدم حول مشروع أو ملف، "
            "وقد لا يتوفر تحليل محفوظ حالياً. "
            "أجب بما يمكنك استنتاجه من السؤال نفسه:\n\n"
            f"{user_question}"
        )

    try:
        completion = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": system_msg},
                {"role": "user", "content": user_msg},
            ],
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"OpenAI error: {exc}")

    assistant_reply = completion.choices[0].message.content

    # حفظ رد المساعد في قاعدة البيانات
    msg = models.Message(
        user_id=None,
        project_id=project_id,
        session_id=chat.session_id,
        role="assistant",
        content=assistant_reply,
    )
    db.add(msg)
    db.commit()
    db.refresh(msg)

    return msg


@router.get("/history", response_model=List[schemas.MessageOut])
def get_history(
    session_id: str,
    project_id: Optional[int] = None,
    db: Session = Depends(get_db),
):
    """
    إرجاع تاريخ المحادثة (messages) بحسب:
    - session_id (متطلب)
    - project_id (اختياري، لتصفية الرسائل الخاصة بمشروع معيّن)
    النتيجة مرتبة تصاعدياً حسب id (من الأقدم إلى الأحدث).
    """
    q = db.query(models.Message).filter(models.Message.session_id == session_id)

    if project_id is not None:
        q = q.filter(models.Message.project_id == project_id)

    messages = q.order_by(models.Message.id.asc()).all()
    return messages
