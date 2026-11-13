const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');
const { authenticateJWT, authorizeRoles } = require('../middleware/auth');

// All reports routes require admin permissions
router.use(authenticateJWT);
router.use(authorizeRoles('admin'));

router.get('/daily', reportController.getDailySalesReport);
router.get('/monthly', reportController.getMonthlySalesReport);
router.get('/best-sellers', reportController.getBestSellingProducts);

module.exports = router;
