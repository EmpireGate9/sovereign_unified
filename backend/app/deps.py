from fastapi import Depends, HTTPException, Header
from sqlalchemy.ext.asyncio import AsyncSession
import jwt
from .config import settings
from .database import get_db
from . import models

class CurrentUser:
    def __init__(self, id: int, role: str):
        self.id = id
        self.role = role

def get_current_user(authorization: str | None = Header(default=None), db: AsyncSession = Depends(get_db)) -> CurrentUser:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Missing token")
    token = authorization.split()[1]
    try:
        payload = jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_alg])
        uid = int(payload["sub"])
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token")
    user = db.query(models.User).get(uid)
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return CurrentUser(id=user.id, role=user.role)
