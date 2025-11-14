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
    if await users_crud.get_user_by_email(db, user.email):
        raise HTTPException(status_code=400, detail="Email already registered")
    created = await users_crud.create_user(db, email=user.email, password=user.password, full_name=user.full_name or "")
    return created

@router.post("/login", response_model=schemas.Token)
async def login(form: schemas.UserCreate, db: AsyncSession = Depends(get_db)):
    user = await users_crud.get_user_by_email(db, form.email)
    if not user or not verify_password(form.password, user.hashed_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    token = create_access_token(str(user.id), settings.jwt_secret, settings.jwt_alg, settings.access_token_expire_minutes)
    return {"access_token": token, "token_type": "bearer"}
