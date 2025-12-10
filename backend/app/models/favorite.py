from sqlalchemy import Column, Integer, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base

class Favorite(Base):
    __tablename__ = "Favorite"

    user_id = Column(Integer, ForeignKey("User.user_id"), primary_key=True)
    product_id = Column(Integer, ForeignKey("Product.product_id"), primary_key=True)

    # 关系
    user = relationship("User", back_populates="favorites")
    product = relationship("Product", back_populates="favorites")