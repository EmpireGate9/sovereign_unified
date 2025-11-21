from pathlib import Path
from typing import List

from fastapi import (
    APIRouter,
    Depends,
    UploadFile,
    File,
    Form,
    HTTPException,
)
from sqlalchemy.orm import Session

from app.database import get_db
from app import models
from app.deps import get_current_user

from openai import OpenAI

# ============= إعدادات عامة =============
router = APIRouter()
client = OpenAI()

# مجلد تخزين الملفات على السيرفر
UPLOAD_ROOT = Path("data/uploads")
UPLOAD_ROOT.mkdir(parents=True, exist_ok=True)


# ============= دوال مساعدة داخلية =============
def _ensure_user_project(
    db: Session,
    user_id: int,
    project_id: int,
) -> models.Project:
    """التأكد أن المشروع موجود ويتبع لهذا المستخدم."""
    project = (
        db.query(models.Project)
        .filter(
            models.Project.id == project_id,
            models.Project.owner_id == user_id,
        )
        .first()
    )
    if not project:
        raise HTTPException(
            status_code=404,
            detail="Project not found for this user",
        )
    return project


# ============= رفع ملف =============
@router.post("/upload")
async def upload_file(
    project_id: int = Form(...),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    """
    رفع ملف واحد وربطه بمشروع.
    """
    # تأكد أن المشروع فعلاً يخص هذا المستخدم
    _ensure_user_project(db, user.id, project_id)

    # مجلد المشروع
    project_dir = UPLOAD_ROOT / f"project_{project_id}"
    project_dir.mkdir(parents=True, exist_ok=True)

    # مسار التخزين الفعلي على السيرفر
    storage_path = project_dir / file.filename

    # حفظ الملف على القرص
    data = await file.read()
    size_bytes = len(data)
    with open(storage_path, "wb") as f:
        f.write(data)

    # إنشاء سجل في جدول الملفات
    db_file = models.File(
        project_id=project_id,
        filename=file.filename,
        mime_type=file.content_type or "application/octet-stream",
        size=size_bytes,
        storage_path=str(storage_path),
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


# ============= عرض ملفات مشروع =============
@router.get("/list")
def list_files(
    project_id: int,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    """
    إرجاع قائمة ملفات مشروع معيّن.
    """
    _ensure_user_project(db, user.id, project_id)

    files: List[models.File] = (
        db.query(models.File)
        .filter(models.File.project_id == project_id)
        .order_by(models.File.created_at.asc())
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


# ============= تحليل ومعالجة ملف =============
@router.post("/analyze")
def analyze_file(
    file_id: int = Form(...),
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    """
    تحليل ملف واحد بالذكاء الاصطناعي وتخزين النتيجة في جدول messages
    ثم إرجاع ملخص التحليل.
    """

    # 1) التأكد من أن الملف موجود ويتبع لمشروع لهذا المستخدم
    db_file = (
        db.query(models.File)
        .join(models.Project, models.Project.id == models.File.project_id)
        .filter(
            models.File.id == file_id,
            models.Project.owner_id == user.id,
        )
        .first()
    )

    if not db_file:
        raise HTTPException(
            status_code=404,
            detail="File not found for this user",
        )

    # 2) محاولة قراءة محتوى الملف كنص
    try:
        with open(db_file.storage_path, "r", encoding="utf-8", errors="ignore") as f:
            content = f.read()
    except Exception:
        content = ""

    # 3) بناء برومبت التحليل
    prompt = (
        f"اسم الملف: {db_file.filename}\n"
        f"نوع الملف: {db_file.mime_type}\n\n"
        "حلّل هذا الملف كجزء من مشروع (مقاولات / هندسة / تجاري / طبي / ...).\n"
        "أعطني ملخصاً منظماً بالعربية يتضمن:\n"
        "• وصفاً عاماً لما يحتويه الملف.\n"
        "• أهم النقاط أو البنود أو البيانات.\n"
        "• المخاطر أو الملاحظات التي يجب الانتباه لها.\n"
        "• توصيات عملية يمكن لصاحب المشروع الاستفادة منها.\n"
        "إذا كان النص غير واضح أو الملف ليس نصياً، قدّم تحليلاً تقريبياً بناءً على ما هو متاح."
    )

    messages = [
        {
            "role": "system",
            "content": "أجب بالعربية الفصحى في نقاط مرتبة وسهلة القراءة.",
        },
        {
            "role": "user",
            "content": prompt + "\n\nنص الملف (قد يكون مقطوعاً):\n" + content[:4000],
        },
    ]

    # 4) استدعاء OpenAI
    try:
        completion = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=messages,
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"OpenAI error: {exc}")

    analysis_text = completion.choices[0].message.content

    # 5) تخزين نتيجة التحليل كرسالة مرتبطة بالمشروع
    analysis_message = models.Message(
        user_id=user.id,
        project_id=db_file.project_id,
        session_id=None,
        role="assistant",
        content=f"تحليل الملف «{db_file.filename}»:\n\n{analysis_text}",
    )
    db.add(analysis_message)
    db.commit()
    db.refresh(analysis_message)

    # 6) إرجاع استجابة واضحة للواجهة
    return {
        "ok": True,
        "file_id": db_file.id,
        "project_id": db_file.project_id,
        "analysis_message_id": analysis_message.id,
        "analysis": analysis_text,
    }
