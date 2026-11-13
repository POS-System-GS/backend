const express = require('express');
const router = express.Router();
const saleController = require('../controllers/saleController');
const { validateSale } = require('../middleware/validate');
const { authenticateJWT } = require('../middleware/auth');

// All sales endpoints require authenticated users
router.use(authenticateJWT);

router.get('/', saleController.getAllSales);
router.post('/', validateSale, saleController.createSale);
router.get('/:id/receipt', saleController.getReceipt);

module.exports = router;
