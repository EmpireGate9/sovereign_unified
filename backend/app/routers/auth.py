from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from ..database import get_db
from .. import schemas
from ..crud import users as users_crud
from ..utils.security import verify_password, create_access_token
from ..config import settings

router = APIRouter(prefix="/auth", tags=["auth"])

@router.post("/register", response_model=schemas.UserOut)
async def register(user: schemas.UserCreate, db: AsyncSession = Depends(get_db)):
    """
    Very simple registration endpoint:
    - يتأكد أن الايميل غير موجود
    - يحفظ المستخدم الجديد (بدون تهشير كلمة السر مؤقتاً)
    """
    from sqlalchemy import select
    from app import models

    # check if email already exists
    result = await db.execute(
        select(models.User).where(models.User.email == user.email)
    )
    existing = result.scalar_one_or_none()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    new_user = models.User(
        email=user.email,
        # ملاحظة: كلمة السر تُخزَّن كما هي مؤقتاً لأجل التجربة فقط
        hashed_password=user.password,
        full_name=user.full_name or "",
    )

    db.add(new_user)
    await db.commit()
    await db.refresh(new_user)
    return new_user

@router.post("/login", response_model=schemas.Token)
, response_model=schemas.Token)
, response_model=schemas.Token)
, response_model=schemas.Token)
async def login(form: schemas.UserCreate, db: AsyncSession = Depends(get_db)):
    user = await users_crud.get_user_by_email(db, form.email)
    if not user or not verify_password(form.password, user.hashed_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    token = create_access_token(str(user.id), settings.jwt_secret, settings.jwt_alg, settings.access_token_expire_minutes)
    return {"access_token": token, "token_type": "bearer"}
