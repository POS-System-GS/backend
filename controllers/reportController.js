const { sql, poolPromise } = require('../config/db');

/**
 * Daily Sales Report
 * GET /api/reports/daily
 */
exports.getDailySalesReport = async (req, res, next) => {
  try {
    const pool = await poolPromise;

    // CTE query to calculate sales transactions and quantities sold per day without duplication
    const query = `
      WITH DailySales AS (
        SELECT 
          CAST(SaleDate AS DATE) AS Date,
          COUNT(ID) AS TotalSalesCount,
          SUM(FinalAmount) AS DailyRevenue
        FROM dbo.sales
        GROUP BY CAST(SaleDate AS DATE)
      ),
      DailyItems AS (
        SELECT 
          CAST(s.SaleDate AS DATE) AS Date,
          SUM(si.Quantity) AS DailyItemsSold
        FROM dbo.sales s
        INNER JOIN dbo.sale_items si ON s.ID = si.SaleId
        GROUP BY CAST(s.SaleDate AS DATE)
      )
      SELECT 
        ds.Date,
        ds.TotalSalesCount AS TotalSales,
        ISNULL(di.DailyItemsSold, 0) AS TotalItemsSold,
        ds.DailyRevenue AS Revenue
      FROM DailySales ds
      LEFT JOIN DailyItems di ON ds.Date = di.Date
      ORDER BY ds.Date DESC
    `;

    const result = await pool.request().query(query);

    res.status(200).json({
      success: true,
      data: result.recordset
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Monthly Sales Report
 * GET /api/reports/monthly
 */
exports.getMonthlySalesReport = async (req, res, next) => {
  try {
    const pool = await poolPromise;

    // CTE query to calculate monthly analytics
    const query = `
      WITH MonthlySales AS (
        SELECT 
          YEAR(SaleDate) AS Year,
          MONTH(SaleDate) AS Month,
          COUNT(ID) AS TotalSalesCount,
          SUM(FinalAmount) AS MonthlyRevenue
        FROM dbo.sales
        GROUP BY YEAR(SaleDate), MONTH(SaleDate)
      ),
      MonthlyItems AS (
        SELECT 
          YEAR(s.SaleDate) AS Year,
          MONTH(s.SaleDate) AS Month,
          SUM(si.Quantity) AS MonthlyItemsSold
        FROM dbo.sales s
        INNER JOIN dbo.sale_items si ON s.ID = si.SaleId
        GROUP BY YEAR(s.SaleDate), MONTH(s.SaleDate)
      )
      SELECT 
        ms.Year,
        ms.Month,
        FORMAT(DATEFROMPARTS(ms.Year, ms.Month, 1), 'MMMM yyyy') AS MonthName,
        ms.TotalSalesCount AS TotalSales,
        ISNULL(mi.MonthlyItemsSold, 0) AS TotalItemsSold,
        ms.MonthlyRevenue AS Revenue
      FROM MonthlySales ms
      LEFT JOIN MonthlyItems mi ON ms.Year = mi.Year AND ms.Month = mi.Month
      ORDER BY ms.Year DESC, ms.Month DESC
    `;

    const result = await pool.request().query(query);

    res.status(200).json({
      success: true,
      data: result.recordset
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Best Selling Products
 * GET /api/reports/best-sellers
 */
exports.getBestSellingProducts = async (req, res, next) => {
  try {
    const pool = await poolPromise;

    const query = `
      SELECT TOP 10
        p.ID AS ProductId,
        p.Name AS ProductName,
        p.Barcode,
        p.Price,
        SUM(si.Quantity) AS TotalQuantitySold,
        SUM(si.TotalPrice) AS TotalRevenueGenerated
      FROM dbo.sale_items si
      INNER JOIN dbo.products p ON si.ProductId = p.ID
      GROUP BY p.ID, p.Name, p.Barcode, p.Price
      ORDER BY TotalQuantitySold DESC
    `;

    const result = await pool.request().query(query);

    res.status(200).json({
      success: true,
      data: result.recordset
    });
  } catch (error) {
    next(error);
  }
};
