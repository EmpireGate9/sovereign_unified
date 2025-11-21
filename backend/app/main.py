# backend/app/main.py

from fastapi import FastAPI, APIRouter
from fastapi.middleware.cors import CORSMiddleware

from app.auth.router import router as auth_router
from .database import init_db

from .routers.files import router as files_router
from .routers.vision import router as vision_router
from .routers.voice import router as voice_router
from .routers.chat import router as chat_router
from .routers.projects import router as projects_router
from .routers.analysis import router as analysis_router  # جديد

app = FastAPI(title="Sovereign Core")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# API ROUTER
api_router = APIRouter()

api_router.include_router(auth_router, prefix="/auth", tags=["auth"])
api_router.include_router(files_router, prefix="/files", tags=["files"])
api_router.include_router(vision_router, prefix="/vision", tags=["vision"])
api_router.include_router(voice_router, prefix="/voice", tags=["voice"])
api_router.include_router(chat_router, prefix="/chat", tags=["chat"])
api_router.include_router(projects_router)          # المشاريع كما هي
api_router.include_router(analysis_router)          # التحليل /analysis

# Health Check
@api_router.get("/health")
async def health():
    return {"status": "ok"}

# Startup
@app.on_event("startup")
def on_startup():
    init_db()

# Mount /api
app.include_router(api_router, prefix="/api")
