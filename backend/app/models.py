from datetime import datetime

from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from .database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    full_name = Column(String, default="")
    role = Column(String, default="user")
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # علاقات
    projects = relationship("Project", back_populates="owner")
    messages = relationship("Message", back_populates="user")


class Project(Base):
    __tablename__ = "projects"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True, nullable=False)
    description = Column(Text, default="")
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # علاقات
    owner = relationship("User", back_populates="projects")
    files = relationship("File", back_populates="project")
    messages = relationship("Message", back_populates="project")
    tasks = relationship("Task", back_populates="project")


class File(Base):
    __tablename__ = "files"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False)
    filename = Column(String, nullable=False)
    mime_type = Column(String, default="application/octet-stream")
    size = Column(Integer, default=0)
    storage_path = Column(String, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # علاقات
    project = relationship("Project", back_populates="files")


class Message(Base):
    __tablename__ = "messages"

    id = Column(Integer, primary_key=True, index=True)

    # المستخدم صاحب الرسالة – إجباري
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    # المشروع – اختياري
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=True)

    # جلسة الدردشة – اختياري
    session_id = Column(String, nullable=True)

    # user / assistant / system
    role = Column(String, nullable=False, default="user")

    # نص الرسالة
    content = Column(Text, nullable=False)

    # وقت الإنشاء
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # علاقات
    user = relationship("User", back_populates="messages")
    project = relationship("Project", back_populates="messages")


class Task(Base):
    __tablename__ = "tasks"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False)
    name = Column(String, nullable=False)
    status = Column(String, default="pending")
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # علاقات
    project = relationship("Project", back_populates="tasks")
