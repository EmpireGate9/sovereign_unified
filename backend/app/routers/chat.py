from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from openai import OpenAI

from app.database import get_db
from app import models, schemas

# ملاحظة مهمّة:
# لا نضع /api أو /chat هنا لأن main.py يضيف prefix="/chat"
router = APIRouter(tags=["chat"])

client = OpenAI()

SYSTEM_PROMPT = """
أنت مساعد تحليلي داخل منصة «Sovereign / PAI-6 — لوحة سيادية».

- المستخدم يعمل عادةً داخل مشروع له رقم (project_id)، ويمكنه رفع ملفات إلى هذا المشروع.
- يوجد في المنصة تبويب للملفات يحتوي زر «تحليل ومعالجة» لكل ملف؛ هذا الزر يستدعي نماذج الذكاء الاصطناعي
  لتحليل الملف وتخزين ملخص التحليل في قاعدة البيانات كسجل مرتبط بالمشروع/الجلسة.
- أنت لا تقرأ الملفات الخام مباشرة، لكن يمكنك الاعتماد على:
  • رسائل المستخدم السابقة في نفس الجلسة (session_id).
  • أي ملخصات أو تحليلات موجودة كسجلات سابقة في نفس الجلسة/المشروع.

عند أسئلة من نوع:
  «حلل الملف في المشروع 1»، «ما هي نتيجة تحليل ملف المخططات؟» إلخ:
  - إذا وجدت في السجل تحليلات أو أوصافاً للملفات، استخدمها وقدّم إجابة مرتبة،
    وركّز على:
      • ما الذي يصفه الملف؟
      • أهم النقاط أو المشاكل أو المخاطر.
      • توصيات عملية للمستخدم.
  - إذا لم تجد أي تحليل في السجل:
      • لا تقل أبداً أنك لا تستطيع الوصول للملفات أو المشاريع.
      • بدلاً من ذلك، اشرح للمستخدم باختصار أن عليه:
          1) رفع الملف في تبويب «الملفات» للمشروع المناسب.
          2) الضغط على زر «تحليل ومعالجة».
          3) ثم يمكنه سؤالك عن النتائج أو نسخ جزء من التحليل داخل الدردشة.
      • حاول أن تعطيه أيضاً أفكاراً عن نوع التحليل المفيد لهذا النوع من الملفات
        (مثلاً ملفات عقود، مخططات هندسية، تقارير مالية...).

- أجب دائماً بالعربية الفصحى الواضحة، ويفضّل أن تقسّم الرد إلى فقرات أو نقاط.
- تجنّب العبارات العامة من نوع: «لا يمكنني الوصول إلى ملفاتك» بدون أن تذكر للمستخدم
  خطوات واضحة داخل النظام.
"""


@router.post("/send", response_model=schemas.MessageOut)
def send_message(
    message_in: schemas.MessageCreate,
    db: Session = Depends(get_db),
):
    """
    يخزن رسالة المستخدم فقط (بدون استدعاء OpenAI).
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
    يبني المحادثة من تاريخ الجلسة + SYSTEM_PROMPT،
    يستدعي OpenAI، ثم يخزن رد المساعد.
    """
    user_id = 1  # مؤقتاً

    if not chat.session_id:
        raise HTTPException(status_code=400, detail="session_id is required")

    q = db.query(models.Message).filter(
        models.Message.session_id == chat.session_id
    )
    if chat.project_id is not None:
        q = q.filter(models.Message.project_id == chat.project_id)

    history: List[models.Message] = q.order_by(models.Message.id.asc()).all()

    messages_payload = [{"role": "system", "content": SYSTEM_PROMPT}]

    for msg in history:
        messages_payload.append(
            {
                "role": msg.role if msg.role in ("user", "assistant", "system") else "user",
                "content": msg.content,
            }
        )

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


@router.get("/history", response_model=List[schemas.MessageOut])
def get_history(
    session_id: str = Query(..., description="معرّف الجلسة"),
    project_id: Optional[int] = Query(None, description="اختياري: رقم المشروع"),
    db: Session = Depends(get_db),
):
    """
    يرجع سجل الدردشة لهذه الجلسة (مع إمكانية تضييقه على مشروع).
    """
    q = db.query(models.Message).filter(models.Message.session_id == session_id)
    if project_id is not None:
        q = q.filter(models.Message.project_id == project_id)

    messages = q.order_by(models.Message.id.asc()).all()
    return messages
