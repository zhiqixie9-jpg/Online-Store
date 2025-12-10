from sqlalchemy import Column, Integer, String, Boolean
from sqlalchemy.orm import relationship
from app.database import Base

class User(Base):
    __tablename__ = "User"

    user_id = Column(Integer, primary_key=True, index=True)
    user_name = Column(String(50), nullable=False, unique=True, index=True)
    password = Column(String(255), nullable=False)
    email = Column(String(100), nullable=False, unique=True)
    tel = Column(String(20), nullable=False)
    is_member = Column(Boolean, default=False)
    is_admin = Column(Boolean, default=False) 


    carts = relationship("ShoppingCart", back_populates="user")
    favorites = relationship("Favorite", back_populates="user")
    orders = relationship("Order", back_populates="user")
    reviews = relationship("Review", back_populates="user")
