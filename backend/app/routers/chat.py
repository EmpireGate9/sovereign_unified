from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from openai import OpenAI

from app.database import get_db
from app import models, schemas

# مهم: لا نضع prefix هنا، لأن main.py يضيف prefix="/chat"
router = APIRouter(tags=["chat"])

client = OpenAI()

SYSTEM_PROMPT = """
أنت مساعد تحليلي داخل منصة «Sovereign / PAI-6 — لوحة سيادية».

- المستخدم يعمل داخل مشاريع لها أرقام (project_id)، ويمكنه رفع ملفات لكل مشروع.
- يوجد في المنصة تبويب للملفات يحتوي زر «تحليل ومعالجة» لكل ملف؛ هذا الزر يستدعي نماذج الذكاء الاصطناعي
  لتحليل الملف وتخزين ملخص التحليل في قاعدة البيانات كسجل مرتبط بالمشروع.

- لديك الأنواع التالية من المعلومات:
  1) رسائل الدردشة في هذه الجلسة (session_id).
  2) رسائل تحليل محفوظة مرتبطة بالمشروع (project_id)؛
     هذه الرسائل يكون محتواها عادة بصيغة مثل:
     "[تحليل الملف: اسم_الملف] ... النص التحليلي ..."

- عند أسئلة من نوع:
    «حلّل الملف في المشروع 1»،
    «ما هي نتيجة تحليل ملف المخططات؟»،
    «لخّص لي ما فهمته عن مشروع 3 من الملفات»:
    * ابحث ذهنياً في النصوص التحليلية المحفوظة (المضمنة في سياق المحادثة)
      واستخرج منها ما يخص المشروع، ثم:
        - قدّم وصفاً عاماً للمشروع كما يظهر من التحليلات.
        - استخرج النقاط المهمة والأرقام والكميات إن وُجدت.
        - وضّح المخاطر أو الملاحظات.
        - أعطِ توصيات عملية.

- إذا لم تجد أي تحليل واضح في النصوص المتاحة:
    * لا تقل "لا أستطيع الوصول إلى الملفات" بشكل مجرد.
    * بدلاً من ذلك، اشرح للمستخدم باختصار أن عليه:
        1) رفع الملف في تبويب «الملفات» للمشروع المناسب.
        2) الضغط على زر «تحليل ومعالجة».
        3) ثم سؤالك هنا عن النتائج أو لصق جزء من التحليل في الدردشة.
    * وحاول إعطاء أفكار عن نوع التحليل المفيد لهذا النوع من الملفات
      (عقود، مخططات هندسية، تقارير مالية، تقارير فحوصات، إلخ).

- أجب دائماً بالعربية الفصحى الواضحة، ويفضّل تقسيم الرد إلى نقاط أو فقرات.
"""


# =========================
# 1) تخزين رسالة المستخدم فقط
# =========================
@router.post("/send", response_model=schemas.MessageOut)
def send_message(
    message_in: schemas.MessageCreate,
    db: Session = Depends(get_db),
):
    """
    يخزن رسالة المستخدم في قاعدة البيانات (بدون استدعاء OpenAI).
    """
    user_id = 1  # مؤقتاً حتى ربطه بنظام الدخول

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
# 2) طلب رد من الذكاء الاصطناعي
# =========================
@router.post("/reply", response_model=schemas.MessageOut)
def chat_reply(
    chat: schemas.ChatRequest,
    db: Session = Depends(get_db),
):
    """
    يبني المحادثة من:
      - SYSTEM_PROMPT
      - تحليلات/رسائل المشروع (إن وجدت)
      - تاريخ الجلسة الحالية
      - رسالة المستخدم الجديدة

    ثم يستدعي OpenAI ويخزن رد المساعد.
    """
    user_id = 1  # مؤقتاً

    if not chat.session_id:
        raise HTTPException(status_code=400, detail="session_id is required")

    # --------- أ) جلب تحليلات المشروع (messages مرتبطة بالمشروع) ---------
    project_messages: List[models.Message] = []
    if chat.project_id is not None:
        project_messages = (
            db.query(models.Message)
            .filter(models.Message.project_id == chat.project_id)
            .order_by(models.Message.id.asc())
            .all()
        )

    # --------- ب) جلب تاريخ الجلسة الحالية ---------
    q = db.query(models.Message).filter(
        models.Message.session_id == chat.session_id
    )
    if chat.project_id is not None:
        q = q.filter(models.Message.project_id == chat.project_id)

    history: List[models.Message] = q.order_by(models.Message.id.asc()).all()

    # --------- ج) بناء الـ payload للموديل ---------
    messages_payload = [{"role": "system", "content": SYSTEM_PROMPT}]

    # أولاً: نضيف تحليلات المشروع كـ "معلومات سياقية"
    for msg in project_messages:
        # نعتبر كل ما هو role="assistant" أو system سياق مساعد
        role = "assistant" if msg.role in ("assistant", "system") else "user"
        messages_payload.append(
            {
                "role": role,
                "content": f"(سجل محفوظ للمشروع {chat.project_id}):\n{msg.content}",
            }
        )

    # ثانياً: نضيف تاريخ الجلسة الحالية
    for msg in history:
        role = msg.role if msg.role in ("user", "assistant", "system") else "user"
        messages_payload.append(
            {
                "role": role,
                "content": msg.content,
            }
        )

    # ثالثاً: نضيف رسالة المستخدم الحالية
    messages_payload.append({"role": "user", "content": chat.content})

    # --------- د) استدعاء OpenAI ---------
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

    # --------- هـ) تخزين رد المساعد ---------
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


# =========================
# 3) إرجاع سجل الدردشة
# =========================
@router.get("/history", response_model=List[schemas.MessageOut])
def get_history(
    session_id: str = Query(..., description="معرّف الجلسة"),
    project_id: Optional[int] = Query(None, description="اختياري: رقم المشروع"),
    db: Session = Depends(get_db),
):
    """
    يرجع كل الرسائل في هذه الجلسة (مع إمكانية تضييقها على مشروع معيّن).
    يستخدمه الفرونت لعرض السجل في تبويب الدردشة.
    """
    q = db.query(models.Message).filter(models.Message.session_id == session_id)
    if project_id is not None:
        q = q.filter(models.Message.project_id == project_id)

    messages = q.order_by(models.Message.id.asc()).all()
    return messages
