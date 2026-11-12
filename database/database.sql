-- ==========================================
-- Grocery Shop POS Database Creation Script
-- Target: Microsoft SQL Server (MSSQL)
-- ==========================================

-- Create Database if not exists (Uncomment if executing outside of an existing DB context)
/*
IF NOT EXISTS (SELECT * FROM sys.databases WHERE name = 'GroceryPOS')
BEGIN
    CREATE DATABASE GroceryPOS;
END
GO
USE GroceryPOS;
GO
*/

-- --------------------------------------------------
-- 1. Drop existing tables if they exist (Clean Setup)
-- --------------------------------------------------
IF OBJECT_ID('dbo.sale_items', 'U') IS NOT NULL DROP TABLE dbo.sale_items;
IF OBJECT_ID('dbo.sales', 'U') IS NOT NULL DROP TABLE dbo.sales;
IF OBJECT_ID('dbo.products', 'U') IS NOT NULL DROP TABLE dbo.products;
IF OBJECT_ID('dbo.categories', 'U') IS NOT NULL DROP TABLE dbo.categories;
IF OBJECT_ID('dbo.customers', 'U') IS NOT NULL DROP TABLE dbo.customers;
IF OBJECT_ID('dbo.users', 'U') IS NOT NULL DROP TABLE dbo.users;

-- --------------------------------------------------
-- 2. Create Tables
-- --------------------------------------------------

-- Users Table (Role-based access control)
CREATE TABLE dbo.users (
    ID INT IDENTITY(1,1) PRIMARY KEY,
    Username NVARCHAR(50) NOT NULL UNIQUE,
    Email NVARCHAR(100) NOT NULL UNIQUE,
    PasswordHash NVARCHAR(255) NOT NULL,
    Role NVARCHAR(20) NOT NULL CHECK (Role IN ('admin', 'cashier')),
    CreatedAt DATETIME DEFAULT GETDATE()
);

-- Categories Table
CREATE TABLE dbo.categories (
    ID INT IDENTITY(1,1) PRIMARY KEY,
    Name NVARCHAR(50) NOT NULL UNIQUE,
    Description NVARCHAR(255) NULL,
    CreatedAt DATETIME DEFAULT GETDATE()
);

-- Customers Table
CREATE TABLE dbo.customers (
    ID INT IDENTITY(1,1) PRIMARY KEY,
    Name NVARCHAR(100) NOT NULL,
    Phone NVARCHAR(20) UNIQUE NULL,
    Email NVARCHAR(100) NULL,
    Address NVARCHAR(255) NULL,
    CreatedAt DATETIME DEFAULT GETDATE()
);

-- Products Table (Contains pricing, stocks, reorder thresholds)
CREATE TABLE dbo.products (
    ID INT IDENTITY(1,1) PRIMARY KEY,
    Name NVARCHAR(100) NOT NULL,
    Barcode NVARCHAR(50) NOT NULL UNIQUE,
    CategoryId INT NULL,
    Description NVARCHAR(255) NULL,
    Price DECIMAL(10, 2) NOT NULL CHECK (Price >= 0),
    CostPrice DECIMAL(10, 2) NOT NULL CHECK (CostPrice >= 0),
    StockQuantity INT NOT NULL DEFAULT 0 CHECK (StockQuantity >= 0),
    ReorderLevel INT NOT NULL DEFAULT 10 CHECK (ReorderLevel >= 0),
    CreatedAt DATETIME DEFAULT GETDATE(),
    UpdatedAt DATETIME DEFAULT GETDATE(),
    CONSTRAINT FK_Products_Category FOREIGN KEY (CategoryId) REFERENCES dbo.categories(ID) ON DELETE SET NULL
);

-- Sales Table (Sale master record)
CREATE TABLE dbo.sales (
    ID INT IDENTITY(1,1) PRIMARY KEY,
    SaleDate DATETIME NOT NULL DEFAULT GETDATE(),
    TotalAmount DECIMAL(10, 2) NOT NULL DEFAULT 0.00 CHECK (TotalAmount >= 0),
    TaxAmount DECIMAL(10, 2) NOT NULL DEFAULT 0.00 CHECK (TaxAmount >= 0),
    DiscountAmount DECIMAL(10, 2) NOT NULL DEFAULT 0.00 CHECK (DiscountAmount >= 0),
    FinalAmount DECIMAL(10, 2) NOT NULL DEFAULT 0.00 CHECK (FinalAmount >= 0),
    PaymentMethod NVARCHAR(20) NOT NULL CHECK (PaymentMethod IN ('cash', 'card', 'mobile')),
    CustomerId INT NULL,
    UserId INT NULL,
    CreatedAt DATETIME DEFAULT GETDATE(),
    CONSTRAINT FK_Sales_Customer FOREIGN KEY (CustomerId) REFERENCES dbo.customers(ID) ON DELETE SET NULL,
    CONSTRAINT FK_Sales_User FOREIGN KEY (UserId) REFERENCES dbo.users(ID) ON DELETE SET NULL
);

-- Sale Items Table (Sale details / line items)
CREATE TABLE dbo.sale_items (
    ID INT IDENTITY(1,1) PRIMARY KEY,
    SaleId INT NOT NULL,
    ProductId INT NOT NULL,
    Quantity INT NOT NULL CHECK (Quantity > 0),
    UnitPrice DECIMAL(10, 2) NOT NULL CHECK (UnitPrice >= 0),
    TotalPrice DECIMAL(10, 2) NOT NULL CHECK (TotalPrice >= 0),
    CONSTRAINT FK_SaleItems_Sale FOREIGN KEY (SaleId) REFERENCES dbo.sales(ID) ON DELETE CASCADE,
    CONSTRAINT FK_SaleItems_Product FOREIGN KEY (ProductId) REFERENCES dbo.products(ID)
);

-- --------------------------------------------------
-- 3. Create Indexes for Performance optimization
-- --------------------------------------------------
CREATE INDEX IX_Products_Barcode ON dbo.products(Barcode);
CREATE INDEX IX_Customers_Phone ON dbo.customers(Phone);
CREATE INDEX IX_Sales_SaleDate ON dbo.sales(SaleDate);

-- --------------------------------------------------
-- 4. Insert Seed Data
-- --------------------------------------------------

-- Password hash for 'Password123': $2a$10$Kq.pZ04a/6kLwYV5D69bLu5lT.L7.r.w1qE/zNbeC6/y2JtE0x1lG
INSERT INTO dbo.users (Username, Email, PasswordHash, Role)
VALUES 
('admin', 'admin@grocerypos.com', '$2a$10$Kq.pZ04a/6kLwYV5D69bLu5lT.L7.r.w1qE/zNbeC6/y2JtE0x1lG', 'admin'),
('cashier', 'cashier@grocerypos.com', '$2a$10$Kq.pZ04a/6kLwYV5D69bLu5lT.L7.r.w1qE/zNbeC6/y2JtE0x1lG', 'cashier');

INSERT INTO dbo.categories (Name, Description)
VALUES
('Produce', 'Fresh fruits and vegetables'),
('Dairy & Eggs', 'Milk, cheese, butter, yogurt, and eggs'),
('Bakery', 'Freshly baked bread, rolls, pastries, and cakes'),
('Beverages', 'Soda, juice, water, coffee, and tea'),
('Pantry & Snacks', 'Canned goods, pasta, chips, cookies, and grains');

INSERT INTO dbo.customers (Name, Phone, Email, Address)
VALUES
('John Doe', '1234567890', 'john@example.com', '123 Main St, Springfield'),
('Jane Smith', '0987654321', 'jane@example.com', '456 Oak Ave, Springfield'),
('Walk-in Customer', NULL, NULL, NULL);

-- Seed Products
-- IDs will map sequentially (1: Produce, 2: Dairy & Eggs, 3: Bakery, 4: Beverages, 5: Pantry & Snacks)
INSERT INTO dbo.products (Name, Barcode, CategoryId, Description, Price, CostPrice, StockQuantity, ReorderLevel)
VALUES
('Red Apples (1kg)', '4011200293', 1, 'Fresh crisp red gala apples', 2.99, 1.50, 100, 15),
('Organic Banana (Bunch)', '4011200294', 1, 'Organic yellow bananas bunch', 1.89, 0.90, 80, 10),
('Whole Milk 1 Gallon', '0787423518', 2, 'Grade A pasteurized whole milk', 3.49, 2.10, 8, 10), -- Low Stock Alert
('Cheddar Cheese 200g', '0787423519', 2, 'Sharp cheddar cheese block', 4.29, 2.50, 45, 12),
('Sourdough Bread', '0111100012', 3, 'Freshly baked artisanal sourdough', 3.99, 2.00, 15, 5),
('Chocolate Chip Cookies', '0111100013', 5, 'Double chocolate chip cookie box', 2.49, 1.20, 5, 8), -- Low Stock Alert
('Coca-Cola 2-Liter', '0490000076', 4, 'Classic Coca-Cola soft drink', 1.99, 1.00, 120, 20),
('Spring Water 24-Pack', '0490000077', 4, 'Purified spring water bottles pack', 4.99, 2.50, 30, 15);

-- Seed Sales History
-- Sale 1: Admin registers a sale for John Doe (1 Apple, 1 Milk)
INSERT INTO dbo.sales (SaleDate, TotalAmount, TaxAmount, DiscountAmount, FinalAmount, PaymentMethod, CustomerId, UserId)
VALUES 
(DATEADD(day, -2, GETDATE()), 6.48, 0.52, 0.00, 7.00, 'cash', 1, 1);

DECLARE @SaleId1 INT = SCOPE_IDENTITY();

INSERT INTO dbo.sale_items (SaleId, ProductId, Quantity, UnitPrice, TotalPrice)
VALUES
(@SaleId1, 1, 1, 2.99, 2.99), -- Red Apple
(@SaleId1, 3, 1, 3.49, 3.49); -- Whole Milk

-- Sale 2: Cashier registers a sale for Jane Smith (2 Coca-Colas, 1 Sourdough Bread, with 0.50 discount)
INSERT INTO dbo.sales (SaleDate, TotalAmount, TaxAmount, DiscountAmount, FinalAmount, PaymentMethod, CustomerId, UserId)
VALUES
(DATEADD(day, -1, GETDATE()), 7.97, 0.63, 0.50, 8.10, 'card', 2, 2);

DECLARE @SaleId2 INT = SCOPE_IDENTITY();

INSERT INTO dbo.sale_items (SaleId, ProductId, Quantity, UnitPrice, TotalPrice)
VALUES
(@SaleId2, 7, 2, 1.99, 3.98), -- 2 Coca-Colas
(@SaleId2, 5, 1, 3.99, 3.99); -- 1 Sourdough

-- Sale 3: Cashier registers cash sale today for Walk-in Customer
INSERT INTO dbo.sales (SaleDate, TotalAmount, TaxAmount, DiscountAmount, FinalAmount, PaymentMethod, CustomerId, UserId)
VALUES
(GETDATE(), 10.47, 0.83, 0.00, 11.30, 'cash', 3, 2);

DECLARE @SaleId3 INT = SCOPE_IDENTITY();

INSERT INTO dbo.sale_items (SaleId, ProductId, Quantity, UnitPrice, TotalPrice)
VALUES
(@SaleId3, 1, 1, 2.99, 2.99), -- 1 Apple
(@SaleId3, 4, 1, 4.29, 4.29), -- Cheddar Cheese
(@SaleId3, 7, 1, 1.99, 1.99), -- Coca-Cola
(@SaleId3, 6, 1, 2.49, 2.49); -- Cookies

PRINT 'Database layout and seed data setup script completed successfully.';
