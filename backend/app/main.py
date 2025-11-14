
from fastapi import FastAPI
app = FastAPI()

@app.get('/api/health')
def health_check():
    return {'status': 'ok'}

from fastapi import FastAPI
from app.routers import auth, users  # تأكد أن المسارات موجودة فعلاً

app = FastAPI()

# نقاط التحقق
@app.get("/api/health")
async def health():
    return {"status": "ok"}

# ربط الراوترات
app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(users.router, prefix="/api/users", tags=["users"])
