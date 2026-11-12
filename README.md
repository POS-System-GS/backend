# FreshMart Grocery Shop - POS Backend API

A professional, secure, and production-ready Point of Sale (POS) backend server built with Node.js, Express, and Microsoft SQL Server (MSSQL).

---

## Technical Stack
*   **Runtime:** Node.js
*   **Framework:** Express.js
*   **Database:** Microsoft SQL Server (MSSQL) using the native connection pool client
*   **Security:** JSON Web Tokens (JWT) for authentication, Bcrypt.js for secure password hashing, and parameterized queries for SQL injection protection
*   **Design Pattern:** Controller-Routing pattern with modularized validation and centralized error handling middleware.

---

## Folder Structure
```text
backend/
├── config/
│   └── db.js            # MSSQL connection pooling configurations
├── controllers/
│   ├── authController.js
│   ├── categoryController.js
│   ├── productController.js
│   ├── saleController.js
│   ├── customerController.js
│   ├── reportController.js
│   └── dashboardController.js
├── middleware/
│   ├── auth.js          # JWT & Role authorization guards
│   ├── validate.js      # Input fields request validator
│   └── error.js         # Centralized error handler
├── routes/
│   ├── authRoutes.js
│   ├── categoryRoutes.js
│   ├── productRoutes.js
│   ├── saleRoutes.js
│   ├── customerRoutes.js
│   ├── reportRoutes.js
│   └── dashboardRoutes.js
├── database/
│   └── database.sql     # Database Schema DDL & seed scripts
├── .env                 # Port & database credential configuration
├── server.js            # Main bootstrapper entry point
└── package.json         # Dependency manifest
```

---

## Setup & Installation Instructions

### 1. Database Creation
1. Open **Microsoft SQL Server Management Studio (SSMS)** or your preferred SQL Server CLI (like `sqlcmd`).
2. Connect to your SQL Server instance.
3. Run the following command to create the database:
   ```sql
   CREATE DATABASE GroceryPOS;
   ```
4. Double-click or open [database.sql](file:///D:/projects/POS%20System/Backend/database/database.sql) in SSMS.
5. In the script, ensure you are running it inside the `GroceryPOS` context:
   ```sql
   USE GroceryPOS;
   GO
   ```
6. Execute the script to construct all tables (`users`, `categories`, `customers`, `products`, `sales`, `sale_items`), set up constraints, indexes, and insert the sample seed data.

### 2. Environment Variables Configuration
Modify the [.env](file:///D:/projects/POS%20System/Backend/.env) file located in the root of the backend folder to match your SQL Server parameters:
```env
# Server Port
PORT=3000
NODE_ENV=development

# JWT Secret
JWT_SECRET=super_secret_grocery_pos_key_2026_db_server
JWT_EXPIRES_IN=24h

# Database Configuration (Microsoft SQL Server)
DB_USER=sa                      # Your database user
DB_PASSWORD=YourSecurePassword123 # Your database password
DB_SERVER=localhost              # Database server hostname/IP
DB_DATABASE=GroceryPOS          # Database name
DB_PORT=1433                    # Database listener port

# Set to true to allow self-signed local server SSL certificates
DB_TRUST_SERVER_CERTIFICATE=true
DB_ENCRYPT=false
```

### 3. Run the Server
In your terminal, navigate to the `Backend` directory and execute:
```bash
# Install all required npm modules
npm install

# Start the server in production mode
npm start

# Alternatively, start the server in development hot-reload mode
npm run dev
```

The terminal will print:
```text
Successfully connected to MSSQL server [localhost] database [GroceryPOS]
MSSQL database pool initialized successfully.
Grocery Shop POS Backend is running in development mode on http://localhost:3000
```

---

## Seed Credentials
The seed script populates the database with two default users (passwords are `Password123`):
*   **Administrator:**
    *   **Email:** `admin@grocerypos.com` (or Username: `admin`)
    *   **Password:** `Password123`
    *   **Role:** `admin`
*   **Cashier:**
    *   **Email:** `cashier@grocerypos.com` (or Username: `cashier`)
    *   **Password:** `Password123`
    *   **Role:** `cashier`

---

## API Documentation

### Authentication Routes
| Method | Endpoint | Authorization | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/login` | Public | Login user, returns JWT and user payload |
| `POST` | `/api/auth/register` | Admin | Registers a new user (`admin` or `cashier`) |

### Category Routes
| Method | Endpoint | Authorization | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/categories` | Auth (All) | Lists all categories |
| `GET` | `/api/categories/:id` | Auth (All) | Get single category by ID |
| `POST` | `/api/categories` | Admin | Create a new category |
| `PUT` | `/api/categories/:id` | Admin | Update category details |
| `DELETE` | `/api/categories/:id`| Admin | Delete category |

### Product Routes
| Method | Endpoint | Authorization | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/products` | Auth (All) | List all products (supports `?search=X` & `?categoryId=Y`) |
| `GET` | `/api/products/:id` | Auth (All) | Get single product detail |
| `GET` | `/api/products/barcode/:barcode` | Auth (All) | Search product by barcode scanner |
| `POST` | `/api/products` | Admin | Add new product to catalog |
| `PUT` | `/api/products/:id` | Admin | Update product details or stock |
| `DELETE` | `/api/products/:id`| Admin | Delete product |

### Sales Checkout Routes
| Method | Endpoint | Authorization | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/sales` | Auth (All) | Create a sale transaction, deducts stock, rolls back on error |
| `GET` | `/api/sales/:id/receipt` | Auth (All) | Get formatted receipt details |

### Customer Routes
| Method | Endpoint | Authorization | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/customers` | Auth (All) | List all customers |
| `POST` | `/api/customers` | Auth (All) | Register a new customer |
| `GET` | `/api/customers/:id/history` | Auth (All) | Get customer checkout history and items bought |

### Reports Routes
| Method | Endpoint | Authorization | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/reports/daily` | Admin | Daily sales, items volume, and revenue metrics |
| `GET` | `/api/reports/monthly` | Admin | Monthly sales metrics |
| `GET` | `/api/reports/best-sellers` | Admin | Top 10 best-selling products by quantity |

### Dashboard Routes
| Method | Endpoint | Authorization | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/dashboard/stats` | Auth (All) | Fetches total sales, products, low stock count, and today's revenue |
