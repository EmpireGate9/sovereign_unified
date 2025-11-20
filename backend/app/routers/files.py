# backend/app/routers/files.py

from pathlib import Path
import uuid

from fastapi import APIRouter, UploadFile, File as FAFile, Form, Depends, HTTPException, status
from sqlalchemy.orm import Session
from openai import OpenAI

from app.database import get_db
from app import models
from app.deps import get_current_user

# مهم: لا نضع prefix هنا، الـ main.py يضيف "/files"
router = APIRouter(tags=["files"])

client = OpenAI()

UPLOAD_ROOT = Path("uploaded_files")
UPLOAD_ROOT.mkdir(parents=True, exist_ok=True)


# ========= رفع ملف =========
@router.post("/upload")
async def upload_file(
    project_id: int = Form(...),
    f: UploadFile = FAFile(...),
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    """
    رفع ملف وربطه بمشروع معيّن.
    - يتحقق أولاً أن المشروع يخص هذا المستخدم.
    - يخزّن الملف على القرص.
    - يسجّل بيانات الملف في جدول files.
    """
    # تحقق من وجود المشروع وملكيته
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
            status_code=status.HTTP_404_NOT_FOUND,
            detail="المشروع غير موجود أو لا تملك صلاحية عليه",
        )

    if not f.filename:
        raise HTTPException(status_code=400, detail="لم يتم استلام ملف صالح")

    # مسار التخزين: uploaded_files/<project_id>/
    proj_dir = UPLOAD_ROOT / str(project_id)
    proj_dir.mkdir(parents=True, exist_ok=True)

    unique_name = f"{uuid.uuid4().hex}_{f.filename}"
    dest_path = proj_dir / unique_name

    content = await f.read()
    dest_path.write_bytes(content)

    size_bytes = dest_path.stat().st_size

    # حفظ في قاعدة البيانات
    db_file = models.File(
        project_id=project_id,
        filename=f.filename,
        mime_type=f.content_type or "application/octet-stream",
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
        "size_bytes": db_file.size,
    }


# ========= قائمة الملفات لمشروع =========
@router.get("/list")
def list_files(
    project_id: int,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    """
    إرجاع قائمة الملفات لمشروع معيّن يملكه المستخدم.
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
            status_code=status.HTTP_404_NOT_FOUND,
            detail="المشروع غير موجود أو لا تملك صلاحية عليه",
        )

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
            "size_bytes": f.size,
            "created_at": f.created_at.isoformat() if f.created_at else None,
        }
        for f in files
    ]


# ========= زر "تحليل ومعالجة" =========
@router.post("/{file_id}/analyze")
def analyze_file(
    file_id: int,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    """
    تحليل ومعالجة ملف معيّن:
    - يتأكد أن الملف تابع لمشروع يملكه المستخدم.
    - يقرأ محتوى الملف من المسار storage_path.
    - يرسل ملخص محتوى (نصي) لنموذج OpenAI.
    - يحفظ نتيجة التحليل في جدول file_analysis.
    - يرجع نص التحليل للمستخدم بدون ذكر AI.
    """
    # جلب الملف مع التحقق من ملكية المشروع
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
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="الملف غير موجود أو لا تملك صلاحية عليه",
        )

    file_path = Path(file_obj.storage_path)
    if not file_path.exists():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="الملف غير موجود على الخادم",
        )

    # قراءة المحتوى (كتجربة أولية: نحاول اعتباره نصاً)
    raw_bytes = file_path.read_bytes()
    # محاولة فك الترميز إلى نص (مع تجاهل الأخطاء للملفات الثنائية)
    text_preview = raw_bytes.decode("utf-8", errors="ignore")[:8000]

    # استدعاء التحليل (بدون ذكر AI في النص)
    try:
        completion = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {
                    "role": "system",
                    "content": (
                        "أنت مهندس ومحلّل تقني يساعد في تحليل الملفات "
                        "واستخلاص معلومات مفيدة للمشاريع الهندسية أو الفنية."
                    ),
                },
                {
                    "role": "user",
                    "content": (
                        f"هذا جزء من محتوى ملف مرفوع في مشروع هندسي.\n"
                        f"اسم الملف: {file_obj.filename}\n"
                        f"حجم الملف (بايت): {file_obj.size}\n\n"
                        f"المحتوى النصي المتاح:\n{text_preview}\n\n"
                        "حلّل هذا المحتوى وأعطني:\n"
                        "- ملخّص واضح بالعربية\n"
                        "- النقاط الفنية أو الهندسية المهمة\n"
                        "- أي مخاطر أو ملاحظات\n"
                        "- توصيات عملية إن وُجدت"
                    ),
                },
            ],
        )
        analysis_text = completion.choices[0].message.content
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"خطأ أثناء التحليل: {exc}",
        )

    # حفظ نتيجة التحليل في قاعدة البيانات
    analysis = models.FileAnalysis(
        file_id=file_obj.id,
        project_id=file_obj.project_id,
        result_text=analysis_text,
    )
    db.add(analysis)
    db.commit()

    return {
        "ok": True,
        "file_id": file_obj.id,
        "project_id": file_obj.project_id,
        "filename": file_obj.filename,
        "result": analysis_text,
    }
