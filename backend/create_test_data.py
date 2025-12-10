import sys
import os


sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.database import SessionLocal, engine
from app.models import Base, User, Product
from app.utils import get_password_hash


Base.metadata.create_all(bind=engine)


def create_test_data():
    db = SessionLocal()

    try:

        existing_user = db.query(User).filter(User.user_name == "testuser").first()
        if not existing_user:

            test_user = User(
                user_name="testuser",
                password=get_password_hash("testpassword"),
                email="test@example.com",
                tel="1234567890",
                is_member=True
            )
            db.add(test_user)
            print("Create test user: testuser / testpassword")
        else:
            print("Test user already exists, skipping creation.")


        existing_products = db.query(Product).filter(
            Product.product_name.in_(["Laptop", "Smart Phone", "Sneakers"])
        ).all()

        existing_product_names = [p.product_name for p in existing_products]


        products = [
            Product(
                product_name="Laptop",
                price=5999.99,
                type="Electronics",
                description="High-performance laptop, suitable for both office work and gaming.",
                stock_quantity=50
            ),
            Product(
                product_name="Smart Phone",
                price=2999.99,
                type="Electronics",
                description="Latest smartphone models with excellent camera clarity",
                stock_quantity=100
            ),
            Product(
                product_name="Sneakers",
                price=399.99,
                type="Apparel and Accessories",
                description="Comfortable sneakers, suitable for running.",
                stock_quantity=200
            ),
            Product(
                product_name="Wireless Earbuds",
                price=899.99,
                type="Electronics",
                description="High-fidelity wireless Bluetooth headphones/earbuds.",
                stock_quantity=75
            ),
            Product(
                product_name="Backpack",
                price=199.99,
                type="Bags and Accessories",
                description="Multi-functional travel backpack",
                stock_quantity=150
            )
        ]

        new_products_count = 0
        for product in products:
            if product.product_name not in existing_product_names:
                db.add(product)
                new_products_count += 1
                print(f"Creat product: {product.product_name}")

        db.commit()
        print(f"Test data creation completed! Added {new_products_count} new products.")

    except Exception as e:
        db.rollback()
        print(f"Error occurred while creating test data: {e}")
    finally:
        db.close()


if __name__ == "__main__":
    create_test_data()
