from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.crud import messages as messages_crud
from app.deps import get_current_user
from app import schemas


# لا نضع prefix هنا لأن main يضيف /api/chat
router = APIRouter(tags=["chat"])


@router.post("/send", response_model=schemas.MessageOut)
def send_message(
    body: schemas.MessageCreate,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    # رسالة المستخدم
    user_message = messages_crud.add_message(
        db,
        project_id=body.project_id,
        role="user",
        content=body.content,
        user_id=(user.id if user is not None else None),
    )

    # رد مساعد بسيط (مؤقت لحين ربط الذكاء الاصطناعي)
    messages_crud.add_message(
        db,
        project_id=body.project_id,
        role="assistant",
        content=f"Echo: {body.content[:100]}",
        user_id=None,
    )

    return user_message


@router.get("/history")
def history(
    project_id: int,
    limit: int = 50,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    rows = messages_crud.get_messages(db, project_id=project_id, limit=limit)
    return [
        {"id": r.id, "role": r.role, "content": r.content}
        for r in rows[::-1]
    ]
