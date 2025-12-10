from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from app.database import get_db
from app.models import Product, Favorite, User
from app.schemas import Product as ProductSchema
from app.dependencies import get_current_user_optional, get_current_admin
from pydantic import BaseModel

router = APIRouter(tags=["商品"])

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
        type: Optional[str] = Query(None, description="商品类型筛选"),
        search: Optional[str] = Query(None, description="商品名称搜索"),
        min_price: Optional[float] = Query(None, ge=0, description="最低价格"),
        max_price: Optional[float] = Query(None, ge=0, description="最高价格"),
        in_stock: Optional[bool] = Query(None, description="仅显示有库存"),
        sort_by: Optional[str] = Query("product_id", description="排序字段"),
        sort_order: Optional[str] = Query("asc", regex="^(asc|desc)$", description="排序方向"),
        db: Session = Depends(get_db),
        current_user: Optional[User] = Depends(get_current_user_optional)
):
    """获取商品列表"""
    query = db.query(Product)

    # 应用筛选条件
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

    # 应用排序
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
    """获取单个商品详情"""
    product = db.query(Product).filter(Product.product_id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="商品不存在")
    return product


@router.get("/categories/types")
async def get_product_types(db: Session = Depends(get_db)):
    """获取所有商品分类"""
    types = db.query(Product.type).distinct().all()
    return [type[0] for type in types if type[0]]


@router.get("/{product_id}/stock")
async def get_product_stock(
        product_id: int,
        db: Session = Depends(get_db)
):
    """获取商品库存信息"""
    product = db.query(Product).filter(Product.product_id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="商品不存在")

    return {
        "product_id": product_id,
        "product_name": product.product_name,
        "stock_quantity": product.stock_quantity,
        "in_stock": product.stock_quantity > 0
    }


@router.get("/search/suggestions")
async def get_search_suggestions(
        q: str = Query(..., min_length=1, description="搜索关键词"),
        limit: int = Query(10, le=50, description="建议数量"),
        db: Session = Depends(get_db)
):
    """获取搜索建议"""
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
    """创建商品（管理员权限）"""
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
            "message": "商品创建成功",
            "product_id": new_product.product_id
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"创建商品失败: {str(e)}")


@router.put("/admin/{product_id}")
async def update_product(
        product_id: int,
        product_data: ProductUpdate,
        db: Session = Depends(get_db),
        admin: User = Depends(get_current_admin)
):
    """更新商品信息（管理员权限）"""
    product = db.query(Product).filter(Product.product_id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="商品不存在")

    try:
        update_data = product_data.dict(exclude_unset=True)
        for field, value in update_data.items():
            setattr(product, field, value)

        db.commit()
        db.refresh(product)

        return {
            "success": True,
            "message": "商品更新成功",
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
        raise HTTPException(status_code=500, detail=f"更新商品失败: {str(e)}")


@router.delete("/admin/{product_id}")
async def delete_product(
        product_id: int,
        db: Session = Depends(get_db),
        admin: User = Depends(get_current_admin)
):
    """删除商品（管理员权限）"""
    product = db.query(Product).filter(Product.product_id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="商品不存在")

    try:
        db.delete(product)
        db.commit()

        return {
            "success": True,
            "message": "商品删除成功"
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"删除商品失败: {str(e)}")