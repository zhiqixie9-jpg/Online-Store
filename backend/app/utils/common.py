from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from typing import Any, Optional

def get_or_404(db: Session, model: Any, id: int, detail: str = "未找到"):
    """通用获取对象或返回404"""
    instance = db.query(model).filter(model.id == id).first()
    if not instance:
        raise HTTPException(status_code=404, detail=detail)
    return instance

def validate_ownership(current_user_id: int, resource_user_id: int):
    """验证资源所有权"""
    if current_user_id != resource_user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="无权访问该资源"
        )