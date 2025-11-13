from fastapi import APIRouter, Depends, UploadFile, File
from sqlalchemy.orm import Session
from ..database import get_db
from ..deps import get_current_user
from ..integrations.storage import save_file

router = APIRouter(prefix="/api/voice", tags=["voice"])

@router.post("/upload")
async def upload_audio(project_id: int, audio: UploadFile = File(...), db: Session = Depends(get_db), user=Depends(get_current_user)):
    data = await audio.read()
    filename = audio.filename.replace("..","_").replace("/","_")
    path = save_file(filename, data)
    return {"ok": True, "path": str(path), "transcript": "(stub) تم استلام الصوت وسيتم تفريغه لاحقاً."}
