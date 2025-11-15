import os

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession


# نأخذ رابط قاعدة البيانات من متغير البيئة في Render
DATABASE_URL = os.environ["DATABASE_URL"]

# محرك تزامني لإنشاء الجداول
sync_engine = create_engine(DATABASE_URL, future=True)

# محرك غير متزامن للاستخدام داخل التطبيق (الـ routers)
ASYNC_DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://")
async_engine = create_async_engine(ASYNC_DATABASE_URL, future=True)

AsyncSessionLocal = async_sessionmaker(bind=async_engine, expire_on_commit=False)

Base = declarative_base()


def init_db() -> None:

    """Initialize database (tables are created by Alembic)."""

    pass



async def get_db() -> AsyncSession:

    """Provide AsyncSession dependency for routers."""

    async with AsyncSessionLocal() as session:

        yield session
    """
    Dependency تُرجع AsyncSession للـ routers
    """
    async with AsyncSessionLocal() as session:
        yield session
