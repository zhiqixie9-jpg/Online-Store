from pydantic import BaseModel, EmailStr
from typing import List, Optional
from decimal import Decimal


# 用户相关模式
class UserBase(BaseModel):
    user_name: str
    email: EmailStr
    tel: str


class UserCreate(UserBase):
    password: str


class UserLogin(BaseModel):
    username: str
    password: str


class User(UserBase):
    user_id: int
    is_member: bool

    class Config:
        from_attributes = True


# 商品相关模式
class ProductBase(BaseModel):
    product_name: str
    price: Decimal
    type: str
    description: str


class ProductCreate(ProductBase):
    stock_quantity: int


class Product(ProductBase):
    product_id: int
    stock_quantity: int

    class Config:
        from_attributes = True


# 购物车相关模式
class CartItemBase(BaseModel):
    product_id: int
    quantity: int


class CartItemCreate(CartItemBase):
    pass


class CartItem(CartItemBase):
    product: Optional[Product] = None

    class Config:
        from_attributes = True


class ShoppingCart(BaseModel):
    cart_id: int
    user_id: int
    cart_items: List[CartItem] = []

    class Config:
        from_attributes = True


# 订单相关模式
class OrderItemBase(BaseModel):
    product_id: int
    quantity: int
    price: Decimal


class OrderItem(OrderItemBase):
    product: Optional[Product] = None

    class Config:
        from_attributes = True


class OrderBase(BaseModel):
    total_amount: Decimal
    recipient: str
    shipping_address: str


class OrderCreate(OrderBase):
    order_items: List[OrderItemBase]


class Order(OrderBase):
    order_id: int
    user_id: int
    status: str
    order_items: List[OrderItem] = []

    class Config:
        from_attributes = True


# 认证响应
class Token(BaseModel):
    access_token: str
    token_type: str
    user_id: int
    user_name: str


class TokenData(BaseModel):
    user_id: Optional[int] = None

# 在现有的 schemas/__init__.py 文件末尾添加以下内容

# 收藏相关模式
class FavoriteBase(BaseModel):
    user_id: int
    product_id: int

class FavoriteCreate(FavoriteBase):
    pass

class Favorite(FavoriteBase):
    class Config:
        from_attributes = True

class FavoriteResponse(BaseModel):
    is_favorite: bool

class FavoriteOperationResponse(BaseModel):
    success: bool
    message: str

# 评价相关模式
class ReviewBase(BaseModel):
    content: str
    rating: Decimal

class ReviewCreate(ReviewBase):
    product_id: int

class Review(ReviewBase):
    user_id: int
    product_id: int

    class Config:
        from_attributes = True