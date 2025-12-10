from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from sqlalchemy.orm import Session
from datetime import timedelta
from app.database import get_db
from app.models import User
from app.schemas import Token, UserLogin
from app.utils import verify_password, create_access_token, get_password_hash, update_member_status
from app.dependencies import get_current_user
from pydantic import BaseModel, EmailStr
from typing import Optional
import re

router = APIRouter(tags=["认证"])

class RegisterRequest(BaseModel):
    username: str
    password: str
    email: Optional[EmailStr] = None
    tel: Optional[str] = None

class LoginRequest(UserLogin):
    pass

def validate_username(username: str):
    """用户名验证"""
    if len(username) < 3:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="用户名至少需要3个字符"
        )
    if not re.match(r'^[a-zA-Z0-9_]+$', username):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="用户名只能包含字母、数字和下划线"
        )
    return username

def validate_password(password: str):
    """密码验证"""
    if len(password) < 6:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="密码至少需要6个字符"
        )
    return password

def validate_tel(tel: str):
    """手机号验证"""
    if tel and not re.match(r'^1[3-9]\d{9}$', tel):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="手机号格式不正确"
        )
    return tel

@router.post("/login", response_model=Token)
async def login(
    login_data: LoginRequest,
    db: Session = Depends(get_db)
):
    """用户登录"""
    user = db.query(User).filter(User.user_name == login_data.username).first()

    if not user or not verify_password(login_data.password, user.password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="用户名或密码错误",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # 创建访问令牌
    access_token = create_access_token(
        data={
            "user_id": user.user_id,
            "username": user.user_name,
            "is_admin": user.is_admin  # 添加这一行
        },
        expires_delta=timedelta(minutes=30)
    )

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user_id": user.user_id,
        "user_name": user.user_name,
        "is_admin": user.is_admin  # 返回给前端
    }

@router.post("/register")
async def register(
    register_data: RegisterRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """用户注册"""
    # 数据验证
    validate_username(register_data.username)
    validate_password(register_data.password)
    if register_data.tel:
        validate_tel(register_data.tel)

    # 检查用户是否已存在
    existing_user = db.query(User).filter(
        (User.user_name == register_data.username) |
        (User.email == register_data.email)
    ).first()

    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="用户名或邮箱已被注册"
        )

    try:
        # 创建新用户
        hashed_password = get_password_hash(register_data.password)
        new_user = User(
            user_name=register_data.username,
            password=hashed_password,
            email=register_data.email or f"{register_data.username}@example.com",
            tel=register_data.tel or "13800000000",
            is_member=False,
            is_admin=False  # 新用户默认不是管理员
        )

        db.add(new_user)
        db.commit()
        db.refresh(new_user)

        # 后台任务初始化用户相关数据
        background_tasks.add_task(initialize_user_data, db, new_user.user_id)

        return {
            "message": "用户注册成功",
            "user_id": new_user.user_id,
            "username": new_user.user_name
        }

    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="注册过程中发生错误"
        )

def initialize_user_data(db: Session, user_id: int):
    """初始化用户相关数据（购物车等）"""
    try:
        from app.models import ShoppingCart
        # 创建用户购物车
        cart = ShoppingCart(user_id=user_id)
        db.add(cart)
        db.commit()
    except Exception as e:
        db.rollback()
        print(f"初始化用户数据失败: {e}")

@router.get("/me")
async def get_current_user_info(
    current_user: User = Depends(get_current_user)
):
    """获取当前用户信息"""
    return {
        "user_id": current_user.user_id,
        "user_name": current_user.user_name,
        "email": current_user.email,
        "tel": current_user.tel,
        "is_member": current_user.is_member,
        "is_admin": current_user.is_admin  # 添加这一行
    }

@router.post("/refresh")
async def refresh_token(
    current_user: User = Depends(get_current_user)
):
    """刷新访问令牌"""
    access_token = create_access_token(
        data={
            "user_id": current_user.user_id,
            "username": current_user.user_name,
            "is_admin": current_user.is_admin  # 添加这一行
        },
        expires_delta=timedelta(minutes=30)
    )

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user_id": current_user.user_id,
        "user_name": current_user.user_name,
        "is_admin": current_user.is_admin  # 添加这一行
    }