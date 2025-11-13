from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from ..database import get_db
from ..crud import messages as messages_crud
from ..deps import get_current_user
from ..schemas import MessageCreate, MessageOut

router = APIRouter(prefix="/api/chat", tags=["chat"])

@router.post("/send", response_model=MessageOut)
def send_message(body: MessageCreate, db: Session = Depends(get_db), user=Depends(get_current_user)):
    m = messages_crud.add_message(db, project_id=body.project_id, role="user", content=body.content, user_id=user.id)
    messages_crud.add_message(db, project_id=body.project_id, role="assistant", content=f"رد تلقائي: {body.content[:100]}", user_id=None)
    return m

@router.get("/history")
def history(project_id: int, limit: int = 50, db: Session = Depends(get_db), user=Depends(get_current_user)):
    rows = messages_crud.get_messages(db, project_id=project_id, limit=limit)
    return [{"id": r.id, "role": r.role, "content": r.content} for r in rows[::-1]]
