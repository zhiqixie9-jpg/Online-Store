from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from app.routes import auth, users, products, cart, orders, favorites, reviews
from app.database import engine, Base


# 创建数据库表
Base.metadata.create_all(bind=engine)

# 只创建一次 FastAPI 应用
app = FastAPI(
    title="OnlineStore API",
    description="电商平台后端API",
    version="1.0.0"
)

# CORS配置 - 使用完整的 origins 列表
origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:63342",
    "http://127.0.0.1:63342",
    # 添加其他你可能使用的前端地址
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 注册路由
app.include_router(auth.router, prefix="/api/auth", tags=["认证"])
app.include_router(users.router, prefix="/api/users", tags=["用户"])
app.include_router(products.router, prefix="/api/products", tags=["商品"])
app.include_router(cart.router, prefix="/api/cart", tags=["购物车"])
app.include_router(orders.router, prefix="/api/orders", tags=["订单"])
app.include_router(favorites.router, prefix="/api/favorites", tags=["收藏"])
app.include_router(reviews.router, prefix="/api/reviews", tags=["评价"])

@app.get("/")
async def root():
    return {"message": "OnlineStore API"}

@app.get("/health")
async def health_check():
    return {"status": "healthy"}