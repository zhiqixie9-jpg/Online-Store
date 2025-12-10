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

router = APIRouter(tags=["Authentication"])

class RegisterRequest(BaseModel):
    username: str
    password: str
    email: Optional[EmailStr] = None
    tel: Optional[str] = None

class LoginRequest(UserLogin):
    pass

def validate_username(username: str):

    if len(username) < 3:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username must be at least 3 characters long."
        )
    if not re.match(r'^[a-zA-Z0-9_]+$', username):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username can only contain letters, numbers, and underscores."
        )
    return username

def validate_password(password: str):

    if len(password) < 6:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must be at least 6 characters long."
        )
    return password

def validate_tel(tel: str):
    if tel and not re.match(r'^1[3-9]\d{9}$', tel):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid phone number format."
        )
    return tel

@router.post("/login", response_model=Token)
async def login(
    login_data: LoginRequest,
    db: Session = Depends(get_db)
):

    user = db.query(User).filter(User.user_name == login_data.username).first()

    if not user or not verify_password(login_data.password, user.password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    access_token = create_access_token(
        data={
            "user_id": user.user_id,
            "username": user.user_name,
            "is_admin": user.is_admin  
        },
        expires_delta=timedelta(minutes=30)
    )

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user_id": user.user_id,
        "user_name": user.user_name,
        "is_admin": user.is_admin  
    }

@router.post("/register")
async def register(
    register_data: RegisterRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):

    validate_username(register_data.username)
    validate_password(register_data.password)
    if register_data.tel:
        validate_tel(register_data.tel)


    existing_user = db.query(User).filter(
        (User.user_name == register_data.username) |
        (User.email == register_data.email)
    ).first()

    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username or email has already been registered."
        )

    try:

        hashed_password = get_password_hash(register_data.password)
        new_user = User(
            user_name=register_data.username,
            password=hashed_password,
            email=register_data.email or f"{register_data.username}@example.com",
            tel=register_data.tel or "13800000000",
            is_member=False,
            is_admin=False  
        )

        db.add(new_user)
        db.commit()
        db.refresh(new_user)

 
        background_tasks.add_task(initialize_user_data, db, new_user.user_id)

        return {
            "message": "User registration successful.",
            "user_id": new_user.user_id,
            "username": new_user.user_name
        }

    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An error occurred during the registration process."
        )

def initialize_user_data(db: Session, user_id: int):

    try:
        from app.models import ShoppingCart

        cart = ShoppingCart(user_id=user_id)
        db.add(cart)
        db.commit()
    except Exception as e:
        db.rollback()
        print(f"Failed to initialize user data: {e}")

@router.get("/me")
async def get_current_user_info(
    current_user: User = Depends(get_current_user)
):

    return {
        "user_id": current_user.user_id,
        "user_name": current_user.user_name,
        "email": current_user.email,
        "tel": current_user.tel,
        "is_member": current_user.is_member,
        "is_admin": current_user.is_admin 
    }

@router.post("/refresh")
async def refresh_token(
    current_user: User = Depends(get_current_user)
):

    access_token = create_access_token(
        data={
            "user_id": current_user.user_id,
            "username": current_user.user_name,
            "is_admin": current_user.is_admin  
        },
        expires_delta=timedelta(minutes=30)
    )

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user_id": current_user.user_id,
        "user_name": current_user.user_name,
        "is_admin": current_user.is_admin  
    }
