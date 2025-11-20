# app/routers/files.py

import os
from typing import List

from fastapi import APIRouter, Depends, UploadFile, File as FastFile, Form, HTTPException
from sqlalchemy.orm import Session
from openai import OpenAI

from app.database import get_db
from app import models
from app.deps import get_current_user, CurrentUser

router = APIRouter()

STORAGE_ROOT = "storage"
client = OpenAI()  # يستخدم OPENAI_API_KEY من متغيرات البيئة


# =========================
# رفع ملف لمشروع
# =========================
@router.post("/upload")
def upload_file(
    project_id: int = Form(...),
    file: UploadFile = FastFile(...),
    db: Session = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
):
    # تأكيد أن المشروع موجود ومملوك للمستخدم الحالي
    project = (
        db.query(models.Project)
        .filter(
            models.Project.id == project_id,
            models.Project.owner_id == user.id,
        )
        .first()
    )
    if not project:
        raise HTTPException(status_code=404, detail="Project not found or not owned by user")

    os.makedirs(STORAGE_ROOT, exist_ok=True)
    proj_dir = os.path.join(STORAGE_ROOT, f"project_{project_id}")
    os.makedirs(proj_dir, exist_ok=True)

    dest_path = os.path.join(proj_dir, file.filename)

    # حفظ الملف على القرص
    with open(dest_path, "wb") as f:
        f.write(file.file.read())

    size = os.path.getsize(dest_path)

    db_file = models.File(
        project_id=project_id,
        filename=file.filename,
        mime_type=file.content_type or "application/octet-stream",
        size=size,
        storage_path=dest_path,
    )
    db.add(db_file)
    db.commit()
    db.refresh(db_file)

    return {
        "ok": True,
        "file_id": db_file.id,
        "project_id": project_id,
        "filename": db_file.filename,
        "size_bytes": db_file.size,
        "created_at": db_file.created_at,
    }


# =========================
# عرض ملفات مشروع
# =========================
@router.get("/list")
def list_files(
    project_id: int,
    db: Session = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
):
    # تأكيد ملكية المشروع
    project = (
        db.query(models.Project)
        .filter(
            models.Project.id == project_id,
            models.Project.owner_id == user.id,
        )
        .first()
    )
    if not project:
        raise HTTPException(status_code=404, detail="Project not found or not owned by user")

    files: List[models.File] = (
        db.query(models.File)
        .filter(models.File.project_id == project_id)
        .order_by(models.File.created_at.desc())
        .all()
    )

    return [
        {
            "id": f.id,
            "filename": f.filename,
            "mime_type": f.mime_type,
            "size_bytes": f.size,
            "created_at": f.created_at.isoformat() if f.created_at else None,
        }
        for f in files
    ]


# =========================
# تحليل ومعالجة ملف واحد بالذكاء الاصطناعي
# =========================
@router.post("/analyze")
def analyze_file(
    payload: dict,
    db: Session = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
):
    """
    يستقبل:
      { "file_id": 123 }

    يقوم بـ:
      - التأكد أن الملف تابع لمشروع يملكه المستخدم
      - قراءة محتوى الملف (للنصوص حالياً)
      - استدعاء OpenAI لتحليل الملف
      - تخزين نتيجة التحليل كرسالة في جدول messages
      - إعادة نص التحليل للواجهة
    """
    file_id = payload.get("file_id")
    if not file_id:
        raise HTTPException(status_code=422, detail="file_id مفقود")

    # جلب الملف + المشروع + التأكد من الملكية
    file_obj = (
        db.query(models.File)
        .join(models.Project, models.File.project_id == models.Project.id)
        .filter(
            models.File.id == file_id,
            models.Project.owner_id == user.id,
        )
        .first()
    )
    if not file_obj:
        raise HTTPException(status_code=404, detail="File not found or not owned by user")

    # قراءة محتوى الملف من التخزين
    if not os.path.exists(file_obj.storage_path):
        raise HTTPException(status_code=404, detail="Stored file not found on disk")

    try:
        # نحاول اعتباره نصي (UTF-8)، وإذا فشل نكتفي بجزء محدود
        with open(file_obj.storage_path, "rb") as f:
            raw = f.read()

        # نحدد حد أقصى للحجم حتى لا نرسل ملفات ضخمة جداً للنموذج
        MAX_BYTES = 200_000  # تقريباً 200KB
        raw = raw[:MAX_BYTES]

        try:
            content_text = raw.decode("utf-8", errors="ignore")
        except Exception:
            content_text = ""
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to read file: {exc}")

    if not content_text.strip():
        # نوع الملف غير نصي (صورة، PDF معقد، DWG...) — نكتب رد مبدئي
        ai_text = (
            "تم رفع ملف لا يمكن قراءته كنص (مثل صورة أو مخطط CAD أو ملف ثنائي). "
            "يمكن مستقبلاً ربط المنصة بمحرك رؤية حاسوبية أو محلّل ملفات هندسية متقدم لمعالجة هذا النوع."
        )
    else:
        # استدعاء OpenAI لتحليل المحتوى النصي
        prompt = f"""
أنت مساعد تحليلي لمشاريع هندسية وتشغيلية.

ملف مرفوع للمشروع:
- اسم الملف: {file_obj.filename}
- نوع الملف (MIME): {file_obj.mime_type}
- حجم تقريبي: {file_obj.size} بايت

مقتطف من محتوى الملف (تم قصّه إذا كان طويلاً):

----------------- بداية المحتوى -----------------
{content_text}
------------------ نهاية المحتوى ------------------

المطلوب:
- قدّم ملخصاً منظماً لما يحتويه الملف.
- استخرج أي بيانات أو كميات أو معلومات هندسية أو إدارية مهمة إن وجدت.
- اذكر أي مخاطر أو نقاط حرجة تحتاج انتباه.
- اقترح كيف يمكن الاستفادة من هذا الملف في تقدير الكميات أو التكلفة أو الزمن أو جودة التنفيذ.

اكتب الرد بالعربية الواضحة، على شكل نقاط وعناوين فرعية قدر الإمكان.
"""
        try:
            completion = client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[{"role": "user", "content": prompt}],
            )
            ai_text = completion.choices[0].message.content
        except Exception as exc:
            raise HTTPException(status_code=500, detail=f"OpenAI error: {exc}")

    # تخزين نتيجة التحليل في جدول messages
    db_msg = models.Message(
        user_id=user.id,
        project_id=file_obj.project_id,
        session_id=f"file-{file_obj.id}",
        role="assistant",
        content=ai_text,
    )
    db.add(db_msg)
    db.commit()
    db.refresh(db_msg)

    return {
        "ok": True,
        "file_id": file_obj.id,
        "project_id": file_obj.project_id,
        "analysis_message_id": db_msg.id,
        "analysis": ai_text,
    }
