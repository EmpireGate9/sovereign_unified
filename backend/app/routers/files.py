# app/routers/files.py
from pathlib import Path
import shutil

from fastapi import APIRouter, UploadFile, File, Form, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from openai import OpenAI

from app.database import get_db
from app import models
from app.deps import get_current_user

router = APIRouter()
client = OpenAI()


# ======== نماذج الطلبات ========

class AnalyzeRequest(BaseModel):
    project_id: int
    file_id: int


# ======== رفع ملف ========

@router.post("/upload")
def upload_file(
    project_id: int = Form(...),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    # التحقق من أن المشروع موجود
    project = db.get(models.Project, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    base_dir = Path("data") / "projects" / str(project_id)
    base_dir.mkdir(parents=True, exist_ok=True)

    dest_path = base_dir / file.filename

    with dest_path.open("wb") as f:
        shutil.copyfileobj(file.file, f)

    size_bytes = dest_path.stat().st_size

    db_file = models.File(
        project_id=project_id,
        filename=file.filename,
        mime_type=file.content_type or "application/octet-stream",
        size=size_bytes,
        storage_path=str(dest_path),
    )
    db.add(db_file)
    db.commit()
    db.refresh(db_file)

    return {
        "ok": True,
        "file_id": db_file.id,
        "project_id": project_id,
        "filename": db_file.filename,
        "size_bytes": size_bytes,
    }


# ======== عرض ملفات مشروع ========

@router.get("/list")
def list_files(
    project_id: int,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    project = db.get(models.Project, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    files = (
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


# ======== تحليل ومعالجة ملف ========

@router.post("/analyze")
def analyze_file(
    body: AnalyzeRequest,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    """
    يستقبل project_id + file_id
    يحلل الملف عبر OpenAI
    ويحفظ نتيجة التحليل في جدول messages
    """

    # التأكد من أن المشروع موجود
    project = db.get(models.Project, body.project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    # التأكد من أن الملف موجود ويتبع نفس المشروع
    file_obj = (
        db.query(models.File)
        .filter(
            models.File.id == body.file_id,
            models.File.project_id == body.project_id,
        )
        .first()
    )
    if not file_obj:
        raise HTTPException(
            status_code=404,
            detail="File not found for this project",
        )

    path = Path(file_obj.storage_path)
    if not path.exists():
        raise HTTPException(status_code=404, detail="Stored file not found")

    # محاولة قراءة الملف كنص
    try:
        content = path.read_text(encoding="utf-8", errors="ignore")
    except Exception:
        content = ""

    if not content.strip():
        content = f"اسم الملف: {file_obj.filename}\nالنوع: {file_obj.mime_type}\n(لم أتمكن من قراءة المحتوى كنص، الرجاء اعتبار أن الملف يحتوي على بيانات مشروع للتحاليل.)"

    # تقطيع المحتوى حتى لا يكون كبيرًا جدًا
    snippet = content[:8000]

    system_msg = (
        "أنت مساعد تحلل ملفات مشاريع هندسية / مقاولات / ملفات عمل. "
        "قدّم ملخصًا منظمًا، نقاط رئيسية، ملاحظات، ومخاطر محتملة، "
        "وتوصيات عملية. الرد يكون بالعربية."
    )

    try:
        completion = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": system_msg},
                {
                    "role": "user",
                    "content": f"حلل هذا الملف كمستند مشروع:\n\n{snippet}",
                },
            ],
        )
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"OpenAI error: {exc}",
        )

    analysis_text = completion.choices[0].message.content

    # حفظ نتيجة التحليل في جدول messages
    analysis_message = models.Message(
        user_id=getattr(user, "id", None) if user else None,
        project_id=body.project_id,
        session_id=None,
        role="analysis",
        content=analysis_text,
    )
    db.add(analysis_message)
    db.commit()
    db.refresh(analysis_message)

    return {
        "ok": True,
        "project_id": body.project_id,
        "file_id": body.file_id,
        "analysis_message_id": analysis_message.id,
        "analysis": analysis_text,
    }
