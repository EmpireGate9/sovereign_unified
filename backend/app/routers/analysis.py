# backend/app/routers/analysis.py

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from openai import OpenAI

from app.database import get_db
from app import models
from app.deps import get_current_user

router = APIRouter(prefix="/analysis", tags=["analysis"])

client = OpenAI()


class AnalysisRequest(BaseModel):
    project_id: int
    file_id: int
    # مهم: نربط التحليل بنفس Session الخاصة بالدردشة
    session_id: Optional[str] = None


@router.post("/file")
def analyze_file(
    payload: AnalysisRequest,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """
    تحليل ملف مشروع معيّن وتخزين نتيجة التحليل في جدول messages
    كرسالة [assistant] مرتبطة بنفس session_id.
    """

    # 1) التحقق من وجود المشروع وملكيته
    project = db.query(models.Project).get(payload.project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    if current_user and project.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not allowed for this project")

    # 2) التحقق من وجود الملف داخل نفس المشروع
    file_obj = (
        db.query(models.File)
        .filter(
            models.File.id == payload.file_id,
            models.File.project_id == payload.project_id,
        )
        .first()
    )
    if not file_obj:
        raise HTTPException(status_code=404, detail="File not found in this project")

    # 3) نص تمهيدي للتحليل (حاليًا نعتمد على الميتاداتا فقط)
    description = (
        f"تم تحليل الملف «{file_obj.filename}» في المشروع رقم {file_obj.project_id}.\n\n"
        f"• نوع الملف: {file_obj.mime_type or 'غير معروف'}\n"
        f"• الحجم: {file_obj.size} بايت\n\n"
        "هذا تحليل أولي بناءً على معلومات الملف المتاحة. "
        "يمكنك الآن سؤالي في الدردشة عن ملخص هذا الملف أو عن تفاصيل إضافية مرتبطة به."
    )

    # 4) يمكن لاحقًا قراءة محتوى الملف فعليًا واستدعاء OpenAI لتحليل أعمق
    #    مثال (مُعطّل حاليًا):
    # try:
    #     completion = client.chat.completions.create(
    #         model="gpt-4o-mini",
    #         messages=[
    #             {
    #                 "role": "system",
    #                 "content": "أنت مساعد متخصص في تحليل ملفات المشاريع.",
    #             },
    #             {
    #                 "role": "user",
    #                 "content": f"حلّل هذا الملف: {file_obj.filename}",
    #             },
    #         ],
    #     )
    #     ai_text = completion.choices[0].message.content
    #     description += "\n\n---\nتحليل تفصيلي:\n" + ai_text
    # except Exception:
    #     # في حال فشل OpenAI نكتفي بالوصف الأولي
    #     pass

    # 5) تخزين نتيجة التحليل في جدول messages كرسالة assistant
    analysis_msg = models.Message(
        user_id=current_user.id if current_user else None,
        project_id=project.id,
        session_id=payload.session_id,   # ← الربط مع الدردشة
        role="assistant",
        content=f"[ANALYSIS]\n{description}",
    )

    db.add(analysis_msg)
    db.commit()
    db.refresh(analysis_msg)

    return {
        "ok": True,
        "project_id": project.id,
        "file_id": file_obj.id,
        "analysis_message_id": analysis_msg.id,
        "analysis": description,
    }
