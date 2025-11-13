from sqlalchemy.orm import Session
from .. import models
from ..utils.security import hash_password

def create_user(db: Session, email: str, password: str, full_name: str=""):
    user = models.User(email=email, hashed_password=hash_password(password), full_name=full_name)
    db.add(user)
    db.commit()
    db.refresh(user)
    return user

def get_user_by_email(db: Session, email: str):
    return db.query(models.User).filter(models.User.email==email).first()
