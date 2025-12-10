from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from typing import Any, Optional

def get_or_404(db: Session, model: Any, id: int, detail: str = "Not Found"):

    instance = db.query(model).filter(model.id == id).first()
    if not instance:
        raise HTTPException(status_code=404, detail=detail)
    return instance

def validate_ownership(current_user_id: int, resource_user_id: int):

    if current_user_id != resource_user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Unauthorized to access this resource"
        )
