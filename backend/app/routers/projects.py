from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import get_db
from .. import schemas, models
from ..crud import projects as projects_crud
from ..core.security import get_current_user  # ← هنا التحقق من التوكن الصحيح

# نستخدم prefix="/projects" فقط. الـ main.py يضيف "/api" فوقها
router = APIRouter(prefix="/projects", tags=["projects"])


@router.post("", response_model=schemas.ProjectOut)
def create_project(
    body: schemas.ProjectCreate,
    db: AsyncSession = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    # هنا user مضمون أنه مسجّل دخول بتوكن صحيح
    pr = projects_crud.create_project(
        db,
        owner_id=user.id,
        name=body.name,
        description=body.description,
    )
    return pr


@router.get("")
def list_projects(
    db: AsyncSession = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    # يرجع مشاريع المستخدم الحالي فقط
    lst = db.query(models.Project).filter(models.Project.owner_id == user.id).all()
    return [
        {"id": p.id, "name": p.name, "description": p.description}
        for p in lst
    ]
