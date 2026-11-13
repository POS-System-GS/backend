const express = require('express');
const router = express.Router();
const customerController = require('../controllers/customerController');
const { validateCustomer } = require('../middleware/validate');
const { authenticateJWT } = require('../middleware/auth');

// All customer routes require authentication
router.use(authenticateJWT);

router.get('/', customerController.getAllCustomers);
router.get('/:id', customerController.getCustomerById);
router.post('/', validateCustomer, customerController.createCustomer);
router.get('/:id/history', customerController.getCustomerHistory);

module.exports = router;
