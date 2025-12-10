from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Favorite, User, Product
from app.schemas import FavoriteResponse, FavoriteOperationResponse
from app.dependencies import get_current_user, get_current_admin
from pydantic import BaseModel
from typing import List

router = APIRouter(tags=["收藏"])


class FavoriteRequest(BaseModel):
    product_id: int


class FavoriteProductResponse(BaseModel):
    product_id: int
    product_name: str
    price: float
    type: str
    description: str
    stock_quantity: int
    is_favorite: bool = True


@router.get("/{user_id}/check/{product_id}", response_model=FavoriteResponse)
async def check_favorite(
        user_id: int,
        product_id: int,
        current_user: User = Depends(get_current_user),
        db: Session = Depends(get_db)
):
    """检查商品收藏状态"""
    if current_user.user_id != user_id:
        raise HTTPException(status_code=403, detail="无权查看该用户收藏")

    user = db.query(User).filter(User.user_id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="用户不存在")

    product = db.query(Product).filter(Product.product_id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="商品不存在")

    favorite = db.query(Favorite).filter(
        Favorite.user_id == user_id,
        Favorite.product_id == product_id
    ).first()

    return FavoriteResponse(is_favorite=favorite is not None)


@router.post("/{user_id}/add", response_model=FavoriteOperationResponse)
async def add_favorite(
        user_id: int,
        request: FavoriteRequest,
        current_user: User = Depends(get_current_user),
        db: Session = Depends(get_db)
):
    """添加收藏"""
    if current_user.user_id != user_id:
        raise HTTPException(status_code=403, detail="无权操作该用户收藏")

    user = db.query(User).filter(User.user_id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="用户不存在")

    product = db.query(Product).filter(Product.product_id == request.product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="商品不存在")

    # 检查是否已经收藏
    existing_favorite = db.query(Favorite).filter(
        Favorite.user_id == user_id,
        Favorite.product_id == request.product_id
    ).first()

    if existing_favorite:
        raise HTTPException(status_code=400, detail="已经收藏过该商品")

    try:
        favorite = Favorite(user_id=user_id, product_id=request.product_id)
        db.add(favorite)
        db.commit()
        db.refresh(favorite)

        return FavoriteOperationResponse(
            success=True,
            message="已添加到收藏"
        )

    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail="添加收藏失败")


@router.delete("/{user_id}/remove/{product_id}", response_model=FavoriteOperationResponse)
async def remove_favorite(
        user_id: int,
        product_id: int,
        current_user: User = Depends(get_current_user),
        db: Session = Depends(get_db)
):
    """移除收藏"""
    if current_user.user_id != user_id:
        raise HTTPException(status_code=403, detail="无权操作该用户收藏")

    favorite = db.query(Favorite).filter(
        Favorite.user_id == user_id,
        Favorite.product_id == product_id
    ).first()

    if not favorite:
        raise HTTPException(status_code=404, detail="收藏记录不存在")

    try:
        db.delete(favorite)
        db.commit()

        return FavoriteOperationResponse(
            success=True,
            message="已从收藏移除"
        )

    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail="移除收藏失败")


@router.get("/{user_id}", response_model=List[FavoriteProductResponse])
async def get_user_favorites(
        user_id: int,
        current_user: User = Depends(get_current_user),
        db: Session = Depends(get_db)
):
    """获取用户收藏列表"""
    if current_user.user_id != user_id:
        raise HTTPException(status_code=403, detail="无权查看该用户收藏")

    user = db.query(User).filter(User.user_id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="用户不存在")

    # 使用join查询优化性能
    favorites = db.query(Favorite, Product).join(
        Product, Favorite.product_id == Product.product_id
    ).filter(Favorite.user_id == user_id).all()

    favorite_products = []
    for favorite, product in favorites:
        favorite_products.append(FavoriteProductResponse(
            product_id=product.product_id,
            product_name=product.product_name,
            price=float(product.price),
            type=product.type,
            description=product.description,
            stock_quantity=product.stock_quantity,
            is_favorite=True
        ))

    return favorite_products


@router.get("/{user_id}/count")
async def get_favorite_count(
        user_id: int,
        current_user: User = Depends(get_current_user),
        db: Session = Depends(get_db)
):
    """获取用户收藏数量"""
    if current_user.user_id != user_id:
        raise HTTPException(status_code=403, detail="无权查看该用户收藏")

    count = db.query(Favorite).filter(Favorite.user_id == user_id).count()

    return {
        "user_id": user_id,
        "favorite_count": count
    }


# 新增端点：兼容前端调用的端点
@router.post("/", response_model=FavoriteOperationResponse)
async def add_favorite_compatible(
        request: FavoriteRequest,
        current_user: User = Depends(get_current_user),
        db: Session = Depends(get_db)
):
    """添加收藏（兼容前端调用）"""
    user_id = current_user.user_id

    product = db.query(Product).filter(Product.product_id == request.product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="商品不存在")

    # 检查是否已经收藏
    existing_favorite = db.query(Favorite).filter(
        Favorite.user_id == user_id,
        Favorite.product_id == request.product_id
    ).first()

    if existing_favorite:
        raise HTTPException(status_code=400, detail="已经收藏过该商品")

    try:
        favorite = Favorite(user_id=user_id, product_id=request.product_id)
        db.add(favorite)
        db.commit()
        db.refresh(favorite)

        return FavoriteOperationResponse(
            success=True,
            message="已添加到收藏"
        )

    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail="添加收藏失败")


@router.delete("/", response_model=FavoriteOperationResponse)
async def remove_favorite_compatible(
        user_id: int = Query(..., description="用户ID"),
        product_id: int = Query(..., description="商品ID"),
        current_user: User = Depends(get_current_user),
        db: Session = Depends(get_db)
):
    """移除收藏（兼容前端调用）"""
    if current_user.user_id != user_id:
        raise HTTPException(status_code=403, detail="无权操作该用户收藏")

    favorite = db.query(Favorite).filter(
        Favorite.user_id == user_id,
        Favorite.product_id == product_id
    ).first()

    if not favorite:
        raise HTTPException(status_code=404, detail="收藏记录不存在")

    try:
        db.delete(favorite)
        db.commit()

        return FavoriteOperationResponse(
            success=True,
            message="已从收藏移除"
        )

    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail="移除收藏失败")


@router.get("/check", response_model=FavoriteResponse)
async def check_favorite_compatible(
        user_id: int = Query(..., description="用户ID"),
        product_id: int = Query(..., description="商品ID"),
        current_user: User = Depends(get_current_user),
        db: Session = Depends(get_db)
):
    """检查商品收藏状态（兼容前端调用）"""
    if current_user.user_id != user_id:
        raise HTTPException(status_code=403, detail="无权查看该用户收藏")

    user = db.query(User).filter(User.user_id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="用户不存在")

    product = db.query(Product).filter(Product.product_id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="商品不存在")

    favorite = db.query(Favorite).filter(
        Favorite.user_id == user_id,
        Favorite.product_id == product_id
    ).first()

    return FavoriteResponse(is_favorite=favorite is not None)

@router.get("/admin/all")
async def get_all_favorites(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin)
):
    """获取所有用户的收藏列表（管理员权限）"""
    favorites = db.query(Favorite).offset(skip).limit(limit).all()
    return favorites

@router.get("/admin/user/{user_id}")
async def get_user_favorites_admin(
    user_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin)
):
    """获取指定用户的所有收藏（管理员权限）"""
    favorites = db.query(Favorite).filter(Favorite.user_id == user_id).all()
    return favorites