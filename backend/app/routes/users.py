from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from app.database import get_db
from app.models import User
from app.schemas import User as UserSchema
from app.dependencies import get_current_user, get_current_admin, validate_resource_ownership
from app.utils import update_member_status

router = APIRouter(tags=["Users"])


@router.get("/", response_model=List[UserSchema])
async def get_users(
        skip: int = 0,
        limit: int = 100,
        search: Optional[str] = Query(None),
        db: Session = Depends(get_db),
        admin: User = Depends(get_current_admin)
):
    """Get user list (admin only)"""
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
    """Get user information"""
    user = db.query(User).filter(User.user_id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User does not exist")

    if current_user.user_id != user_id and not hasattr(current_user, 'admin_id'):
        raise HTTPException(status_code=403, detail="Unauthorized to view this user's information")

    return user


@router.get("/{user_id}/member-status")
async def get_member_status(
        user_id: int,
        current_user: User = Depends(get_current_user),
        db: Session = Depends(get_db)
):
    """Get user membership status"""
    validate_resource_ownership(user_id, current_user)

    user = db.query(User).filter(User.user_id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User does not exist")

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
    """Manually update user membership status"""
    validate_resource_ownership(user_id, current_user)

    user = db.query(User).filter(User.user_id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User does not exist")

    new_status = update_member_status(db, user_id)

    return {
        "success": True,
        "user_id": user_id,
        "is_member": new_status,
        "user_name": user.user_name,
        "message": f"Membership status updated: {'Member' if new_status else 'Regular user'}"
    }


@router.put("/{user_id}/profile")
async def update_user_profile(
        user_id: int,
        profile_data: dict,
        current_user: User = Depends(get_current_user),
        db: Session = Depends(get_db)
):
    """Update user profile information"""
    validate_resource_ownership(user_id, current_user)

    user = db.query(User).filter(User.user_id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User does not exist")

    try:
        allowed_fields = ['email', 'tel']
        for field in allowed_fields:
            if field in profile_data:
                setattr(user, field, profile_data[field])

        db.commit()
        db.refresh(user)

        return {
            "success": True,
            "message": "Profile updated successfully",
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
        raise HTTPException(status_code=500, detail=f"Failed to update profile: {str(e)}")

@router.put("/{user_id}/set-admin")
async def set_user_admin_status(
        user_id: int,
        is_admin: bool,
        current_admin: User = Depends(get_current_admin),
        db: Session = Depends(get_db)
):
    """Set user admin status (super admin only)"""
    user = db.query(User).filter(User.user_id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User does not exist")

    try:
        user.is_admin = is_admin
        db.commit()

        return {
            "success": True,
            "message": f"User {user.user_name}'s admin status updated to {is_admin}",
            "user": {
                "user_id": user.user_id,
                "user_name": user.user_name,
                "is_admin": user.is_admin
            }
        }

    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to update admin status: {str(e)}")

@router.get("/{user_id}/admin-status")
async def get_user_admin_status(
        user_id: int,
        current_admin: User = Depends(get_current_admin),
        db: Session = Depends(get_db)
):
    """Get user admin status (admin only)"""
    user = db.query(User).filter(User.user_id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User does not exist")

    return {
        "user_id": user.user_id,
        "user_name": user.user_name,
        "is_admin": user.is_admin
    }
