const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const { validateProduct } = require('../middleware/validate');
const { authenticateJWT, authorizeRoles } = require('../middleware/auth');

// All product routes require authentication
router.use(authenticateJWT);

// Cashiers & Admins can query products and scan barcodes
router.get('/', productController.getAllProducts);
router.get('/barcode/:barcode', productController.getProductByBarcode);
router.get('/:id', productController.getProductById);

// Admin-only endpoints for catalog management
router.post('/', authorizeRoles('admin'), validateProduct, productController.createProduct);
router.put('/:id', authorizeRoles('admin'), validateProduct, productController.updateProduct);
router.delete('/:id', authorizeRoles('admin'), productController.deleteProduct);

module.exports = router;
