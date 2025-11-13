from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from .database import Base, engine
from .utils.rate_limit import allow
from .routers import auth, projects, files, chat, voice, vision, governance, integrations, health

app = FastAPI(title="Sovereign Backend v1")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

Base.metadata.create_all(bind=engine)

@app.middleware("http")
async def rate_limiter(request: Request, call_next):
    ip = request.client.host if request.client else "unknown"
    if not allow(ip, limit=120, window=60):
        raise HTTPException(status_code=429, detail="Too Many Requests")
    response = await call_next(request)
    return response

app.include_router(health.router)
app.include_router(auth.router)
app.include_router(projects.router)
app.include_router(files.router)
app.include_router(chat.router)
app.include_router(voice.router)
app.include_router(vision.router)
app.include_router(governance.router)
app.include_router(integrations.router)

@app.get("/")
def root():
    return {"name": app.title, "ok": True}
