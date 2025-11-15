from fastapi import FastAPI, APIRouter
from fastapi.middleware.cors import CORSMiddleware

from .database import init_db
from .routers.files import router as files_router
from .routers.vision import router as vision_router
from .routers.voice import router as voice_router
from .routers.chat import router as chat_router
from .routers.auth import router as auth_router

app = FastAPI(title="Sovereign Core")

# CORS (عدّل allow_origins لاحقاً إذا احتجت)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# نجمع كل الراوترات تحت /api
api_router = APIRouter()

api_router.include_router(auth_router, prefix="/auth", tags=["auth"])
api_router.include_router(auth_router, prefix="/auth", tags=["auth"])
api_router.include_router(files_router, prefix="/files", tags=["files"])
api_router.include_router(vision_router, prefix="/vision", tags=["vision"])
api_router.include_router(voice_router, prefix="/voice", tags=["voice"])
api_router.include_router(chat_router, prefix="/chat", tags=["chat"])


@api_router.get("/health")
async def health():
    return {"status": "ok"}


@app.on_event("startup")
def on_startup():
    init_db()


app.include_router(api_router, prefix="/api")
