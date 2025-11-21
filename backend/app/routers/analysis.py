# backend/app/routers/analysis.py

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel

from ..database import get_db
from .. import models
from ..deps import get_current_user   # التصحيح هنا


router = APIRouter(prefix="/analysis", tags=["analysis"])


class AnalysisRequest(BaseModel):
    project_id: int
    file_id: int


@router.post("/run")
async def analyze_file(
    body: AnalysisRequest,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    """
    يستقبل project_id و file_id من الواجهة،
    يتحقق من وجود المشروع والملف،
    ثم ينشئ رسالة تحليل في جدول messages يمكن للدردشة رؤيتها لاحقاً.
    """
    project_id = body.project_id
    file_id = body.file_id

    # التحقق من وجود المشروع
    project = db.query(models.Project).filter_by(id=project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="المشروع غير موجود")

    # التحقق من أن الملف تابع لنفس المشروع
    file_obj = (
        db.query(models.File)
        .filter_by(id=file_id, project_id=project_id)
        .first()
    )
    if not file_obj:
        raise HTTPException(
            status_code=404,
            detail="الملف غير موجود داخل هذا المشروع",
        )

    # نص تحليل مبدئي (لاحقاً نربطه بـ OpenAI لتحليل حقيقي)
    analysis_text = (
        f"تم تحليل الملف «{file_obj.filename}» في المشروع رقم {project_id}.\n\n"
        f"• نوع الملف: {file_obj.mime_type}\n"
        f"• الحجم: {file_obj.size} بايت\n\n"
        "هذا تحليل أولي؛ يمكنك الآن سؤالي في الدردشة عن ملخص هذا الملف "
        "أو عن تفاصيل إضافية مرتبطة به."
    )

    # تخزين نتيجة التحليل كرسالة (role='assistant') في جدول messages
    analysis_msg = models.Message(
        user_id=user.id if user else None,
        project_id=project_id,
        session_id=None,
        role="assistant",
        content=analysis_text,
    )
    db.add(analysis_msg)
    db.commit()
    db.refresh(analysis_msg)

    return {
        "ok": True,
        "project_id": project_id,
        "file_id": file_id,
        "analysis_message_id": analysis_msg.id,
        "analysis": analysis_text,
    }
