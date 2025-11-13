from sqlalchemy.orm import Session
from .. import models

def create_project(db: Session, owner_id: int, name: str, description: str=""):
    pr = models.Project(owner_id=owner_id, name=name, description=description)
    db.add(pr)
    db.commit()
    db.refresh(pr)
    return pr
