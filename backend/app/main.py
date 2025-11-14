from fastapi import FastAPI
from app.routers import auth, health

app = FastAPI()

# نقاط التحقق
@app.get("/api/health")
async def health_check():
    return {"status": "ok"}

# ربط الراوترات
app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(health.router, prefix="/api/health", tags=["health"])
