from sqlalchemy.ext.asyncio import AsyncAsyncSession
from .. import models

def create_policy(db: AsyncSession, name: str, rules: dict):
    p = models.Policy(name=name, rules=rules)
    db.add(p)
    db.commit()
    db.refresh(p)
    return p
