from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app import models
from app.core.security import get_optional_current_user
from .schemas import ChatRequest

router = APIRouter(prefix="/api/chat", tags=["chat"])


@router.post("/send")
async def send_chat(
    payload: ChatRequest,
    db: Session = Depends(get_db),
    current_user: Optional[models.User] = Depends(get_optional_current_user),
):
    # تحديد هوية المالك: إمّا مستخدم مسجّل أو زائر
    user_id: Optional[int] = current_user.id if current_user else None
    session_id: Optional[str] = payload.session_id

    # لو ما عندنا لا user_id ولا session_id نرفض الطلب (للزائر يجب وجود session_id)
    if user_id is None and not session_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="session_id is required for anonymous users",
        )

    # نحضّر المشروع
    project: Optional[models.Project] = None

    if payload.project_id:
        # استخدام project_id المرسل
        project = db.get(models.Project, payload.project_id)
        if not project:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Project not found",
            )

        # تحقّق بسيط من الصلاحيات
        if user_id and project.owner_id and project.owner_id != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not allowed for this project",
            )
        if session_id and project.session_id and project.session_id != session_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not allowed for this project",
            )
    else:
        # ما في project_id
        if user_id:
            # مستخدم مسجّل → نبحث عن مشروع افتراضي له
            project = (
                db.execute(
                    select(models.Project)
                    .where(models.Project.owner_id == user_id)
                    .order_by(models.Project.id)
                )
                .scalar_one_or_none()
            )
            if not project:
                project = models.Project(
                    name="Main Project",
                    description="Default project",
                    owner_id=user_id,
                )
                db.add(project)
                db.commit()
                db.refresh(project)
        else:
            # زائر → نعتمد على session_id
            project = (
                db.execute(
                    select(models.Project)
                    .where(
                        models.Project.session_id == session_id,
                        models.Project.owner_id.is_(None),
                    )
                    .order_by(models.Project.id)
                )
                .scalar_one_or_none()
            )
            if not project:
                project = models.Project(
                    name="Guest Project",
                    description="Anonymous project",
                    session_id=session_id,
                )
                db.add(project)
                db.commit()
                db.refresh(project)

    # مكان استدعاء نموذج الذكاء الاصطناعي الحقيقي لاحقًا
    assistant_reply = f"Echo: {payload.content}"

    return {
        "project_id": project.id,
        "reply": assistant_reply,
    }
