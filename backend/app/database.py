import os
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import declarative_base

# خذ متغير البيئة واستبدل السائق إلى asyncpg إن كان عاديًا
DATABASE_URL = os.getenv("DATABASE_URL", "")
if DATABASE_URL.startswith("postgresql://"):
    DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://", 1)

# محرك وجلسة غير متزامنين
engine = create_async_engine(
    DATABASE_URL,
    future=True,
    pool_pre_ping=True,
)

async_session_maker = async_sessionmaker(
    bind=engine,
    expire_on_commit=False,
    class_=AsyncSession,
)

Base = declarative_base()

# تبعية FastAPI للجلسة
async def get_db():
    async with async_session_maker() as session:
        yield session
