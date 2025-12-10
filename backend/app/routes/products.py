from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from app.database import get_db
from app.models import Product, Favorite, User
from app.schemas import Product as ProductSchema
from app.dependencies import get_current_user_optional, get_current_admin
from pydantic import BaseModel

router = APIRouter(tags=["Products"])

class ProductCreate(BaseModel):
    product_name: str
    price: float
    type: str
    description: str
    stock_quantity: int

class ProductUpdate(BaseModel):
    product_name: str = None
    price: float = None
    type: str = None
    description: str = None
    stock_quantity: int = None

@router.get("/", response_model=List[ProductSchema])
async def get_products(
        skip: int = 0,
        limit: int = 100,
        type: Optional[str] = Query(None, description="Product type filter"),
        search: Optional[str] = Query(None, description="Product name search"),
        min_price: Optional[float] = Query(None, ge=0, description="Minimum price"),
        max_price: Optional[float] = Query(None, ge=0, description="Maximum price"),
        in_stock: Optional[bool] = Query(None, description="Only show in-stock items"),
        sort_by: Optional[str] = Query("product_id", description="Sort field"),
        sort_order: Optional[str] = Query("asc", regex="^(asc|desc)$", description="Sort direction"),
        db: Session = Depends(get_db),
        current_user: Optional[User] = Depends(get_current_user_optional)
):
    """Get product list"""
    query = db.query(Product)

    if type:
        query = query.filter(Product.type == type)
    if search:
        query = query.filter(Product.product_name.contains(search))
    if min_price is not None:
        query = query.filter(Product.price >= min_price)
    if max_price is not None:
        query = query.filter(Product.price <= max_price)
    if in_stock:
        query = query.filter(Product.stock_quantity > 0)

    sort_column = getattr(Product, sort_by, Product.product_id)
    if sort_order == "desc":
        sort_column = sort_column.desc()
    query = query.order_by(sort_column)

    products = query.offset(skip).limit(limit).all()
    return products


@router.get("/{product_id}", response_model=ProductSchema)
async def get_product(
        product_id: int,
        db: Session = Depends(get_db)
):
    """Get single product details"""
    product = db.query(Product).filter(Product.product_id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product does not exist")
    return product


@router.get("/categories/types")
async def get_product_types(db: Session = Depends(get_db)):
    """Get all product categories"""
    types = db.query(Product.type).distinct().all()
    return [type[0] for type in types if type[0]]


@router.get("/{product_id}/stock")
async def get_product_stock(
        product_id: int,
        db: Session = Depends(get_db)
):
    """Get product stock information"""
    product = db.query(Product).filter(Product.product_id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product does not exist")

    return {
        "product_id": product_id,
        "product_name": product.product_name,
        "stock_quantity": product.stock_quantity,
        "in_stock": product.stock_quantity > 0
    }


@router.get("/search/suggestions")
async def get_search_suggestions(
        q: str = Query(..., min_length=1, description="Search keyword"),
        limit: int = Query(10, le=50, description="Suggestion count"),
        db: Session = Depends(get_db)
):
    """Get search suggestions"""
    products = db.query(Product).filter(
        Product.product_name.contains(q)
    ).limit(limit).all()

    return {
        "query": q,
        "suggestions": [
            {
                "product_id": p.product_id,
                "product_name": p.product_name,
                "type": p.type,
                "price": float(p.price)
            }
            for p in products
        ]
    }


@router.post("/admin/create")
async def create_product(
        product_data: ProductCreate,
        db: Session = Depends(get_db),
        admin: User = Depends(get_current_admin)
):
    """Create product (admin only)"""
    try:
        new_product = Product(
            product_name=product_data.product_name,
            price=product_data.price,
            type=product_data.type,
            description=product_data.description,
            stock_quantity=product_data.stock_quantity
        )
        db.add(new_product)
        db.commit()
        db.refresh(new_product)

        return {
            "success": True,
            "message": "Product created successfully",
            "product_id": new_product.product_id
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to create product: {str(e)}")


@router.put("/admin/{product_id}")
async def update_product(
        product_id: int,
        product_data: ProductUpdate,
        db: Session = Depends(get_db),
        admin: User = Depends(get_current_admin)
):
    """Update product information (admin only)"""
    product = db.query(Product).filter(Product.product_id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product does not exist")

    try:
        update_data = product_data.dict(exclude_unset=True)
        for field, value in update_data.items():
            setattr(product, field, value)

        db.commit()
        db.refresh(product)

        return {
            "success": True,
            "message": "Product updated successfully",
            "product": {
                "product_id": product.product_id,
                "product_name": product.product_name,
                "price": float(product.price),
                "type": product.type,
                "stock_quantity": product.stock_quantity
            }
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to update product: {str(e)}")


@router.delete("/admin/{product_id}")
async def delete_product(
        product_id: int,
        db: Session = Depends(get_db),
        admin: User = Depends(get_current_admin)
):
    """Delete product (admin only)"""
    product = db.query(Product).filter(Product.product_id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product does not exist")

    try:
        db.delete(product)
        db.commit()

        return {
            "success": True,
            "message": "Product deleted successfully"
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to delete product: {str(e)}")
