import os

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base, Session

# نقرأ DATABASE_URL من البيئة كما هي (بدون +asyncpg)
DATABASE_URL = os.environ["DATABASE_URL"]

# محرّك متزامن عادي
engine = create_engine(DATABASE_URL, future=True)

# Session عادية متزامنة
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def init_db() -> None:
    """Initialize database schema using the sync engine."""
    Base.metadata.create_all(bind=engine)


def get_db():
    """Provide sync Session dependency for routers."""
    db: Session = SessionLocal()
    try:
        yield db
    finally:
        db.close()
