from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Favorite, User, Product
from app.schemas import FavoriteResponse, FavoriteOperationResponse
from app.dependencies import get_current_user, get_current_admin
from pydantic import BaseModel
from typing import List

router = APIRouter(tags=["Favorites"])


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
    """Check favorite status"""
    if current_user.user_id != user_id:
        raise HTTPException(status_code=403, detail="Unauthorized to view this user's favorites")

    user = db.query(User).filter(User.user_id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User does not exist")

    product = db.query(Product).filter(Product.product_id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product does not exist")

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
    """Add to favorites"""
    if current_user.user_id != user_id:
        raise HTTPException(status_code=403, detail="Unauthorized to operate on this user's favorites")

    user = db.query(User).filter(User.user_id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User does not exist")

    product = db.query(Product).filter(Product.product_id == request.product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product does not exist")

    existing_favorite = db.query(Favorite).filter(
        Favorite.user_id == user_id,
        Favorite.product_id == request.product_id
    ).first()

    if existing_favorite:
        raise HTTPException(status_code=400, detail="Product already in favorites")

    try:
        favorite = Favorite(user_id=user_id, product_id=request.product_id)
        db.add(favorite)
        db.commit()
        db.refresh(favorite)

        return FavoriteOperationResponse(
            success=True,
            message="Added to favorites"
        )

    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail="Failed to add to favorites")


@router.delete("/{user_id}/remove/{product_id}", response_model=FavoriteOperationResponse)
async def remove_favorite(
        user_id: int,
        product_id: int,
        current_user: User = Depends(get_current_user),
        db: Session = Depends(get_db)
):
    """Remove from favorites"""
    if current_user.user_id != user_id:
        raise HTTPException(status_code=403, detail="Unauthorized to operate on this user's favorites")

    favorite = db.query(Favorite).filter(
        Favorite.user_id == user_id,
        Favorite.product_id == product_id
    ).first()

    if not favorite:
        raise HTTPException(status_code=404, detail="Favorite record does not exist")

    try:
        db.delete(favorite)
        db.commit()

        return FavoriteOperationResponse(
            success=True,
            message="Removed from favorites"
        )

    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail="Failed to remove from favorites")


@router.get("/{user_id}", response_model=List[FavoriteProductResponse])
async def get_user_favorites(
        user_id: int,
        current_user: User = Depends(get_current_user),
        db: Session = Depends(get_db)
):
    """Get user's favorites list"""
    if current_user.user_id != user_id:
        raise HTTPException(status_code=403, detail="Unauthorized to view this user's favorites")

    user = db.query(User).filter(User.user_id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User does not exist")

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
    """Get user's favorites count"""
    if current_user.user_id != user_id:
        raise HTTPException(status_code=403, detail="Unauthorized to view this user's favorites")

    count = db.query(Favorite).filter(Favorite.user_id == user_id).count()

    return {
        "user_id": user_id,
        "favorite_count": count
    }


@router.post("/", response_model=FavoriteOperationResponse)
async def add_favorite_compatible(
        request: FavoriteRequest,
        current_user: User = Depends(get_current_user),
        db: Session = Depends(get_db)
):
    """Add to favorites (compatible endpoint)"""
    user_id = current_user.user_id

    product = db.query(Product).filter(Product.product_id == request.product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product does not exist")

    existing_favorite = db.query(Favorite).filter(
        Favorite.user_id == user_id,
        Favorite.product_id == request.product_id
    ).first()

    if existing_favorite:
        raise HTTPException(status_code=400, detail="Product already in favorites")

    try:
        favorite = Favorite(user_id=user_id, product_id=request.product_id)
        db.add(favorite)
        db.commit()
        db.refresh(favorite)

        return FavoriteOperationResponse(
            success=True,
            message="Added to favorites"
        )

    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail="Failed to add to favorites")


@router.delete("/", response_model=FavoriteOperationResponse)
async def remove_favorite_compatible(
        user_id: int = Query(..., description="User ID"),
        product_id: int = Query(..., description="Product ID"),
        current_user: User = Depends(get_current_user),
        db: Session = Depends(get_db)
):
    """Remove from favorites (compatible endpoint)"""
    if current_user.user_id != user_id:
        raise HTTPException(status_code=403, detail="Unauthorized to operate on this user's favorites")

    favorite = db.query(Favorite).filter(
        Favorite.user_id == user_id,
        Favorite.product_id == product_id
    ).first()

    if not favorite:
        raise HTTPException(status_code=404, detail="Favorite record does not exist")

    try:
        db.delete(favorite)
        db.commit()

        return FavoriteOperationResponse(
            success=True,
            message="Removed from favorites"
        )

    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail="Failed to remove from favorites")


@router.get("/check", response_model=FavoriteResponse)
async def check_favorite_compatible(
        user_id: int = Query(..., description="User ID"),
        product_id: int = Query(..., description="Product ID"),
        current_user: User = Depends(get_current_user),
        db: Session = Depends(get_db)
):
    """Check favorite status (compatible endpoint)"""
    if current_user.user_id != user_id:
        raise HTTPException(status_code=403, detail="Unauthorized to view this user's favorites")

    user = db.query(User).filter(User.user_id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User does not exist")

    product = db.query(Product).filter(Product.product_id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product does not exist")

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
    """Get all users' favorites (admin only)"""
    favorites = db.query(Favorite).offset(skip).limit(limit).all()
    return favorites

@router.get("/admin/user/{user_id}")
async def get_user_favorites_admin(
    user_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin)
):
    """Get specific user's favorites (admin only)"""
    favorites = db.query(Favorite).filter(Favorite.user_id == user_id).all()
    return favorites
