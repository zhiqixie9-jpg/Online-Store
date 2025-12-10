from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from typing import Optional
from app.database import get_db
from app.models import User  # 删除 Admin 的导入
from app.utils import verify_token

security = HTTPBearer(auto_error=False)


async def get_current_user(
        credentials: HTTPAuthorizationCredentials = Depends(security),
        db: Session = Depends(get_db)
) -> User:
    """获取当前认证用户 - 必需登录"""
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="未提供认证令牌",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = credentials.credentials
    payload = verify_token(token)  # 这里应该返回payload，不只是user_id

    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="无效的认证令牌",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user_id = payload.get("user_id")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="令牌中缺少用户ID",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user = db.query(User).filter(User.user_id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="用户不存在"
        )

    return user


async def get_current_user_optional(
        credentials: HTTPAuthorizationCredentials = None,
        db: Session = Depends(get_db)
) -> Optional[User]:
    """可选获取当前用户 - 不强制要求登录"""
    if not credentials:
        return None

    try:
        return await get_current_user(credentials, db)
    except HTTPException:
        return None


async def get_current_admin(
        current_user: User = Depends(get_current_user)
) -> User:
    """
    获取当前管理员用户 - 基于 User 表的 is_admin 字段
    """
    if not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="管理员权限不足"
        )
    return current_user


def validate_resource_ownership(resource_user_id: int, current_user: User):
    """
    验证资源所有权
    """
    # 如果是管理员，允许访问任何资源
    if current_user.is_admin:
        return

    # 普通用户只能访问自己的资源
    if current_user.user_id != resource_user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="无权访问该资源"
        )


def validate_positive_quantity(quantity: int):
    """
    验证数量为正数
    """
    if quantity <= 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="数量必须为正整数"
        )
    return quantity