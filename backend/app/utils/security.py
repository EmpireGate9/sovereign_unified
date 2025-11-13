from datetime import datetime, timedelta
import jwt
from passlib.context import CryptContext
from .logging import audit

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)

def create_access_token(subject: str, secret: str, alg: str, expires_minutes: int = 60):
    expire = datetime.utcnow() + timedelta(minutes=expires_minutes)
    payload = {"sub": subject, "exp": expire}
    token = jwt.encode(payload, secret, algorithm=alg)
    return token

def require_role(user_role: str, allowed: list[str]):
    if user_role not in allowed:
        audit(None, "deny", "role_check", {"role": user_role, "allowed": allowed})
        raise PermissionError("Insufficient role")
