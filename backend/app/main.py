from fastapi import FastAPI
from app.routers import auth, health

app = FastAPI()

@app.get("/api/health")
async def health_check():
    return {"status": "ok"}

# لاحظ أننا أزلنا تكرار الـ prefix
app.include_router(auth.router, prefix="/api", tags=["auth"])
app.include_router(health.router, prefix="/api/health", tags=["health"])
