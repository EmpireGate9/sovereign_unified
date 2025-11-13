from fastapi import APIRouter, Depends
from ..deps import get_current_user
from ..config import settings

router = APIRouter(prefix="/api/integrations", tags=["integrations"])

@router.get("/status")
def status(user=Depends(get_current_user)):
    return {
        "s3_ready": bool(settings.s3_bucket and settings.s3_access_key and settings.s3_secret_key),
        "supabase_ready": bool(settings.supabase_url and settings.supabase_key),
        "email_ready": bool(settings.email_smtp and settings.email_user and settings.email_pass)
    }
