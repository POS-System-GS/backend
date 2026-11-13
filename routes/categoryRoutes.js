const express = require('express');
const router = express.Router();
const categoryController = require('../controllers/categoryController');
const { validateCategory } = require('../middleware/validate');
const { authenticateJWT, authorizeRoles } = require('../middleware/auth');

// All category routes require authentication
router.use(authenticateJWT);

// Cashiers & Admins can view categories
router.get('/', categoryController.getAllCategories);
router.get('/:id', categoryController.getCategoryById);

// Admin-only endpoints for modification
router.post('/', authorizeRoles('admin'), validateCategory, categoryController.createCategory);
router.put('/:id', authorizeRoles('admin'), validateCategory, categoryController.updateCategory);
router.delete('/:id', authorizeRoles('admin'), categoryController.deleteCategory);

module.exports = router;
