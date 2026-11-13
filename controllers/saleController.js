const { sql, poolPromise } = require('../config/db');

/**
 * Create Sale (Checkout)
 * POST /api/sales
 * Body parameters:
 * - paymentMethod: 'cash' | 'card' | 'mobile'
 * - items: Array of { productId, quantity }
 * - customerId: number (optional)
 * - discountAmount: number (optional)
 * - taxAmount: number (optional)
 */
exports.createSale = async (req, res, next) => {
  let transaction;
  try {
    const { paymentMethod, items, customerId, discountAmount = 0, taxAmount = 0 } = req.body;
    const userId = req.user.id; // Logged in Cashier/Admin

    const pool = await poolPromise;

    // Create a transaction instance
    transaction = new sql.Transaction(pool);
    await transaction.begin();

    let computedTotal = 0;
    const itemsWithPrices = [];

    // Step 1: Validate products, stock availability, and collect prices
    for (const item of items) {
      // Use UPDLOCK to lock the rows and prevent race conditions (dirty reads/updates)
      const productQuery = `
        SELECT Name, Price, StockQuantity 
        FROM dbo.products WITH (UPDLOCK) 
        WHERE ID = @ProductId
      `;
      
      const reqProduct = new sql.Request(transaction);
      reqProduct.input('ProductId', sql.Int, item.productId);
      const productResult = await reqProduct.query(productQuery);

      if (productResult.recordset.length === 0) {
        throw new Error(`Product with ID ${item.productId} not found.`);
      }

      const product = productResult.recordset[0];

      if (product.StockQuantity < item.quantity) {
        throw new Error(`Insufficient stock for product [${product.Name}]. Available: ${product.StockQuantity}, Requested: ${item.quantity}`);
      }

      const unitPrice = product.Price;
      const totalPrice = unitPrice * item.quantity;
      computedTotal += totalPrice;

      itemsWithPrices.push({
        productId: item.productId,
        productName: product.Name,
        quantity: item.quantity,
        unitPrice: unitPrice,
        totalPrice: totalPrice
      });
    }

    const finalAmount = Math.max(0, computedTotal + taxAmount - discountAmount);

    // Step 2: Insert into Sales table (Sale master record)
    const saleInsertQuery = `
      INSERT INTO dbo.sales (TotalAmount, TaxAmount, DiscountAmount, FinalAmount, PaymentMethod, CustomerId, UserId)
      OUTPUT INSERTED.ID, INSERTED.SaleDate, INSERTED.FinalAmount
      VALUES (@TotalAmount, @TaxAmount, @DiscountAmount, @FinalAmount, @PaymentMethod, @CustomerId, @UserId)
    `;

    const reqSale = new sql.Request(transaction);
    reqSale.input('TotalAmount', sql.Decimal(10, 2), computedTotal);
    reqSale.input('TaxAmount', sql.Decimal(10, 2), taxAmount);
    reqSale.input('DiscountAmount', sql.Decimal(10, 2), discountAmount);
    reqSale.input('FinalAmount', sql.Decimal(10, 2), finalAmount);
    reqSale.input('PaymentMethod', sql.NVarChar, paymentMethod);
    reqSale.input('CustomerId', sql.Int, customerId || null);
    reqSale.input('UserId', sql.Int, userId);

    const saleResult = await reqSale.query(saleInsertQuery);
    const newSale = saleResult.recordset[0];
    const saleId = newSale.ID;

    // Step 3: Insert Line Items and Deduct Stock quantity
    for (const item of itemsWithPrices) {
      // Insert Sale Item
      const itemInsertQuery = `
        INSERT INTO dbo.sale_items (SaleId, ProductId, Quantity, UnitPrice, TotalPrice)
        VALUES (@SaleId, @ProductId, @Quantity, @UnitPrice, @TotalPrice)
      `;
      const reqItem = new sql.Request(transaction);
      reqItem.input('SaleId', sql.Int, saleId);
      reqItem.input('ProductId', sql.Int, item.productId);
      reqItem.input('Quantity', sql.Int, item.quantity);
      reqItem.input('UnitPrice', sql.Decimal(10, 2), item.unitPrice);
      reqItem.input('TotalPrice', sql.Decimal(10, 2), item.totalPrice);
      await reqItem.query(itemInsertQuery);

      // Reduce Stock Quantity
      const stockUpdateQuery = `
        UPDATE dbo.products 
        SET StockQuantity = StockQuantity - @Quantity, UpdatedAt = GETDATE()
        WHERE ID = @ProductId
      `;
      const reqStock = new sql.Request(transaction);
      reqStock.input('Quantity', sql.Int, item.quantity);
      reqStock.input('ProductId', sql.Int, item.productId);
      await reqStock.query(stockUpdateQuery);
    }

    // Commit Transaction
    await transaction.commit();

    res.status(201).json({
      success: true,
      message: 'Sale transaction completed successfully.',
      sale: {
        id: saleId,
        date: newSale.SaleDate,
        totalAmount: computedTotal,
        taxAmount: taxAmount,
        discountAmount: discountAmount,
        finalAmount: finalAmount,
        paymentMethod: paymentMethod,
        items: itemsWithPrices
      }
    });

  } catch (error) {
    if (transaction) {
      await transaction.rollback();
    }
    // Set friendly error message code
    res.status(400).json({
      success: false,
      error: error.message || 'Failed to process checkout transaction.'
    });
  }
};

/**
 * Get Receipt Details
 * GET /api/sales/:id/receipt
 */
exports.getReceipt = async (req, res, next) => {
  try {
    const { id } = req.params;
    const pool = await poolPromise;

    // Get Sale Master
    const saleQuery = `
      SELECT 
        s.ID AS SaleId, 
        s.SaleDate, 
        s.TotalAmount, 
        s.TaxAmount, 
        s.DiscountAmount, 
        s.FinalAmount, 
        s.PaymentMethod,
        u.Username AS CashierName,
        c.Name AS CustomerName,
        c.Phone AS CustomerPhone
      FROM dbo.sales s
      LEFT JOIN dbo.users u ON s.UserId = u.ID
      LEFT JOIN dbo.customers c ON s.CustomerId = c.ID
      WHERE s.ID = @SaleId
    `;

    const saleResult = await pool.request()
      .input('SaleId', sql.Int, id)
      .query(saleQuery);

    if (saleResult.recordset.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Sale transaction record not found.'
      });
    }

    const sale = saleResult.recordset[0];

    // Get Sale Items
    const itemsQuery = `
      SELECT 
        si.ID AS ItemId,
        p.Name AS ProductName,
        p.Barcode,
        si.Quantity,
        si.UnitPrice,
        si.TotalPrice
      FROM dbo.sale_items si
      INNER JOIN dbo.products p ON si.ProductId = p.ID
      WHERE si.SaleId = @SaleId
    `;

    const itemsResult = await pool.request()
      .input('SaleId', sql.Int, id)
      .query(itemsQuery);

    // Format structured receipt JSON
    const receiptData = {
      storeInfo: {
        name: 'FreshMart Grocery Shop',
        address: '456 Business Central Avenue, City Center',
        phone: '+1 (555) 123-4567',
        taxId: 'TX-9876543-A'
      },
      transaction: {
        invoiceNumber: `INV-${String(sale.SaleId).padStart(6, '0')}`,
        date: sale.SaleDate,
        cashier: sale.CashierName,
        customerName: sale.CustomerName || 'Walk-in Customer',
        customerPhone: sale.CustomerPhone || 'N/A',
        paymentMethod: sale.PaymentMethod.toUpperCase()
      },
      items: itemsResult.recordset.map(item => ({
        name: item.ProductName,
        barcode: item.Barcode,
        qty: item.Quantity,
        price: item.UnitPrice,
        total: item.TotalPrice
      })),
      totals: {
        subtotal: sale.TotalAmount,
        tax: sale.TaxAmount,
        discount: sale.DiscountAmount,
        grandTotal: sale.FinalAmount
      },
      footerMessage: 'Thank you for shopping at FreshMart! Please come again.'
    };

    res.status(200).json({
      success: true,
      receipt: receiptData
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get All Sales (Sales History)
 * GET /api/sales
 */
exports.getAllSales = async (req, res, next) => {
  try {
    const pool = await poolPromise;
    const query = `
      SELECT 
        s.ID AS SaleId, 
        s.SaleDate, 
        s.TotalAmount, 
        s.TaxAmount, 
        s.DiscountAmount, 
        s.FinalAmount, 
        s.PaymentMethod,
        u.Username AS CashierName,
        c.Name AS CustomerName
      FROM dbo.sales s
      LEFT JOIN dbo.users u ON s.UserId = u.ID
      LEFT JOIN dbo.customers c ON s.CustomerId = c.ID
      ORDER BY s.SaleDate DESC
    `;
    const result = await pool.request().query(query);

    res.status(200).json({
      success: true,
      count: result.recordset.length,
      data: result.recordset
    });
  } catch (error) {
    next(error);
  }
};

