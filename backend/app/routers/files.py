from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from ..database import get_db
from ..crud import files as files_crud
from ..deps import get_current_user
from ..integrations.storage import save_file
from ..integrations.ai import simple_parse_text

router = APIRouter(prefix="/api/files", tags=["files"])

MAX_SIZE = 20 * 1024 * 1024  # 20MB

@router.post("/upload")
async def upload_file(project_id: int, f: UploadFile = File(...), db: AsyncSession = Depends(get_db), user=Depends(get_current_user)):
    content = await f.read()
    if len(content) > MAX_SIZE:
        raise HTTPException(status_code=400, detail="File too large")
    filename = f.filename.replace("..","_").replace("/","_")
    path = save_file(filename, content)
    rec = files_crud.create_file(db, project_id=project_id, filename=filename, mime=f.content_type, size=len(content), storage_path=str(path))
    analysis = {}
    if f.content_type.startswith("text/") or filename.endswith(".txt"):
        analysis = simple_parse_text(content, f.content_type)
    return {"file": {"id": rec.id, "filename": rec.filename, "size": rec.size}, "analysis": analysis}
