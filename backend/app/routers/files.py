from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException
from sqlalchemy.orm import Session
from uuid import uuid4
import os

from app.database import get_db
from app import models
from app.deps import get_current_user  # نفس الديبندنسي المستخدم في المشاريع

router = APIRouter(prefix="/api/files", tags=["files"])

# مجلد التخزين المحلي
UPLOAD_ROOT = "uploaded_files"
os.makedirs(UPLOAD_ROOT, exist_ok=True)


@router.post("/upload")
async def upload_file(
    project_id: int = Form(...),
    f: UploadFile = File(...),
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    """
    رفع ملف لمشروع معيّن يخص المستخدم الحالي.
    """
    # التحقق أن المشروع موجود ويتبع هذا المستخدم
    project = (
        db.query(models.Project)
        .filter(
            models.Project.id == project_id,
            models.Project.owner_id == user.id,
        )
        .first()
    )
    if not project:
        raise HTTPException(
            status_code=400,
            detail="لا يوجد مشروع بهذا الرقم تابع لهذا الحساب.",
        )

    # حفظ الملف على القرص
    contents = await f.read()
    unique_name = f"{uuid4().hex}_{f.filename}"
    storage_path = os.path.join(UPLOAD_ROOT, unique_name)

    with open(storage_path, "wb") as out:
        out.write(contents)

    # إنشاء سجل في قاعدة البيانات
    db_file = models.File(
        project_id=project.id,
        filename=f.filename,
        mime_type=f.content_type or "application/octet-stream",
        size=len(contents),
        storage_path=storage_path,
    )
    db.add(db_file)
    db.commit()
    db.refresh(db_file)

    return {
        "ok": True,
        "file_id": db_file.id,
        "project_id": project.id,
        "filename": db_file.filename,
        "size_bytes": db_file.size,
    }


@router.get("/list")
def list_files(
    project_id: int,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    """
    عرض ملفات مشروع معيّن (فقط إذا كان يتبع المستخدم الحالي).
    """
    project = (
        db.query(models.Project)
        .filter(
            models.Project.id == project_id,
            models.Project.owner_id == user.id,
        )
        .first()
    )
    if not project:
        raise HTTPException(
            status_code=400,
            detail="لا يوجد مشروع بهذا الرقم تابع لهذا الحساب.",
        )

    files = (
        db.query(models.File)
        .filter(models.File.project_id == project_id)
        .order_by(models.File.id.asc())
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
