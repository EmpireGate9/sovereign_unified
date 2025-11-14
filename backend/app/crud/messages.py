from sqlalchemy.ext.asyncio import AsyncSession
from .. import models

def add_message(db: AsyncSession, project_id: int, role: str, content: str, user_id: int|None=None):
    m = models.Message(project_id=project_id, role=role, content=content, user_id=user_id)
    db.add(m)
    db.commit()
    db.refresh(m)
    return m

def get_messages(db: AsyncSession, project_id: int, limit: int=50):
    return db.query(models.Message).filter(models.Message.project_id==project_id).order_by(models.Message.id.desc()).limit(limit).all()
