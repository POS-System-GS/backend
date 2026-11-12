const { sql, poolPromise } = require('../config/db');

/**
 * Get all categories
 * GET /api/categories
 */
exports.getAllCategories = async (req, res, next) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request().query('SELECT * FROM dbo.categories ORDER BY Name ASC');
    
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
 * Get category by ID
 * GET /api/categories/:id
 */
exports.getCategoryById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const pool = await poolPromise;

    const result = await pool.request()
      .input('ID', sql.Int, id)
      .query('SELECT * FROM dbo.categories WHERE ID = @ID');

    if (result.recordset.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Category not found.'
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
 * Create Category
 * POST /api/categories
 */
exports.createCategory = async (req, res, next) => {
  try {
    const { name, description } = req.body;
    const pool = await poolPromise;

    // Check if category name already exists
    const checkResult = await pool.request()
      .input('Name', sql.NVarChar, name)
      .query('SELECT ID FROM dbo.categories WHERE Name = @Name');

    if (checkResult.recordset.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Category name already exists.'
      });
    }

    const result = await pool.request()
      .input('Name', sql.NVarChar, name)
      .input('Description', sql.NVarChar, description || null)
      .query(`
        INSERT INTO dbo.categories (Name, Description)
        OUTPUT INSERTED.ID, INSERTED.Name, INSERTED.Description, INSERTED.CreatedAt
        VALUES (@Name, @Description)
      `);

    res.status(201).json({
      success: true,
      message: 'Category created successfully.',
      data: result.recordset[0]
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update Category
 * PUT /api/categories/:id
 */
exports.updateCategory = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, description } = req.body;
    const pool = await poolPromise;

    // Verify category exists
    const checkExist = await pool.request()
      .input('ID', sql.Int, id)
      .query('SELECT ID FROM dbo.categories WHERE ID = @ID');

    if (checkExist.recordset.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Category not found.'
      });
    }

    // Check name collision (if name changed)
    const checkName = await pool.request()
      .input('ID', sql.Int, id)
      .input('Name', sql.NVarChar, name)
      .query('SELECT ID FROM dbo.categories WHERE Name = @Name AND ID <> @ID');

    if (checkName.recordset.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Category name is already taken by another category.'
      });
    }

    const result = await pool.request()
      .input('ID', sql.Int, id)
      .input('Name', sql.NVarChar, name)
      .input('Description', sql.NVarChar, description || null)
      .query(`
        UPDATE dbo.categories 
        SET Name = @Name, Description = @Description 
        OUTPUT INSERTED.ID, INSERTED.Name, INSERTED.Description, INSERTED.CreatedAt
        WHERE ID = @ID
      `);

    res.status(200).json({
      success: true,
      message: 'Category updated successfully.',
      data: result.recordset[0]
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete Category
 * DELETE /api/categories/:id
 */
exports.deleteCategory = async (req, res, next) => {
  try {
    const { id } = req.params;
    const pool = await poolPromise;

    // Verify category exists
    const checkExist = await pool.request()
      .input('ID', sql.Int, id)
      .query('SELECT ID FROM dbo.categories WHERE ID = @ID');

    if (checkExist.recordset.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Category not found.'
      });
    }

    // Note: Due to standard FK constraint with ON DELETE SET NULL, 
    // products belonging to this category will have CategoryId set to NULL automatically.
    await pool.request()
      .input('ID', sql.Int, id)
      .query('DELETE FROM dbo.categories WHERE ID = @ID');

    res.status(200).json({
      success: true,
      message: 'Category deleted successfully.'
    });
  } catch (error) {
    next(error);
  }
};
