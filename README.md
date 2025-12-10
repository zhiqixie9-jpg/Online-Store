# Online Store Project

This is a complete full-stack online store system featuring a front-end and back-end separated architecture. It supports user authentication, product management, shopping cart, order processing, favorites, and other functions.



## 1 Project Structural

### 1.1 Backend Structure
```text
backend/
├── app/
│   ├── _\_init\_\_.py
│   ├── main.py
│   ├── database.py
│   ├── models/
│   ├── schemas/
│   ├── routes/
│   └── utils/
├── requirements.txt
└── run.py
```
### 1.2 Frontend Structure
```text
frontend/
├── index.html
├── ......
├── css/
│   └── style.css
├── js/
│   ├── core/
│   ├── modules
│   ├── admin.js
│   └── main.js
└── images/
```



## 2 Technology Stack

### 2.1 Backend

- Python 3.9+ - Main programming language 
- FastAPI - High-performance Web Framework 
- SQLAlchemy - ORM Database Tool 
- SQLite - A lightweight database 
- JWT - JSON Web Token Authentication 
- Pydantic - Data Validation and Serialization

### 2.2 Frontend

- HTML5 - Page Structure 
- CSS3 - Styling Design 
- JavaScript (ES6+) - Interactive Logic 
- Bootstrap 5 - Responsive UI Framework 
- Fetch API - HTTP Request Handling



## 3 Dependency Installation

run code:
```bash
cd backend

pip install -r requirements.txt
```

requirements.txt:
```text
fastapi==0.104.1
uvicorn==0.24.0
sqlalchemy==2.0.23
python-jose==3.3.0
passlib==1.7.4
bcrypt==3.2.0
python-multipart==0.0.6
email-validator==2.1.0
```

## 4 Run the Project

### 4.1 Start the Backend Server.
run code:
```bash
cd backend

python run.py
```

The backend service will start at http://localhost:8000 and hot reload will be enabled automatically.

### 4.2 Visit the Frontend Page

Open your browser and visit the following address: 
- Home page of the mall: http://localhost:63342/frontend/index.html 
- Management backend: http://localhost:63342/frontend/admin.html 
- Login page: http://localhost:63342/frontend/login.html

### 4.3 API Documentation

FastAPI automatically generates interactive API documentation: 
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc



## 5 Database Model

### 5.1 Core Table

**User**

- user_id: INTEGER, primary key, user ID 
- user_name: VARCHAR(50), User name, unique 
- password: VARCHAR(255), encrypted password 
- email: VARCHAR(100), Email, unique 
- tel: VARCHAR(20), Contact phone number 
- is_member: BOOLEAN, Member status (True/False) 
- is_admin: BOOLEAN, administrator flag (True/False)

**Product**
- product_id: INTEGER, primary key, product ID 
- product_name: VARCHAR(100), Product Name 
- price: NUMERIC(10,2), price (with 2 decimal places) 
- Type: VARCHAR(50), Product category 
- Description: TEXT, Product Description 
- stock_quantity: INTEGER, inventory quantity

**Order**

- order_id: INTEGER, primary key, order ID 
- user_id: INTEGER, foreign key, associated with user 
- total_amount: NUMERIC(10,2), total order amount 
- recipient: VARCHAR(100), Name of the consignee 
- shipping_address: TEXT, delivery address 
- status: VARCHAR(50), order status 
- created_at: DATETIME, creation time

**ShoppingCart**
- cart_id: INTEGER, primary key, shopping cart ID 
- user_id: INTEGER, foreign key, associated with the user

### 5.2 Association Table (composite primary key)
**CartItem**
- cart_id: INTEGER + product_id: INTEGER, composite primary key 
- quantity: INTEGER, quantity of goods 

**OrderItem**
- order_id: INTEGER + product_id: INTEGER, composite primary key 
- quantity: INTEGER, purchase quantity 
- Price: NUMERIC(10,2), the price at the time of placing an order. 

**Favorite**
- user_id: INTEGER 
- product_id: INTEGER, composite primary key 

**Review**
- user_id: INTEGER + product_id: INTEGER, composite primary key 
- Content: TEXT, Evaluation content 
- Rating: NUMERIC(2,1), score (with one decimal place)



## 6 Authentication system

The project uses the Bearer Token authentication mechanism: 
1. **User registration/login**: Obtain access token and refresh token 
2. **Token refresh**: Automatic refresh of access token before expiration 
3. **Permission control**: 
	- Ordinary users can only access their own resources. 
	- Administrator users can access all resources (controlled by the is_admin field).
