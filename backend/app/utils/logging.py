import logging
from datetime import datetime

logger = logging.getLogger("sovereign")
logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")

def audit(user_id, action: str, resource: str, details: dict | None = None):
    logger.info(f"[AUDIT] user={user_id} action={action} resource={resource} details={details or {}}")
