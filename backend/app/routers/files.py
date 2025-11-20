from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from uuid import uuid4
import os

from app.database import get_db
from app import models
from app.deps import get_current_user  # نفس دالة المستخدم الحالي

router = APIRouter(tags=["files"])  # لا نضع prefix هنا

# مجلد تخزين الملفات على السيرفر
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
    رفع ملف لمشروع معيّن.
    يتأكد من التوكن (get_current_user) ثم يحفظ الملف ويربطه بالمشروع.
    إذا كان رقم المشروع غير موجود يرجع رسالة عربية واضحة.
    """

    # حفظ الملف على القرص
    contents = await f.read()
    unique_name = f"{uuid4().hex}_{f.filename}"
    storage_path = os.path.join(UPLOAD_ROOT, unique_name)

    with open(storage_path, "wb") as out:
        out.write(contents)

    db_file = models.File(
        project_id=project_id,
        filename=f.filename,
        mime_type=f.content_type or "application/octet-stream",
        size=len(contents),
        storage_path=storage_path,
    )

    try:
        db.add(db_file)
        db.commit()
        db.refresh(db_file)
    except IntegrityError:
        # على الأغلب project_id لا يطابق أي مشروع (مفتاح أجنبي)
        db.rollback()
        if os.path.exists(storage_path):
            os.remove(storage_path)
        raise HTTPException(
            status_code=400,
            detail="لا يوجد مشروع بهذا الرقم. فضلاً تأكد من رقم المشروع.",
        )

    return {
        "ok": True,
        "file_id": db_file.id,
        "project_id": db_file.project_id,
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
    عرض ملفات مشروع معيّن.
    إذا لم توجد ملفات يرجع قائمة فارغة.
    """

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
