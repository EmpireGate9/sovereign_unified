# backend/app/routers/analysis.py

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from openai import OpenAI

from app.database import get_db
from app import models

router = APIRouter(prefix="/analysis", tags=["analysis"])

client = OpenAI()  # يستخدم OPENAI_API_KEY من متغيرات البيئة


class AnalyzeRequest(BaseModel):
    project_id: int
    file_id: int


@router.post("/analyze-file")
def analyze_file(body: AnalyzeRequest, db: Session = Depends(get_db)):
    """
    - يتأكد من وجود المشروع والملف.
    - يقرأ محتوى الملف من المسار المخزون في database.
    - يرسل مقتطف إلى OpenAI لتحليل المحتوى.
    - يحفظ نتيجة التحليل في جدول messages (role='assistant').
    - يرجع نص التحليل للواجهة.
    """

    # 1) التحقق من المشروع
    project = db.query(models.Project).filter(models.Project.id == body.project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    # 2) التحقق من الملف وارتباطه بالمشروع
    file_obj = (
        db.query(models.File)
        .filter(models.File.id == body.file_id, models.File.project_id == body.project_id)
        .first()
    )
    if not file_obj:
        raise HTTPException(status_code=404, detail="File not found for this project")

    # 3) قراءة محتوى الملف من المسار
    try:
        with open(file_obj.storage_path, "rb") as f:
            raw = f.read()
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="Stored file is missing on server")

    # نحاول تفسيره كنص، وإذا لم ينجح نأخذ مقتطفاً بسيطاً بصيغة bytes
    try:
        text_content = raw.decode("utf-8", errors="ignore")
    except Exception:
        text_content = str(raw[:2000])

    # نحد من الطول حتى لا يكون الطلب ضخم جداً
    snippet = text_content[:4000].strip() or "[ملف فارغ أو غير نصي بشكل واضح]"

    # 4) استدعاء OpenAI لتحليل الملف
    prompt_system = (
        "أنت مهندس/محلل مشاريع هندسية. "
        "يصلك محتوى ملف يخص مشروع (عقود، تقارير، مخططات موصوفة كتابةً، جداول كميات، إلخ). "
        "قدّم تحليلًا مختصرًا ومنظماً يشمل:\n"
        "- ملخص واضح للمحتوى.\n"
        "- النقاط أو البنود المهمة.\n"
        "- أي مخاطر أو ملاحظات يجب الانتباه لها.\n"
        "- توصيات عملية (إن وجدت).\n"
        "اكتب الإجابة بالعربية الفصحى وبشكل منسق في نقاط أو فقرات قصيرة."
    )

    prompt_user = (
        f"هذا مقتطف من ملف تابع لمشروع رقم {body.project_id}، "
        f"واسم الملف: {file_obj.filename}.\n\n"
        f"محتوى الملف (مقتطف):\n\n{snippet}"
    )

    try:
        completion = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": prompt_system},
                {"role": "user", "content": prompt_user},
            ],
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"OpenAI error: {exc}")

    analysis_text = completion.choices[0].message.content

    # 5) تخزين التحليل في جدول messages لربطه بالمشروع
    msg = models.Message(
        user_id=None,  # يمكن ربطه بالمستخدم لاحقاً
        project_id=body.project_id,
        session_id=None,
        role="assistant",
        content=analysis_text,
    )
    db.add(msg)
    db.commit()
    db.refresh(msg)

    # 6) إرجاع نتيجة التحليل للواجهة
    return {
        "ok": True,
        "project_id": body.project_id,
        "file_id": body.file_id,
        "message_id": msg.id,
        "analysis": analysis_text,
            }
