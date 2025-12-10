from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from app.database import get_db
from app.models import User
from app.schemas import User as UserSchema
from app.dependencies import get_current_user, get_current_admin, validate_resource_ownership
from app.utils import update_member_status

router = APIRouter(tags=["用户"])


@router.get("/", response_model=List[UserSchema])
async def get_users(
        skip: int = 0,
        limit: int = 100,
        search: Optional[str] = Query(None),
        db: Session = Depends(get_db),
        admin: User = Depends(get_current_admin)  # 仅管理员可访问
):
    """获取用户列表（管理员权限）"""
    query = db.query(User)

    if search:
        query = query.filter(
            User.user_name.contains(search) |
            User.email.contains(search)
        )

    users = query.offset(skip).limit(limit).all()
    return users


@router.get("/{user_id}", response_model=UserSchema)
async def get_user(
        user_id: int,
        current_user: User = Depends(get_current_user),
        db: Session = Depends(get_db)
):
    """获取用户信息"""
    user = db.query(User).filter(User.user_id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="用户不存在")

    # 只能查看自己的信息，除非是管理员
    if current_user.user_id != user_id and not hasattr(current_user, 'admin_id'):
        raise HTTPException(status_code=403, detail="无权查看该用户信息")

    return user


@router.get("/{user_id}/member-status")
async def get_member_status(
        user_id: int,
        current_user: User = Depends(get_current_user),
        db: Session = Depends(get_db)
):
    """获取用户会员状态"""
    # 使用新的权限验证函数
    validate_resource_ownership(user_id, current_user)

    user = db.query(User).filter(User.user_id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="用户不存在")

    # 更新并获取会员状态
    is_member = update_member_status(db, user_id)

    return {
        "user_id": user_id,
        "is_member": is_member,
        "user_name": user.user_name
    }


@router.put("/{user_id}/update-member-status")
async def update_member_status_manual(
        user_id: int,
        current_user: User = Depends(get_current_user),
        db: Session = Depends(get_db)
):
    """手动更新用户会员状态"""
    # 使用新的权限验证函数
    validate_resource_ownership(user_id, current_user)

    user = db.query(User).filter(User.user_id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="用户不存在")

    # 更新会员状态
    new_status = update_member_status(db, user_id)

    return {
        "success": True,
        "user_id": user_id,
        "is_member": new_status,
        "user_name": user.user_name,
        "message": f"会员状态已更新: {'会员' if new_status else '普通用户'}"
    }


@router.put("/{user_id}/profile")
async def update_user_profile(
        user_id: int,
        profile_data: dict,
        current_user: User = Depends(get_current_user),
        db: Session = Depends(get_db)
):
    """更新用户个人信息"""
    # 使用新的权限验证函数
    validate_resource_ownership(user_id, current_user)

    user = db.query(User).filter(User.user_id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="用户不存在")

    try:
        # 更新允许修改的字段
        allowed_fields = ['email', 'tel']
        for field in allowed_fields:
            if field in profile_data:
                setattr(user, field, profile_data[field])

        db.commit()
        db.refresh(user)

        return {
            "success": True,
            "message": "个人信息更新成功",
            "user": {
                "user_id": user.user_id,
                "user_name": user.user_name,
                "email": user.email,
                "tel": user.tel,
                "is_member": user.is_member,
                "is_admin": user.is_admin
            }
        }

    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"更新个人信息失败: {str(e)}")

@router.put("/{user_id}/set-admin")
async def set_user_admin_status(
        user_id: int,
        is_admin: bool,
        current_admin: User = Depends(get_current_admin),
        db: Session = Depends(get_db)
):
    """设置用户管理员状态（仅超级管理员可用）"""
    user = db.query(User).filter(User.user_id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="用户不存在")

    try:
        user.is_admin = is_admin
        db.commit()

        return {
            "success": True,
            "message": f"用户 {user.user_name} 的管理员状态已更新为 {is_admin}",
            "user": {
                "user_id": user.user_id,
                "user_name": user.user_name,
                "is_admin": user.is_admin
            }
        }

    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"更新管理员状态失败: {str(e)}")

@router.get("/{user_id}/admin-status")
async def get_user_admin_status(
        user_id: int,
        current_admin: User = Depends(get_current_admin),
        db: Session = Depends(get_db)
):
    """获取用户管理员状态（仅管理员可用）"""
    user = db.query(User).filter(User.user_id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="用户不存在")

    return {
        "user_id": user.user_id,
        "user_name": user.user_name,
        "is_admin": user.is_admin
    }