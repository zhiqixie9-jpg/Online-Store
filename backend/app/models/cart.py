from sqlalchemy import Column, Integer, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base

class ShoppingCart(Base):
    __tablename__ = "ShoppingCart"

    cart_id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("User.user_id"), nullable=False)


    user = relationship("User", back_populates="carts")
    cart_items = relationship("CartItem", back_populates="cart")

class CartItem(Base):
    __tablename__ = "CartItem"

    cart_id = Column(Integer, ForeignKey("ShoppingCart.cart_id"), primary_key=True)
    product_id = Column(Integer, ForeignKey("Product.product_id"), primary_key=True)
    quantity = Column(Integer, nullable=False, default=1)


    cart = relationship("ShoppingCart", back_populates="cart_items")
    product = relationship("Product", back_populates="cart_items")
