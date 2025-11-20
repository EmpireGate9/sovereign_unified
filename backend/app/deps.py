from fastapi import Depends, HTTPException, Header
from sqlalchemy.orm import Session
from jose import jwt  # نستخدم نفس مكتبة jose مثل باقي المشروع

from app.core.security import SECRET_KEY, ALGORITHM  # نفس القيم المستخدمة في إصدار التوكن
from .database import get_db
from . import models


class CurrentUser:
    def __init__(self, id: int, role: str):
        self.id = id
        self.role = role


def get_current_user(
    authorization: str | None = Header(default=None),
    db: Session = Depends(get_db),
) -> CurrentUser:
    # لا نقبل طلبات بدون هيدر Authorization
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated")

    token = authorization.split()[1]

    try:
        # فك التوكن بنفس المفتاح والخوارزمية المستخدمة في login
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        uid = int(payload["sub"])
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token")

    user = db.get(models.User, uid)
    if not user:
        raise HTTPException(status_code=401, detail="User not found")

    return CurrentUser(id=user.id, role=user.role)
