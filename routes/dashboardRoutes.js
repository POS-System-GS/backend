const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const { authenticateJWT } = require('../middleware/auth');

// Require authentication for dashboard analytics
router.get('/stats', authenticateJWT, dashboardController.getDashboardStats);

module.exports = router;
