from sqlalchemy.orm import Session
from .. import models

def create_file(db: Session, project_id: int, filename: str, mime: str, size: int, storage_path: str):
    f = models.File(project_id=project_id, filename=filename, mime_type=mime, size=size, storage_path=storage_path)
    db.add(f)
    db.commit()
    db.refresh(f)
    return f
