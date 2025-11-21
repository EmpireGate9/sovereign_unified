from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import or_
from openai import OpenAI

from app import models, schemas
from app.database import get_db

# ملاحظة مهمة:
# لا نضع أي prefix هنا. المسار النهائي سيكون:
# /api (من main) + /chat (من include_router في main) + /send (من هذا الملف)
router = APIRouter(tags=["chat"])

# يعتمد على OPENAI_API_KEY من متغيرات البيئة
client = OpenAI()


# =========================
# 1) تخزين رسالة المستخدم فقط
# =========================
@router.post("/send", response_model=schemas.MessageOut)
def send_message(
    message_in: schemas.MessageCreate,
    db: Session = Depends(get_db),
):
    """
    يحفظ رسالة المستخدم في جدول messages.
    (حالياً نثبت user_id = 1 إلى أن نربطه بنظام الدخول فعلياً)
    """
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


# =========================
# 2) رد المساعد مع استخدام التحليل المخزَّن
# =========================
@router.post("/reply", response_model=schemas.MessageOut)
def chat_reply(
    chat: schemas.ChatRequest,
    db: Session = Depends(get_db),
):
    """
    - يقرأ تاريخ الدردشة للجلسة / المشروع.
    - يبحث عن أحدث تحليل ملف محفوظ لهذا المشروع (رسالة assistant تبدأ بـ "[تحليل الملف:").
    - يحقن هذا التحليل في سياق OpenAI.
    - يحفظ رد المساعد في جدول messages.
    """
    user_id = 1

    # تاريخ المحادثة (لنفس الجلسة، ونفس المشروع لو محدد)
    q = db.query(models.Message)

    if chat.session_id:
        q = q.filter(models.Message.session_id == chat.session_id)

    if chat.project_id is not None:
        # نسمح برسائل بنفس المشروع أو بدون مشروع (عامّة)
        q = q.filter(
            or_(
                models.Message.project_id == chat.project_id,
                models.Message.project_id.is_(None),
            )
        )

    history: List[models.Message] = q.order_by(models.Message.id.asc()).all()

    messages_payload: List[dict] = []

    # برومبت يشرح وجود تحليلات ملفات مخزنة
    system_msg = (
        "أنت مساعد ذكي داخل منصة لإدارة وتحليل المشاريع الهندسية. "
        "سيصلك أحياناً نصوص تبدأ بـ '[تحليل الملف:' وهي تحليلات ملفات تم توليدها وحفظها مسبقاً. "
        "عندما يسألك المستخدم عن ملخص التحليل أو عن تفاصيله أو عن توصيات مبنية عليه، "
        "اعتمد أولاً على تلك التحليلات المخزنة للإجابة (تلخيص، توضيح، استخراج نقاط مهمة، اقتراح قرارات، إلخ). "
        "إن لم يوجد أي تحليل محفوظ مناسب، اشرح للمستخدم أن عليه رفع ملف من تبويب 'الملفات' ثم الضغط على زر 'تحليل ومعالجة'."
    )
    messages_payload.append({"role": "system", "content": system_msg})

    # نضيف تاريخ المحادثة (user / assistant)
    for msg in history:
        role = "assistant" if msg.role == "assistant" else "user"
        messages_payload.append({"role": role, "content": msg.content})

    # جلب آخر تحليل محفوظ لهذا المشروع إن وُجد
    last_analysis: Optional[models.Message] = None
    if chat.project_id is not None:
        last_analysis = (
            db.query(models.Message)
            .filter(
                models.Message.project_id == chat.project_id,
                models.Message.role == "assistant",
                models.Message.content.like("[تحليل الملف:%"),
            )
            .order_by(models.Message.created_at.desc())
            .first()
        )

    if last_analysis:
        messages_payload.append(
            {
                "role": "assistant",
                "content": (
                    "هذا هو أحدث تحليل محفوظ لأحد الملفات ضمن هذا المشروع:\n\n"
                    f"{last_analysis.content}"
                ),
            }
        )

    # رسالة المستخدم الحالية
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

    # حفظ رد المساعد في قاعدة البيانات
    db_message = models.Message(
        user_id=user_id,
        project_id=chat.project_id,
        session_id=chat.session_id,
        role="assistant",
        content=assistant_reply,
    )
    db.add(db_message);
    db.commit()
    db.refresh(db_message)
    return db_message


# =========================
# 3) جلب السجل (مع تضمين تحليلات الملف)
# =========================
@router.get("/history", response_model=List[schemas.MessageOut])
def get_history(
    session_id: Optional[str] = None,
    project_id: Optional[int] = None,
    db: Session = Depends(get_db),
):
    """
    يعيد سجل الدردشة للجلسة المحددة + أي رسائل تحليل ملفات
    تابعة لنفس المشروع (حتى لو session_id = NULL).
    بدون session_id وبدون project_id لا نرجّع شيء.
    """
    q = db.query(models.Message)
    conditions = []

    if session_id:
        conditions.append(models.Message.session_id == session_id)

    if project_id is not None:
        conditions.append(models.Message.project_id == project_id)

    if conditions:
        q = q.filter(or_(*conditions))
    else:
        return []

    messages = q.order_by(models.Message.id.asc()).all()

    return [
      schemas.MessageOut(
          id=m.id,
          role=m.role,
          content=m.content,
          created_at=m.created_at,
      )
      for m in messages
    ]
