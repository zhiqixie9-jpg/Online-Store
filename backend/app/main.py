from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from app.routes import auth, users, products, cart, orders, favorites, reviews
from app.database import engine, Base



Base.metadata.create_all(bind=engine)


app = FastAPI(
    title="OnlineStore API",
    description="Backend API for E-commerce Platform",
    version="1.0.0"
)


origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:63342",
    "http://127.0.0.1:63342",

]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


app.include_router(auth.router, prefix="/api/auth", tags=["Authentication"])
app.include_router(users.router, prefix="/api/users", tags=["User"])
app.include_router(products.router, prefix="/api/products", tags=["Product"])
app.include_router(cart.router, prefix="/api/cart", tags=["Shopping Cart"])
app.include_router(orders.router, prefix="/api/orders", tags=["Order"])
app.include_router(favorites.router, prefix="/api/favorites", tags=["Favorites"])
app.include_router(reviews.router, prefix="/api/reviews", tags=["Review"])

@app.get("/")
async def root():
    return {"message": "OnlineStore API"}

@app.get("/health")
async def health_check():
    return {"status": "healthy"}
