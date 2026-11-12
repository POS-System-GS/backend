const { sql, poolPromise } = require('../config/db');

/**
 * Get Dashboard Statistics
 * GET /api/dashboard/stats
 * Returns:
 * - totalSales (count of transactions)
 * - totalProducts (count of products in system)
 * - lowStockCount (products with stock <= reorder level)
 * - todaysRevenue (sum of final amount for sales today)
 */
exports.getDashboardStats = async (req, res, next) => {
  try {
    const pool = await poolPromise;

    // Single query returns all counts and aggregates to optimize server round trips
    const query = `
      SELECT 
        (SELECT COUNT(*) FROM dbo.sales) AS TotalSalesCount,
        (SELECT COUNT(*) FROM dbo.products) AS TotalProductsCount,
        (SELECT COUNT(*) FROM dbo.products WHERE StockQuantity <= ReorderLevel) AS LowStockCount,
        (SELECT ISNULL(SUM(FinalAmount), 0) FROM dbo.sales WHERE CAST(SaleDate AS DATE) = CAST(GETDATE() AS DATE)) AS TodaysRevenue
    `;

    const result = await pool.request().query(query);
    const stats = result.recordset[0];

    res.status(200).json({
      success: true,
      data: {
        totalSales: stats.TotalSalesCount,
        totalProducts: stats.TotalProductsCount,
        lowStockCount: stats.LowStockCount,
        todaysRevenue: stats.TodaysRevenue
      }
    });
  } catch (error) {
    next(error);
  }
};
