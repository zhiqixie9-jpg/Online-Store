import sys
import os

# 添加项目根目录到 Python 路径
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.database import SessionLocal, engine
from app.models import Base, User, Product
from app.utils import get_password_hash

# 创建所有表
Base.metadata.create_all(bind=engine)


def create_test_data():
    db = SessionLocal()

    try:
        # 检查测试用户是否已存在
        existing_user = db.query(User).filter(User.user_name == "testuser").first()
        if not existing_user:
            # 创建测试用户
            test_user = User(
                user_name="testuser",
                password=get_password_hash("testpassword"),
                email="test@example.com",
                tel="1234567890",
                is_member=True
            )
            db.add(test_user)
            print("创建测试用户: testuser / testpassword")
        else:
            print("测试用户已存在，跳过创建")

        # 检查商品是否已存在
        existing_products = db.query(Product).filter(
            Product.product_name.in_(["笔记本电脑", "智能手机", "运动鞋"])
        ).all()

        existing_product_names = [p.product_name for p in existing_products]

        # 创建测试商品
        products = [
            Product(
                product_name="笔记本电脑",
                price=5999.99,
                type="电子产品",
                description="高性能笔记本电脑，适合办公和游戏",
                stock_quantity=50
            ),
            Product(
                product_name="智能手机",
                price=2999.99,
                type="电子产品",
                description="最新款智能手机，拍照清晰",
                stock_quantity=100
            ),
            Product(
                product_name="运动鞋",
                price=399.99,
                type="服装鞋帽",
                description="舒适的运动鞋，适合跑步",
                stock_quantity=200
            ),
            Product(
                product_name="无线耳机",
                price=899.99,
                type="电子产品",
                description="高音质无线蓝牙耳机",
                stock_quantity=75
            ),
            Product(
                product_name="背包",
                price=199.99,
                type="箱包配饰",
                description="多功能旅行背包",
                stock_quantity=150
            )
        ]

        new_products_count = 0
        for product in products:
            if product.product_name not in existing_product_names:
                db.add(product)
                new_products_count += 1
                print(f"创建商品: {product.product_name}")

        db.commit()
        print(f"测试数据创建完成！新增 {new_products_count} 个商品")

    except Exception as e:
        db.rollback()
        print(f"创建测试数据时出错: {e}")
    finally:
        db.close()


if __name__ == "__main__":
    create_test_data()