from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session, joinedload
from pydantic import BaseModel
from typing import List, Dict, Any
from datetime import datetime, timedelta
from app.database import get_db
from app.models import Order, OrderItem, Product, ShoppingCart, CartItem, User
from app.dependencies import get_current_user, get_current_admin
from app.utils import update_member_status

router = APIRouter()


class OrderCreateRequest(BaseModel):
    recipient: str
    shipping_address: str


class OrderItemResponse(BaseModel):
    product_id: int
    product_name: str
    quantity: int
    price: float
    subtotal: float


class OrderResponse(BaseModel):
    order_id: int
    total_amount: float
    recipient: str
    shipping_address: str
    status: str
    created_at: str
    items: List[OrderItemResponse]

class OrderStatusUpdate(BaseModel):
    status: str

@router.get("/user/{user_id}", response_model=List[OrderResponse])
async def get_user_orders(
        user_id: int,
        current_user: User = Depends(get_current_user),
        db: Session = Depends(get_db)
):
    """Get user order list"""
    if current_user.user_id != user_id:
        raise HTTPException(status_code=403, detail="Unauthorized to view this user's orders")

    orders = db.query(Order).options(
        joinedload(Order.order_items).joinedload(OrderItem.product)
    ).filter(Order.user_id == user_id).order_by(Order.created_at.desc()).all()

    orders_with_items = []
    for order in orders:
        items_with_details = []
        for item in order.order_items:
            product = item.product
            items_with_details.append(OrderItemResponse(
                product_id=item.product_id,
                product_name=product.product_name if product else "Unknown product",
                quantity=item.quantity,
                price=float(item.price),
                subtotal=float(item.price * item.quantity)
            ))

        orders_with_items.append(OrderResponse(
            order_id=order.order_id,
            total_amount=float(order.total_amount),
            recipient=order.recipient,
            shipping_address=order.shipping_address,
            status=order.status,
            created_at=order.created_at.isoformat() if order.created_at else None,
            items=items_with_details
        ))

    return orders_with_items


@router.post("/create")
async def create_order(
        order_data: OrderCreateRequest,
        current_user: User = Depends(get_current_user),
        db: Session = Depends(get_db),
        background_tasks: BackgroundTasks = None
):
    """Create order"""
    try:
        cart = db.query(ShoppingCart).options(
            joinedload(ShoppingCart.cart_items).joinedload(CartItem.product)
        ).filter(ShoppingCart.user_id == current_user.user_id).first()

        if not cart:
            raise HTTPException(status_code=404, detail="Shopping cart does not exist")
        if not cart.cart_items:
            raise HTTPException(status_code=400, detail="Shopping cart is empty")

        total_amount = 0
        order_items_data = []
        insufficient_stock = []

        for item in cart.cart_items:
            product = item.product
            if not product:
                continue

            if product.stock_quantity < item.quantity:
                insufficient_stock.append({
                    "product_name": product.product_name,
                    "requested": item.quantity,
                    "available": product.stock_quantity
                })
            else:
                item_total = product.price * item.quantity
                total_amount += item_total
                order_items_data.append({
                    "product_id": item.product_id,
                    "quantity": item.quantity,
                    "price": product.price
                })

        if insufficient_stock:
            raise HTTPException(
                status_code=400,
                detail={
                    "message": "Some products have insufficient stock",
                    "insufficient_items": insufficient_stock
                }
            )

        if not order_items_data:
            raise HTTPException(status_code=400, detail="No items available for order")

        new_order = Order(
            user_id=current_user.user_id,
            total_amount=total_amount,
            recipient=order_data.recipient,
            shipping_address=order_data.shipping_address,
            status="pending",
            created_at=datetime.utcnow()
        )

        db.add(new_order)
        db.flush()

        for item_data in order_items_data:
            order_item = OrderItem(
                order_id=new_order.order_id,
                product_id=item_data["product_id"],
                quantity=item_data["quantity"],
                price=item_data["price"]
            )
            db.add(order_item)

            product = db.query(Product).filter(
                Product.product_id == item_data["product_id"]
            ).with_for_update().first()
            product.stock_quantity -= item_data["quantity"]

        for item_data in order_items_data:
            cart_item = db.query(CartItem).filter(
                CartItem.cart_id == cart.cart_id,
                CartItem.product_id == item_data["product_id"]
            ).first()
            if cart_item:
                db.delete(cart_item)

        db.commit()

        if background_tasks:
            background_tasks.add_task(update_member_status, db, current_user.user_id)

        return {
            "success": True,
            "message": "Order created successfully",
            "order_id": new_order.order_id,
            "total_amount": float(total_amount)
        }

    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to create order: {str(e)}")


@router.get("/{order_id}")
async def get_order_detail(
        order_id: int,
        current_user: User = Depends(get_current_user),
        db: Session = Depends(get_db)
):
    """Get order details"""
    order = db.query(Order).options(
        joinedload(Order.order_items).joinedload(OrderItem.product)
    ).filter(Order.order_id == order_id).first()

    if not order:
        raise HTTPException(status_code=404, detail="Order does not exist")

    if order.user_id != current_user.user_id:
        raise HTTPException(status_code=403, detail="Unauthorized to view this order")

    items_with_details = []
    for item in order.order_items:
        product = item.product
        items_with_details.append(OrderItemResponse(
            product_id=item.product_id,
            product_name=product.product_name if product else "Unknown product",
            quantity=item.quantity,
            price=float(item.price),
            subtotal=float(item.price * item.quantity)
        ))

    return OrderResponse(
        order_id=order.order_id,
        total_amount=float(order.total_amount),
        recipient=order.recipient,
        shipping_address=order.shipping_address,
        status=order.status,
        created_at=order.created_at.isoformat() if order.created_at else None,
        items=items_with_details
    )


@router.put("/{order_id}/cancel")
async def cancel_order(
        order_id: int,
        current_user: User = Depends(get_current_user),
        db: Session = Depends(get_db)
):
    """Cancel order"""
    try:
        order = db.query(Order).filter(Order.order_id == order_id).first()
        if not order:
            raise HTTPException(status_code=404, detail="Order does not exist")

        if order.user_id != current_user.user_id:
            raise HTTPException(status_code=403, detail="Unauthorized to cancel this order")

        if order.status != "pending":
            raise HTTPException(status_code=400, detail="Only pending orders can be cancelled")

        order_items = db.query(OrderItem).filter(OrderItem.order_id == order_id).all()
        for item in order_items:
            product = db.query(Product).filter(Product.product_id == item.product_id).first()
            if product:
                product.stock_quantity += item.quantity

        order.status = "cancelled"
        db.commit()

        return {
            "success": True,
            "message": "Order cancelled successfully"
        }

    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to cancel order: {str(e)}")


@router.put("/{order_id}/complete")
async def complete_order(
        order_id: int,
        background_tasks: BackgroundTasks,
        current_user: User = Depends(get_current_user),
        db: Session = Depends(get_db)
):
    """Complete order"""
    order = db.query(Order).filter(Order.order_id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order does not exist")

    if order.user_id != current_user.user_id:
        raise HTTPException(status_code=403, detail="Unauthorized to operate on this order")

    if order.status != 'shipped':
        raise HTTPException(status_code=400, detail="Only shipped orders can be completed")

    try:
        order.status = 'completed'
        db.commit()

        background_tasks.add_task(update_member_status, db, order.user_id)

        return {
            "success": True,
            "message": "Order completed successfully"
        }

    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to complete order: {str(e)}")


@router.put("/auto-complete-old-orders")
async def auto_complete_old_orders(
        db: Session = Depends(get_db),
        admin: User = Depends(get_current_admin)
):
    """Auto-complete old orders (admin only)"""
    try:
        fifteen_days_ago = datetime.utcnow() - timedelta(days=15)

        old_shipped_orders = db.query(Order).filter(
            Order.status == 'shipped',
            Order.created_at <= fifteen_days_ago
        ).all()

        updated_orders = []
        updated_users = set()

        for order in old_shipped_orders:
            order.status = 'completed'
            updated_orders.append(order.order_id)
            updated_users.add(order.user_id)

        if updated_orders:
            db.commit()

            for user_id in updated_users:
                update_member_status(db, user_id)

            return {
                "success": True,
                "message": f"Auto-completed {len(updated_orders)} orders",
                "updated_orders": updated_orders,
                "updated_users": list(updated_users)
            }
        else:
            return {
                "success": True,
                "message": "No orders need to be auto-completed",
                "updated_orders": [],
                "updated_users": []
            }

    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to auto-complete orders: {str(e)}")


@router.get("/admin/all")
async def get_all_orders(
        skip: int = 0,
        limit: int = 100,
        db: Session = Depends(get_db),
        admin: User = Depends(get_current_admin)
):
    """Get all orders (admin only)"""
    orders = db.query(Order).options(
        joinedload(Order.order_items).joinedload(OrderItem.product)
    ).order_by(Order.created_at.desc()).offset(skip).limit(limit).all()

    orders_with_items = []
    for order in orders:
        items_with_details = []
        for item in order.order_items:
            product = item.product
            items_with_details.append({
                "product_id": item.product_id,
                "product_name": product.product_name if product else "Unknown product",
                "quantity": item.quantity,
                "price": float(item.price),
                "subtotal": float(item.price * item.quantity)
            })

        orders_with_items.append({
            "order_id": order.order_id,
            "user_id": order.user_id,
            "total_amount": float(order.total_amount),
            "recipient": order.recipient,
            "shipping_address": order.shipping_address,
            "status": order.status,
            "created_at": order.created_at.isoformat() if order.created_at else None,
            "items": items_with_details
        })

    return orders_with_items


@router.get("/admin/status/{status}")
async def get_orders_by_status(
        status: str,
        db: Session = Depends(get_db),
        admin: User = Depends(get_current_admin)
):
    """Get orders by status (admin only)"""
    orders = db.query(Order).filter(Order.status == status).all()
    return orders


@router.put("/admin/{order_id}/status")
async def update_order_status_admin(
        order_id: int,
        status_update: OrderStatusUpdate,
        db: Session = Depends(get_db),
        admin: User = Depends(get_current_admin)
):
    """Update order status (admin only)"""
    order = db.query(Order).filter(Order.order_id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order does not exist")

    status = status_update.status

    valid_statuses = ['pending', 'paid', 'shipped', 'completed', 'cancelled']
    if status not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"Invalid status, must be one of: {', '.join(valid_statuses)}")

    try:
        order.status = status
        db.commit()

        return {
            "success": True,
            "message": f"Order status updated to: {status}",
            "order_id": order_id,
            "status": status
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to update order status: {str(e)}")


@router.post("/{order_id}/pay")
async def pay_order(
        order_id: int,
        db: Session = Depends(get_db),
        admin: User = Depends(get_current_user)
):
    """Pay for order (simulated payment)"""
    order = db.query(Order).filter(Order.order_id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order does not exist")

    if order.status != 'pending':
        raise HTTPException(status_code=400, detail="Only pending orders can be paid")

    try:
        order.status = 'paid'
        db.commit()

        return {
            "success": True,
            "message": "Payment successful",
            "order_id": order_id,
            "status": "paid"
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Payment failed: {str(e)}")
