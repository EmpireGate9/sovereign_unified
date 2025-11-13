from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..database import get_db
from ..crud import policies as policies_crud
from ..schemas import PolicyCreate
from ..deps import get_current_user
from ..utils.security import require_role

router = APIRouter(prefix="/api/governance", tags=["governance"])

@router.post("/policies")
def create_policy(body: PolicyCreate, db: Session = Depends(get_db), user=Depends(get_current_user)):
    try:
        require_role("admin" if user.role=="admin" else user.role, ["admin"])
    except Exception:
        raise HTTPException(status_code=403, detail="Admin only")
    p = policies_crud.create_policy(db, name=body.name, rules=body.rules)
    return {"id": p.id, "name": p.name}

@router.get("/policies")
def list_policies(db: Session = Depends(get_db), user=Depends(get_current_user)):
    rows = db.execute("select id,name,created_at from policies").all()
    return [{"id": r[0], "name": r[1], "created_at": str(r[2])} for r in rows]
