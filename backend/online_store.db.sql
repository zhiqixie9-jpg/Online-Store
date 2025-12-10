BEGIN TRANSACTION;
CREATE TABLE IF NOT EXISTS "Admin" (
	admin_id INTEGER NOT NULL, 
	admin_name VARCHAR(50) NOT NULL, 
	password VARCHAR(255) NOT NULL, 
	PRIMARY KEY (admin_id), 
	UNIQUE (admin_name)
);
CREATE TABLE IF NOT EXISTS "CartItem" (
	"cart_id"	INTEGER NOT NULL,
	"product_id"	INTEGER NOT NULL,
	"quantity"	INTEGER NOT NULL,
	PRIMARY KEY("cart_id","product_id"),
	FOREIGN KEY("cart_id") REFERENCES "ShoppingCart"("cart_id"),
	FOREIGN KEY("product_id") REFERENCES "Product"("product_id")
);
CREATE TABLE IF NOT EXISTS "Favorite" (
	user_id INTEGER NOT NULL, 
	product_id INTEGER NOT NULL, 
	PRIMARY KEY (user_id, product_id), 
	FOREIGN KEY(user_id) REFERENCES "User" (user_id), 
	FOREIGN KEY(product_id) REFERENCES "Product" (product_id)
);
CREATE TABLE IF NOT EXISTS "Order" (
	order_id INTEGER NOT NULL, 
	user_id INTEGER NOT NULL, 
	total_amount NUMERIC(10, 2) NOT NULL, 
	recipient VARCHAR(100) NOT NULL, 
	shipping_address TEXT NOT NULL, 
	status VARCHAR(50) NOT NULL, created_at DATETIME, 
	PRIMARY KEY (order_id), 
	FOREIGN KEY(user_id) REFERENCES "User" (user_id)
);
CREATE TABLE IF NOT EXISTS "OrderItem" (
	order_id INTEGER NOT NULL, 
	product_id INTEGER NOT NULL, 
	quantity INTEGER NOT NULL, 
	price NUMERIC(10, 2) NOT NULL, 
	PRIMARY KEY (order_id, product_id), 
	FOREIGN KEY(order_id) REFERENCES "Order" (order_id), 
	FOREIGN KEY(product_id) REFERENCES "Product" (product_id)
);
CREATE TABLE IF NOT EXISTS "Product" (
	product_id INTEGER NOT NULL, 
	product_name VARCHAR(100) NOT NULL, 
	price NUMERIC(10, 2) NOT NULL, 
	type VARCHAR(50) NOT NULL, 
	description TEXT NOT NULL, 
	stock_quantity INTEGER, 
	PRIMARY KEY (product_id)
);
CREATE TABLE IF NOT EXISTS "Review" (
	user_id INTEGER NOT NULL, 
	product_id INTEGER NOT NULL, 
	content TEXT NOT NULL, 
	rating NUMERIC(2, 1) NOT NULL, 
	PRIMARY KEY (user_id, product_id), 
	FOREIGN KEY(user_id) REFERENCES "User" (user_id), 
	FOREIGN KEY(product_id) REFERENCES "Product" (product_id)
);
CREATE TABLE IF NOT EXISTS "ShoppingCart" (
	cart_id INTEGER NOT NULL, 
	user_id INTEGER NOT NULL, 
	PRIMARY KEY (cart_id), 
	FOREIGN KEY(user_id) REFERENCES "User" (user_id)
);
CREATE TABLE IF NOT EXISTS "User" (
	user_id INTEGER NOT NULL, 
	user_name VARCHAR(50) NOT NULL, 
	password VARCHAR(255) NOT NULL, 
	email VARCHAR(100) NOT NULL, 
	tel VARCHAR(20) NOT NULL, 
	is_member BOOLEAN, 
	PRIMARY KEY (user_id), 
	UNIQUE (email)
);
INSERT INTO "Favorite" VALUES (2,2);
INSERT INTO "Favorite" VALUES (2,1);
INSERT INTO "Order" VALUES (1,2,1099.98,'undefined','test address (电话: 12345678900)','pending','2025-10-30 19:30:08.143589');
INSERT INTO "Order" VALUES (2,2,1099.98,'testuser2','test address (电话: 12345678900)','pending','2025-10-31 07:42:15.709464');
INSERT INTO "Order" VALUES (3,3,8999.98,'testuser3','test address (电话: 12345678900)','pending','2025-10-31 08:43:50.322389');
INSERT INTO "OrderItem" VALUES (1,4,1,899.99);
INSERT INTO "OrderItem" VALUES (1,5,1,199.99);
INSERT INTO "OrderItem" VALUES (2,4,1,899.99);
INSERT INTO "OrderItem" VALUES (2,5,1,199.99);
INSERT INTO "OrderItem" VALUES (3,1,1,5999.99);
INSERT INTO "OrderItem" VALUES (3,2,1,2999.99);
INSERT INTO "Product" VALUES (1,'笔记本电脑',5999.99,'电子产品','高性能笔记本电脑，适合办公和游戏',47);
INSERT INTO "Product" VALUES (2,'智能手机',2999.99,'电子产品','最新款智能手机，拍照清晰',99);
INSERT INTO "Product" VALUES (3,'运动鞋',399.99,'服装鞋帽','舒适的运动鞋，适合跑步',200);
INSERT INTO "Product" VALUES (4,'无线耳机',899.99,'电子产品','高音质无线蓝牙耳机',73);
INSERT INTO "Product" VALUES (5,'背包',199.99,'箱包配饰','多功能旅行背包',147);
INSERT INTO "ShoppingCart" VALUES (1,2);
INSERT INTO "ShoppingCart" VALUES (2,3);
INSERT INTO "User" VALUES (1,'testuser','$2b$12$ln8YYcpf476FvOPdg52UTekaIhhkSU5xq5SOswlQWAEF0tveLhyWe','test@example.com','1234567890',1);
INSERT INTO "User" VALUES (2,'testuser2','$2b$12$StdDADaABguz9AtaFhDDQ.79jsh7UGLT2msCGnluO0OeZ3Cj16H96','testuser2@example.com','12345678900',0);
INSERT INTO "User" VALUES (3,'testuser3','$2b$12$.A/30uCITQjR3Qh8SzOKBuVbbmT5NgHlowZV9wryxJBtL0/IIyzrq','test3@qq.com','123',0);
CREATE INDEX "ix_Admin_admin_id" ON "Admin" (admin_id);
CREATE INDEX "ix_Order_order_id" ON "Order" (order_id);
CREATE INDEX "ix_Product_product_id" ON "Product" (product_id);
CREATE INDEX "ix_ShoppingCart_cart_id" ON "ShoppingCart" (cart_id);
CREATE INDEX "ix_User_user_id" ON "User" (user_id);
CREATE UNIQUE INDEX "ix_User_user_name" ON "User" (user_name);
COMMIT;
