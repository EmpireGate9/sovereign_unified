from passlib.context import CryptContext

# نستخدم sha256_crypt (تنفيذ بايثون نقي) بدون bcrypt
pwd_context = CryptContext(
    schemes=["sha256_crypt"],
    deprecated="auto",
)

def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)
