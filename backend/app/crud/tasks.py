from sqlalchemy.orm import Session
from .. import models

def create_task(db: Session, project_id: int, title: str):
    t = models.Task(project_id=project_id, title=title)
    db.add(t)
    db.commit()
    db.refresh(t)
    return t
