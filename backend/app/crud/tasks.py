from sqlalchemy.ext.asyncio import AsyncSession
from .. import models

def create_task(db: AsyncSession, project_id: int, title: str):
    t = models.Task(project_id=project_id, title=title)
    db.add(t)
    db.commit()
    db.refresh(t)
    return t
