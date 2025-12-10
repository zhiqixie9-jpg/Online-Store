from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from pydantic import BaseModel
from typing import List
from app.database import get_db
from app.models import ShoppingCart, CartItem, Product, User
from app.dependencies import get_current_user, validate_positive_quantity, get_current_admin
from app.schemas import CartItem as CartItemSchema

router = APIRouter(tags=["购物车"])


class AddToCartRequest(BaseModel):
    productId: int
    quantity: int


class CartItemResponse(BaseModel):
    product_id: int
    product_name: str
    price: float
    quantity: int
    subtotal: float
    image_url: str = None  # 可扩展字段


class CartResponse(BaseModel):
    cart_id: int
    user_id: int
    items: List[CartItemResponse]
    total: float
    items_count: int


@router.get("/{user_id}", response_model=CartResponse)
async def get_cart(
        user_id: int,
        current_user: User = Depends(get_current_user),
        db: Session = Depends(get_db)
):
    """获取用户购物车"""
    if current_user.user_id != user_id:
        raise HTTPException(status_code=403, detail="无权访问该购物车")

    # 使用joinedload优化查询
    cart = db.query(ShoppingCart).options(
        joinedload(ShoppingCart.cart_items).joinedload(CartItem.product)
    ).filter(ShoppingCart.user_id == user_id).first()

    if not cart:
        cart = ShoppingCart(user_id=user_id)
        db.add(cart)
        db.commit()
        db.refresh(cart)
        # 重新查询以获取关联数据
        cart = db.query(ShoppingCart).options(
            joinedload(ShoppingCart.cart_items).joinedload(CartItem.product)
        ).filter(ShoppingCart.user_id == user_id).first()

    items_with_details = []
    total = 0
    items_count = 0

    for item in cart.cart_items:
        product = item.product
        if not product:
            continue  # 跳过无效商品

        subtotal = float(product.price * item.quantity)
        total += subtotal
        items_count += item.quantity

        items_with_details.append(CartItemResponse(
            product_id=item.product_id,
            product_name=product.product_name,
            price=float(product.price),
            quantity=item.quantity,
            subtotal=subtotal
        ))

    return CartResponse(
        cart_id=cart.cart_id,
        user_id=cart.user_id,
        items=items_with_details,
        total=total,
        items_count=items_count
    )


@router.post("/{user_id}/add")
async def add_to_cart(
        user_id: int,
        request: AddToCartRequest,
        current_user: User = Depends(get_current_user),
        db: Session = Depends(get_db)
):
    """添加商品到购物车"""
    if current_user.user_id != user_id:
        raise HTTPException(status_code=403, detail="无权操作该购物车")

    # 验证数量
    validate_positive_quantity(request.quantity)

    # 获取或创建购物车
    cart = db.query(ShoppingCart).filter(ShoppingCart.user_id == user_id).first()
    if not cart:
        cart = ShoppingCart(user_id=user_id)
        db.add(cart)
        db.commit()
        db.refresh(cart)

    # 检查商品是否存在
    product = db.query(Product).filter(Product.product_id == request.productId).first()
    if not product:
        raise HTTPException(status_code=404, detail="商品不存在")

    # 检查库存
    if product.stock_quantity < request.quantity:
        raise HTTPException(
            status_code=400,
            detail=f"库存不足，当前库存: {product.stock_quantity}"
        )

    # 检查是否已在购物车中
    existing_item = db.query(CartItem).filter(
        CartItem.cart_id == cart.cart_id,
        CartItem.product_id == request.productId
    ).first()

    try:
        if existing_item:
            # 检查更新后的总数量是否超过库存
            new_quantity = existing_item.quantity + request.quantity
            if product.stock_quantity < new_quantity:
                raise HTTPException(
                    status_code=400,
                    detail=f"超过库存限制，当前库存: {product.stock_quantity}"
                )
            existing_item.quantity = new_quantity
        else:
            new_item = CartItem(
                cart_id=cart.cart_id,
                product_id=request.productId,
                quantity=request.quantity
            )
            db.add(new_item)

        db.commit()
        return {
            "success": True,
            "message": "商品已添加到购物车"
        }

    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail="添加购物车失败")


@router.put("/{user_id}/update")
async def update_cart_item(
        user_id: int,
        request: AddToCartRequest,
        current_user: User = Depends(get_current_user),
        db: Session = Depends(get_db)
):
    """更新购物车商品数量"""
    if current_user.user_id != user_id:
        raise HTTPException(status_code=403, detail="无权操作该购物车")

    cart = db.query(ShoppingCart).filter(ShoppingCart.user_id == user_id).first()
    if not cart:
        raise HTTPException(status_code=404, detail="购物车不存在")

    cart_item = db.query(CartItem).filter(
        CartItem.cart_id == cart.cart_id,
        CartItem.product_id == request.productId
    ).first()

    if not cart_item:
        raise HTTPException(status_code=404, detail="购物车中未找到该商品")

    # 检查库存
    product = db.query(Product).filter(Product.product_id == request.productId).first()
    if not product:
        raise HTTPException(status_code=404, detail="商品不存在")

    if request.quantity <= 0:
        # 移除商品
        db.delete(cart_item)
    else:
        if product.stock_quantity < request.quantity:
            raise HTTPException(
                status_code=400,
                detail=f"库存不足，当前库存: {product.stock_quantity}"
            )
        cart_item.quantity = request.quantity

    db.commit()
    return {
        "success": True,
        "message": "购物车已更新"
    }


@router.delete("/{user_id}/remove/{product_id}")
async def remove_from_cart(
        user_id: int,
        product_id: int,
        current_user: User = Depends(get_current_user),
        db: Session = Depends(get_db)
):
    """从购物车移除商品"""
    if current_user.user_id != user_id:
        raise HTTPException(status_code=403, detail="无权操作该购物车")

    cart = db.query(ShoppingCart).filter(ShoppingCart.user_id == user_id).first()
    if not cart:
        raise HTTPException(status_code=404, detail="购物车不存在")

    cart_item = db.query(CartItem).filter(
        CartItem.cart_id == cart.cart_id,
        CartItem.product_id == product_id
    ).first()

    if not cart_item:
        raise HTTPException(status_code=404, detail="购物车中未找到该商品")

    db.delete(cart_item)
    db.commit()

    return {
        "success": True,
        "message": "商品已从购物车移除"
    }


@router.delete("/{user_id}/clear")
async def clear_cart(
        user_id: int,
        current_user: User = Depends(get_current_user),
        db: Session = Depends(get_db)
):
    """清空购物车"""
    if current_user.user_id != user_id:
        raise HTTPException(status_code=403, detail="无权操作该购物车")

    cart = db.query(ShoppingCart).filter(ShoppingCart.user_id == user_id).first()
    if not cart:
        raise HTTPException(status_code=404, detail="购物车不存在")

    try:
        # 删除所有购物车项
        db.query(CartItem).filter(CartItem.cart_id == cart.cart_id).delete()
        db.commit()

        return {
            "success": True,
            "message": "购物车已清空"
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail="清空购物车失败")

@router.get("/admin/all")
async def get_all_carts(
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin)
):
    """获取所有用户的购物车（管理员权限）"""
    carts = db.query(ShoppingCart).all()
    return carts

@router.get("/admin/user/{user_id}")
async def get_user_cart_admin(
    user_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin)
):
    """获取指定用户的购物车（管理员权限）"""
    cart = db.query(ShoppingCart).filter(ShoppingCart.user_id == user_id).first()
    if not cart:
        raise HTTPException(status_code=404, detail="用户购物车不存在")
    return cart