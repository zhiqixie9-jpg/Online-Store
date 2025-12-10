from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from pydantic import BaseModel
from typing import List
from app.database import get_db
from app.models import ShoppingCart, CartItem, Product, User
from app.dependencies import get_current_user, validate_positive_quantity, get_current_admin
from app.schemas import CartItem as CartItemSchema

router = APIRouter(tags=["Shopping Cart"])


class AddToCartRequest(BaseModel):
    productId: int
    quantity: int


class CartItemResponse(BaseModel):
    product_id: int
    product_name: str
    price: float
    quantity: int
    subtotal: float
    image_url: str = None 


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

    if current_user.user_id != user_id:
        raise HTTPException(status_code=403, detail="Unauthorized to access this shopping cart.")

 
    cart = db.query(ShoppingCart).options(
        joinedload(ShoppingCart.cart_items).joinedload(CartItem.product)
    ).filter(ShoppingCart.user_id == user_id).first()

    if not cart:
        cart = ShoppingCart(user_id=user_id)
        db.add(cart)
        db.commit()
        db.refresh(cart)

        cart = db.query(ShoppingCart).options(
            joinedload(ShoppingCart.cart_items).joinedload(CartItem.product)
        ).filter(ShoppingCart.user_id == user_id).first()

    items_with_details = []
    total = 0
    items_count = 0

    for item in cart.cart_items:
        product = item.product
        if not product:
            continue  

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

    if current_user.user_id != user_id:
        raise HTTPException(status_code=403, detail="Unauthorized to operate on this shopping cart.")


    validate_positive_quantity(request.quantity)


    cart = db.query(ShoppingCart).filter(ShoppingCart.user_id == user_id).first()
    if not cart:
        cart = ShoppingCart(user_id=user_id)
        db.add(cart)
        db.commit()
        db.refresh(cart)


    product = db.query(Product).filter(Product.product_id == request.productId).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product does not exist.")


    if product.stock_quantity < request.quantity:
        raise HTTPException(
            status_code=400,
            detail=f"Insufficient stock. Current stock: {product.stock_quantity}"
        )


    existing_item = db.query(CartItem).filter(
        CartItem.cart_id == cart.cart_id,
        CartItem.product_id == request.productId
    ).first()

    try:
        if existing_item:

            new_quantity = existing_item.quantity + request.quantity
            if product.stock_quantity < new_quantity:
                raise HTTPException(
                    status_code=400,
                    detail=f"Exceeds stock limit. Current stock: {product.stock_quantity}"
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
            "message": "Product has been added to the shopping cart."
        }

    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail="Failed to add item to the shopping cart.")


@router.put("/{user_id}/update")
async def update_cart_item(
        user_id: int,
        request: AddToCartRequest,
        current_user: User = Depends(get_current_user),
        db: Session = Depends(get_db)
):

    if current_user.user_id != user_id:
        raise HTTPException(status_code=403, detail="Unauthorized to operate on this shopping cart.")

    cart = db.query(ShoppingCart).filter(ShoppingCart.user_id == user_id).first()
    if not cart:
        raise HTTPException(status_code=404, detail="Shopping cart does not exist.")

    cart_item = db.query(CartItem).filter(
        CartItem.cart_id == cart.cart_id,
        CartItem.product_id == request.productId
    ).first()

    if not cart_item:
        raise HTTPException(status_code=404, detail="Product not found in the shopping cart.")


    product = db.query(Product).filter(Product.product_id == request.productId).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product does not exist.")

    if request.quantity <= 0:

        db.delete(cart_item)
    else:
        if product.stock_quantity < request.quantity:
            raise HTTPException(
                status_code=400,
                detail=f"Insufficient stock. Current stock: {product.stock_quantity}"
            )
        cart_item.quantity = request.quantity

    db.commit()
    return {
        "success": True,
        "message": "Shopping cart has been updated."
    }


@router.delete("/{user_id}/remove/{product_id}")
async def remove_from_cart(
        user_id: int,
        product_id: int,
        current_user: User = Depends(get_current_user),
        db: Session = Depends(get_db)
):

    if current_user.user_id != user_id:
        raise HTTPException(status_code=403, detail="Unauthorized to operate on this shopping cart.")

    cart = db.query(ShoppingCart).filter(ShoppingCart.user_id == user_id).first()
    if not cart:
        raise HTTPException(status_code=404, detail="Shopping cart does not exist.")

    cart_item = db.query(CartItem).filter(
        CartItem.cart_id == cart.cart_id,
        CartItem.product_id == product_id
    ).first()

    if not cart_item:
        raise HTTPException(status_code=404, detail="Product not found in the shopping cart.")

    db.delete(cart_item)
    db.commit()

    return {
        "success": True,
        "message": "Product has been removed from the shopping cart."
    }


@router.delete("/{user_id}/clear")
async def clear_cart(
        user_id: int,
        current_user: User = Depends(get_current_user),
        db: Session = Depends(get_db)
):
    """Clear shopping cart"""
    if current_user.user_id != user_id:
        raise HTTPException(status_code=403, detail="Unauthorized to operate on this shopping cart")

    cart = db.query(ShoppingCart).filter(ShoppingCart.user_id == user_id).first()
    if not cart:
        raise HTTPException(status_code=404, detail="Shopping cart does not exist.")

    try:
        db.query(CartItem).filter(CartItem.cart_id == cart.cart_id).delete()
        db.commit()

        return {
            "success": True,
            "message": "Shopping cart has been cleared"
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail="Failed to clear shopping cart")

@router.get("/admin/all")
async def get_all_carts(
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin)
):
    """Get all shopping carts (admin only)"""
    carts = db.query(ShoppingCart).all()
    return carts

@router.get("/admin/user/{user_id}")
async def get_user_cart_admin(
    user_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin)
):
    """Get specific user's shopping cart (admin only)"""
    cart = db.query(ShoppingCart).filter(ShoppingCart.user_id == user_id).first()
    if not cart:
        raise HTTPException(status_code=404, detail="User shopping cart does not exist")
    return cart
