const { sql, poolPromise } = require('../config/db');

/**
 * Get all customers
 * GET /api/customers
 */
exports.getAllCustomers = async (req, res, next) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request().query('SELECT * FROM dbo.customers ORDER BY Name ASC');

    res.status(200).json({
      success: true,
      count: result.recordset.length,
      data: result.recordset
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get customer by ID
 * GET /api/customers/:id
 */
exports.getCustomerById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const pool = await poolPromise;

    const result = await pool.request()
      .input('ID', sql.Int, id)
      .query('SELECT * FROM dbo.customers WHERE ID = @ID');

    if (result.recordset.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Customer not found.'
      });
    }

    res.status(200).json({
      success: true,
      data: result.recordset[0]
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create Customer
 * POST /api/customers
 */
exports.createCustomer = async (req, res, next) => {
  try {
    const { name, phone, email, address } = req.body;
    const pool = await poolPromise;

    // Check if customer with this phone number already exists
    if (phone) {
      const checkPhone = await pool.request()
        .input('Phone', sql.NVarChar, phone)
        .query('SELECT ID FROM dbo.customers WHERE Phone = @Phone');

      if (checkPhone.recordset.length > 0) {
        return res.status(400).json({
          success: false,
          error: 'A customer with this phone number is already registered.'
        });
      }
    }

    const result = await pool.request()
      .input('Name', sql.NVarChar, name)
      .input('Phone', sql.NVarChar, phone || null)
      .input('Email', sql.NVarChar, email || null)
      .input('Address', sql.NVarChar, address || null)
      .query(`
        INSERT INTO dbo.customers (Name, Phone, Email, Address)
        OUTPUT INSERTED.*
        VALUES (@Name, @Phone, @Email, @Address)
      `);

    res.status(201).json({
      success: true,
      message: 'Customer registered successfully.',
      data: result.recordset[0]
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get Customer Purchase History
 * GET /api/customers/:id/history
 */
exports.getCustomerHistory = async (req, res, next) => {
  try {
    const { id } = req.params;
    const pool = await poolPromise;

    // Verify customer exists
    const checkCustomer = await pool.request()
      .input('ID', sql.Int, id)
      .query('SELECT Name FROM dbo.customers WHERE ID = @ID');

    if (checkCustomer.recordset.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Customer not found.'
      });
    }

    const customerName = checkCustomer.recordset[0].Name;

    // Get all sales for customer with line items joined
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
        si.ID AS ItemId,
        si.ProductId,
        p.Name AS ProductName,
        p.Barcode,
        si.Quantity,
        si.UnitPrice,
        si.TotalPrice AS ItemTotalPrice
      FROM dbo.sales s
      LEFT JOIN dbo.users u ON s.UserId = u.ID
      INNER JOIN dbo.sale_items si ON s.ID = si.SaleId
      INNER JOIN dbo.products p ON si.ProductId = p.ID
      WHERE s.CustomerId = @CustomerId
      ORDER BY s.SaleDate DESC, s.ID DESC
    `;

    const result = await pool.request()
      .input('CustomerId', sql.Int, id)
      .query(query);

    // Process and group flat rows into sales objects with an array of items
    const salesMap = {};
    result.recordset.forEach(row => {
      if (!salesMap[row.SaleId]) {
        salesMap[row.SaleId] = {
          saleId: row.SaleId,
          saleDate: row.SaleDate,
          totalAmount: row.TotalAmount,
          taxAmount: row.TaxAmount,
          discountAmount: row.DiscountAmount,
          finalAmount: row.FinalAmount,
          paymentMethod: row.PaymentMethod,
          cashierName: row.CashierName,
          items: []
        };
      }

      salesMap[row.SaleId].items.push({
        itemId: row.ItemId,
        productId: row.ProductId,
        productName: row.ProductName,
        barcode: row.Barcode,
        quantity: row.Quantity,
        unitPrice: row.UnitPrice,
        totalPrice: row.ItemTotalPrice
      });
    });

    const formattedHistory = Object.values(salesMap);

    res.status(200).json({
      success: true,
      customerName,
      historyCount: formattedHistory.length,
      data: formattedHistory
    });
  } catch (error) {
    next(error);
  }
};
