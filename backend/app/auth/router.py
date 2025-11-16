from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import select

from app.database import get_db
from app import models, schemas

router = APIRouter(tags=["auth"])


@router.post("/register", response_model=schemas.UserOut)
def register(user: schemas.UserCreate, db: Session = Depends(get_db)):
    # تحقق هل الإيميل موجود
    result = db.execute(
        select(models.User).where(models.User.email == user.email)
    )
    existing = result.scalar_one_or_none()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    # إنشاء مستخدم جديد
    new_user = models.User(
        email=user.email,
        hashed_password=user.password,  # لاحقاً نستبدلها بتشفير حقيقي
        full_name=user.full_name or "",
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user


@router.post("/login", response_model=schemas.Token)
def login(credentials: schemas.Login, db: Session = Depends(get_db)):
    # العثور على المستخدم
    result = db.execute(
        select(models.User).where(models.User.email == credentials.email)
    )
    user = result.scalar_one_or_none()

    # تحقق من كلمة المرور
    if not user or user.hashed_password != credentials.password:
        raise HTTPException(status_code=401, detail="Invalid email or password")

    # حالياً نستخدم توكن ثابت بسيط
    return schemas.Token(access_token="dummy-token", token_type="bearer")
