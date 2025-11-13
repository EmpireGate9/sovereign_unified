from sqlalchemy.orm import Session
from .. import models

def create_policy(db: Session, name: str, rules: dict):
    p = models.Policy(name=name, rules=rules)
    db.add(p)
    db.commit()
    db.refresh(p)
    return p
