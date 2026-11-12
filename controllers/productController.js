const { sql, poolPromise } = require('../config/db');

/**
 * Get all products (with optional search and category filter)
 * GET /api/products
 */
exports.getAllProducts = async (req, res, next) => {
  try {
    const { search, categoryId } = req.query;
    const pool = await poolPromise;

    let query = `
      SELECT p.*, c.Name AS CategoryName 
      FROM dbo.products p
      LEFT JOIN dbo.categories c ON p.CategoryId = c.ID
      WHERE 1=1
    `;

    const request = pool.request();

    if (search) {
      query += ` AND (p.Name LIKE @Search OR p.Barcode = @BarcodeExact OR p.Description LIKE @Search)`;
      request.input('Search', sql.NVarChar, `%${search}%`);
      request.input('BarcodeExact', sql.NVarChar, search);
    }

    if (categoryId) {
      query += ` AND p.CategoryId = @CategoryId`;
      request.input('CategoryId', sql.Int, parseInt(categoryId, 10));
    }

    query += ` ORDER BY p.Name ASC`;

    const result = await request.query(query);

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
 * Get product by ID
 * GET /api/products/:id
 */
exports.getProductById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const pool = await poolPromise;

    const result = await pool.request()
      .input('ID', sql.Int, id)
      .query(`
        SELECT p.*, c.Name AS CategoryName 
        FROM dbo.products p
        LEFT JOIN dbo.categories c ON p.CategoryId = c.ID
        WHERE p.ID = @ID
      `);

    if (result.recordset.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Product not found.'
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
 * Get product by barcode (for scanner integration)
 * GET /api/products/barcode/:barcode
 */
exports.getProductByBarcode = async (req, res, next) => {
  try {
    const { barcode } = req.params;
    const pool = await poolPromise;

    const result = await pool.request()
      .input('Barcode', sql.NVarChar, barcode)
      .query(`
        SELECT p.*, c.Name AS CategoryName 
        FROM dbo.products p
        LEFT JOIN dbo.categories c ON p.CategoryId = c.ID
        WHERE p.Barcode = @Barcode
      `);

    if (result.recordset.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Product not found for the given barcode.'
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
 * Create Product
 * POST /api/products
 */
exports.createProduct = async (req, res, next) => {
  try {
    const { name, barcode, categoryId, description, price, costPrice, stockQuantity, reorderLevel } = req.body;
    const pool = await poolPromise;

    // Check if barcode already exists
    const checkBarcode = await pool.request()
      .input('Barcode', sql.NVarChar, barcode)
      .query('SELECT ID FROM dbo.products WHERE Barcode = @Barcode');

    if (checkBarcode.recordset.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Product with this barcode already exists.'
      });
    }

    // Verify category exists if provided
    if (categoryId) {
      const checkCategory = await pool.request()
        .input('CategoryId', sql.Int, categoryId)
        .query('SELECT ID FROM dbo.categories WHERE ID = @CategoryId');

      if (checkCategory.recordset.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Specified Category ID does not exist.'
        });
      }
    }

    const result = await pool.request()
      .input('Name', sql.NVarChar, name)
      .input('Barcode', sql.NVarChar, barcode)
      .input('CategoryId', sql.Int, categoryId || null)
      .input('Description', sql.NVarChar, description || null)
      .input('Price', sql.Decimal(10, 2), price)
      .input('CostPrice', sql.Decimal(10, 2), costPrice)
      .input('StockQuantity', sql.Int, stockQuantity !== undefined ? stockQuantity : 0)
      .input('ReorderLevel', sql.Int, reorderLevel !== undefined ? reorderLevel : 10)
      .query(`
        INSERT INTO dbo.products (Name, Barcode, CategoryId, Description, Price, CostPrice, StockQuantity, ReorderLevel)
        OUTPUT INSERTED.*
        VALUES (@Name, @Barcode, @CategoryId, @Description, @Price, @CostPrice, @StockQuantity, @ReorderLevel)
      `);

    res.status(201).json({
      success: true,
      message: 'Product created successfully.',
      data: result.recordset[0]
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update Product
 * PUT /api/products/:id
 */
exports.updateProduct = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, barcode, categoryId, description, price, costPrice, stockQuantity, reorderLevel } = req.body;
    const pool = await poolPromise;

    // Check if product exists
    const checkProduct = await pool.request()
      .input('ID', sql.Int, id)
      .query('SELECT ID FROM dbo.products WHERE ID = @ID');

    if (checkProduct.recordset.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Product not found.'
      });
    }

    // Check barcode collision (if changed)
    const checkBarcode = await pool.request()
      .input('ID', sql.Int, id)
      .input('Barcode', sql.NVarChar, barcode)
      .query('SELECT ID FROM dbo.products WHERE Barcode = @Barcode AND ID <> @ID');

    if (checkBarcode.recordset.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Barcode is already assigned to another product.'
      });
    }

    // Verify category exists if provided
    if (categoryId) {
      const checkCategory = await pool.request()
        .input('CategoryId', sql.Int, categoryId)
        .query('SELECT ID FROM dbo.categories WHERE ID = @CategoryId');

      if (checkCategory.recordset.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Specified Category ID does not exist.'
        });
      }
    }

    const result = await pool.request()
      .input('ID', sql.Int, id)
      .input('Name', sql.NVarChar, name)
      .input('Barcode', sql.NVarChar, barcode)
      .input('CategoryId', sql.Int, categoryId || null)
      .input('Description', sql.NVarChar, description || null)
      .input('Price', sql.Decimal(10, 2), price)
      .input('CostPrice', sql.Decimal(10, 2), costPrice)
      .input('StockQuantity', sql.Int, stockQuantity !== undefined ? stockQuantity : 0)
      .input('ReorderLevel', sql.Int, reorderLevel !== undefined ? reorderLevel : 10)
      .query(`
        UPDATE dbo.products 
        SET Name = @Name, Barcode = @Barcode, CategoryId = @CategoryId, 
            Description = @Description, Price = @Price, CostPrice = @CostPrice, 
            StockQuantity = @StockQuantity, ReorderLevel = @ReorderLevel, UpdatedAt = GETDATE()
        OUTPUT INSERTED.*
        WHERE ID = @ID
      `);

    res.status(200).json({
      success: true,
      message: 'Product updated successfully.',
      data: result.recordset[0]
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete Product
 * DELETE /api/products/:id
 */
exports.deleteProduct = async (req, res, next) => {
  try {
    const { id } = req.params;
    const pool = await poolPromise;

    // Check if product exists
    const checkProduct = await pool.request()
      .input('ID', sql.Int, id)
      .query('SELECT ID FROM dbo.products WHERE ID = @ID');

    if (checkProduct.recordset.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Product not found.'
      });
    }

    // Try deleting product, handles potential reference errors safely
    try {
      await pool.request()
        .input('ID', sql.Int, id)
        .query('DELETE FROM dbo.products WHERE ID = @ID');

      res.status(200).json({
        success: true,
        message: 'Product deleted successfully.'
      });
    } catch (dbErr) {
      // Check for foreign key reference violation error (547)
      if (dbErr.number === 547) {
        return res.status(400).json({
          success: false,
          error: 'Cannot delete product because it has existing checkout or sales records. You may set its stock to 0 instead.'
        });
      }
      throw dbErr;
    }
  } catch (error) {
    next(error);
  }
};
