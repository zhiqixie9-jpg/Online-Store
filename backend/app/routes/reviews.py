from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Review, User, Product, Order, OrderItem
from app.schemas import Review as ReviewSchema, ReviewCreate
from app.dependencies import get_current_user, get_current_admin
from pydantic import BaseModel
from typing import List, Optional
from decimal import Decimal

router = APIRouter(tags=["评价"])

class ReviewResponse(BaseModel):
    user_id: int
    user_name: str
    product_id: int
    product_name: str
    content: str
    rating: Decimal
    created_at: Optional[str] = None

@router.post("/{user_id}/add", response_model=ReviewSchema)
async def add_review(
    user_id: int,
    review_data: ReviewCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """添加商品评价"""
    if current_user.user_id != user_id:
        raise HTTPException(status_code=403, detail="无权添加评价")

    # 验证用户是否购买过该商品
    has_purchased = db.query(Order).join(OrderItem).filter(
        Order.user_id == user_id,
        Order.status == 'completed',
        OrderItem.product_id == review_data.product_id
    ).first()

    if not has_purchased:
        raise HTTPException(
            status_code=400,
            detail="只有购买过该商品的用户才能进行评价"
        )

    # 检查是否已经评价过
    existing_review = db.query(Review).filter(
        Review.user_id == user_id,
        Review.product_id == review_data.product_id
    ).first()

    if existing_review:
        raise HTTPException(status_code=400, detail="已经评价过该商品")

    # 验证评分范围
    if review_data.rating < Decimal('1.0') or review_data.rating > Decimal('5.0'):
        raise HTTPException(status_code=400, detail="评分必须在1.0到5.0之间")

    try:
        review = Review(
            user_id=user_id,
            product_id=review_data.product_id,
            content=review_data.content,
            rating=review_data.rating
        )
        db.add(review)
        db.commit()
        db.refresh(review)

        return review

    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail="添加评价失败")

@router.get("/product/{product_id}", response_model=List[ReviewResponse])
async def get_product_reviews(
    product_id: int,
    db: Session = Depends(get_db)
):
    """获取商品评价列表"""
    product = db.query(Product).filter(Product.product_id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="商品不存在")

    reviews = db.query(Review, User).join(
        User, Review.user_id == User.user_id
    ).filter(Review.product_id == product_id).all()

    review_responses = []
    for review, user in reviews:
        review_responses.append(ReviewResponse(
            user_id=user.user_id,
            user_name=user.user_name,
            product_id=review.product_id,
            product_name=product.product_name,
            content=review.content,
            rating=review.rating,
            created_at=review.created_at.isoformat() if hasattr(review, 'created_at') and review.created_at else None
        ))

    return review_responses

@router.get("/{user_id}/reviews", response_model=List[ReviewResponse])
async def get_user_reviews(
    user_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """获取用户评价列表"""
    if current_user.user_id != user_id:
        raise HTTPException(status_code=403, detail="无权查看该用户评价")

    reviews = db.query(Review, Product).join(
        Product, Review.product_id == Product.product_id
    ).filter(Review.user_id == user_id).all()

    review_responses = []
    for review, product in reviews:
        review_responses.append(ReviewResponse(
            user_id=user_id,
            user_name=current_user.user_name,
            product_id=review.product_id,
            product_name=product.product_name,
            content=review.content,
            rating=review.rating,
            created_at=review.created_at.isoformat() if hasattr(review, 'created_at') and review.created_at else None
        ))

    return review_responses


@router.get("/admin/all")
async def get_all_reviews(
        skip: int = 0,
        limit: int = 100,
        db: Session = Depends(get_db),
        admin: User = Depends(get_current_admin)
):
    """获取所有评价（管理员权限）"""
    reviews = db.query(Review).offset(skip).limit(limit).all()
    return reviews


@router.delete("/admin/{user_id}/{product_id}")
async def delete_review_admin(
        user_id: int,
        product_id: int,
        db: Session = Depends(get_db),
        admin: User = Depends(get_current_admin)
):
    """删除评价（管理员权限）"""
    review = db.query(Review).filter(
        Review.user_id == user_id,
        Review.product_id == product_id
    ).first()

    if not review:
        raise HTTPException(status_code=404, detail="评价不存在")

    try:
        db.delete(review)
        db.commit()

        return {
            "success": True,
            "message": "评价删除成功"
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"删除评价失败: {str(e)}")