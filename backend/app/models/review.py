from sqlalchemy import Column, Integer, Text, Numeric, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base

class Review(Base):
    __tablename__ = "Review"

    user_id = Column(Integer, ForeignKey("User.user_id"), primary_key=True)
    product_id = Column(Integer, ForeignKey("Product.product_id"), primary_key=True)
    content = Column(Text, nullable=False)
    rating = Column(Numeric(2, 1), nullable=False)  # 1.0 到 5.0

    # 关系
    user = relationship("User", back_populates="reviews")
    product = relationship("Product", back_populates="reviews")