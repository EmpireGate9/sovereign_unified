from fastapi import APIRouter, Depends, UploadFile, File, HTTPException, Form
from sqlalchemy.orm import Session
from typing import List
import os
from uuid import uuid4

from openai import OpenAI

from app.database import get_db
from app import models
from app.deps import get_current_user

router = APIRouter(prefix="/api/files", tags=["files"])

client = OpenAI()
UPLOAD_ROOT = "uploads"


def _ensure_upload_root():
    os.makedirs(UPLOAD_ROOT, exist_ok=True)


# =========================
# 1) رفع ملف وربطه بمشروع (بدون تعقيد)
# =========================
@router.post("/upload")
async def upload_file(
    project_id: int = Form(...),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    """
    رفع ملف وربطه برقم مشروع معيّن.
    لا نتحقق هنا من وجود المشروع في جدول projects لتفادي 404،
    نستخدم project_id كما هو، مثلما كان يعمل سابقًا.
    """
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required")

    _ensure_upload_root()

    safe_name = f"{uuid4().hex}_{file.filename}"
    disk_path = os.path.join(UPLOAD_ROOT, safe_name)

    contents = await file.read()
    with open(disk_path, "wb") as f:
        f.write(contents)

    size_bytes = len(contents)

    db_file = models.File(
        project_id=project_id,
        filename=file.filename,
        mime_type=file.content_type or "application/octet-stream",
        size=size_bytes,
        storage_path=disk_path,
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
    }


# =========================
# 2) عرض ملفات مشروع معيّن
# =========================
@router.get("/list")
def list_files(
    project_id: int,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    """
    إرجاع قائمة الملفات المرتبطة برقم project_id معيّن.
    لا نتحقق من جدول projects، فقط نقرأ من جدول files.
    """
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required")

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
            "created_at": f.created_at,
        }
        for f in files
    ]


# =========================
# 3) تحليل ومعالجة ملف
# =========================
from pydantic import BaseModel


class AnalyzeInput(BaseModel):
    project_id: int
    file_id: int


@router.post("/analyze")
def analyze_file(
    body: AnalyzeInput,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    """
    تحليل ملف باستخدام OpenAI وتخزين النتيجة في جدول messages
    كرسالة (assistant) مرتبطة بالمشروع.
    نعتمد على project_id المخزَّن في السجل نفسه.
    """
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required")

    # نجلب الملف فقط، ونتأكد أنه يطابق project_id القادم من الواجهة
    db_file = (
        db.query(models.File)
        .filter(
            models.File.id == body.file_id,
            models.File.project_id == body.project_id,
        )
        .first()
    )
    if not db_file:
        raise HTTPException(status_code=404, detail="File not found")

    project_id = db_file.project_id

    # قراءة محتوى الملف من التخزين
    try:
        with open(db_file.storage_path, "rb") as f:
            raw = f.read()
    except Exception:
        raise HTTPException(status_code=500, detail="Failed to read stored file")

    try:
        file_text = raw.decode("utf-8", errors="ignore")
    except Exception:
        file_text = (
            f"File name: {db_file.filename}, "
            f"MIME: {db_file.mime_type}, "
            f"size: {db_file.size}"
        )

    # برومبت التحليل
    system_msg = (
        "أنت مساعد تحليلي داخل منصة إدارة مشاريع هندسية وتجارية. "
        "المطلوب: تحليل محتوى الملف التالي وإرجاع ملخص منظم يشمل: "
        "1) وصف عام، 2) النقاط المهمة، 3) الأرقام أو الكميات البارزة إن وجدت، "
        "4) المخاطر أو الملاحظات، 5) توصيات عملية قصيرة."
    )

    messages_payload = [
        {"role": "system", "content": system_msg},
        {
            "role": "user",
            "content": f"هذا محتوى الملف المرتبط بالمشروع رقم {project_id}:\n\n{file_text[:12000]}",
        },
    ]

    # استدعاء OpenAI
    try:
        completion = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=messages_payload,
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"OpenAI error: {exc}")

    analysis_text = completion.choices[0].message.content

    # تخزين التحليل في messages
    analysis_message = models.Message(
        user_id=user.id,
        project_id=project_id,
        session_id=None,  # ممكن لاحقاً ربطه بجلسة
        role="assistant",
        content
