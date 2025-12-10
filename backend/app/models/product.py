from sqlalchemy import Column, Integer, String, Text, Numeric
from sqlalchemy.orm import relationship
from app.database import Base

class Product(Base):
    __tablename__ = "Product"

    product_id = Column(Integer, primary_key=True, index=True)
    product_name = Column(String(100), nullable=False)
    price = Column(Numeric(10, 2), nullable=False)
    type = Column(String(50), nullable=False)
    description = Column(Text, nullable=False)
    stock_quantity = Column(Integer, default=0)


    cart_items = relationship("CartItem", back_populates="product")
    order_items = relationship("OrderItem", back_populates="product")
    favorites = relationship("Favorite", back_populates="product")
    reviews = relationship("Review", back_populates="product")
