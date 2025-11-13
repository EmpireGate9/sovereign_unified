from fastapi import APIRouter, Depends, UploadFile, File
from sqlalchemy.orm import Session
from ..database import get_db
from ..deps import get_current_user
from ..integrations.storage import save_file

router = APIRouter(prefix="/api/vision", tags=["vision"])

@router.post("/upload")
async def upload_image(project_id: int, image: UploadFile = File(...), db: Session = Depends(get_db), user=Depends(get_current_user)):
    data = await image.read()
    filename = image.filename.replace("..","_").replace("/","_")
    path = save_file(filename, data)
    return {"ok": True, "path": str(path), "ocr": "(stub) سيتم استخراج النص لاحقاً."}
