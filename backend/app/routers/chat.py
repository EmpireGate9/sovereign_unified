from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from ..database import get_db
from .. import models, schemas

router = APIRouter(prefix="/api/chat", tags=["chat"])

@router.post("/send", response_model=schemas.MessageOut)
def send_message(body: schemas.MessageCreate, db: Session = Depends(get_db)):
    # حفظ رسالة المستخدم
    user_msg = models.Message(
        role="user",
        content=body.content,
        project_id=0,
        user_id=None
    )
    db.add(user_msg)
    db.commit()
    db.refresh(user_msg)

    # رد تلقائي (Echo)
    reply_text = f"تم استلام رسالتك: {body.content}"

    assistant_msg = models.Message(
        role="assistant",
        content=reply_text,
        project_id=0,
        user_id=None
    )
    db.add(assistant_msg)
    db.commit()
    db.refresh(assistant_msg)

    return assistant_msg


@router.get("/history")
def history(limit: int = 50, db: Session = Depends(get_db)):
    rows = db.query(models.Message).order_by(models.Message.id.desc()).limit(limit).all()
    return [{"id": r.id, "role": r.role, "content": r.content} for r in rows[::-1]]
