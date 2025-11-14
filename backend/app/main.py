from fastapi import FastAPI
from app.database import Base, engine
import asyncio

app = FastAPI()

# دالة لتهيئة قاعدة البيانات بشكل غير متزامن
async def init_models():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

@app.on_event("startup")
async def on_startup():
    await init_models()
# --- create DB tables on startup (idempotent) ---
from app.database import Base, engine as async_engine

@app.on_event("startup")
async def _create_tables_on_startup():
    # create tables if they don't exist (runs safely every boot)
    async with async_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
