const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { validateRegister, validateLogin } = require('../middleware/validate');
const { authenticateJWT, authorizeRoles } = require('../middleware/auth');

// Public route for user login
router.post('/login', validateLogin, authController.login);

// Secure route for registering new users (restricted to admin users)
router.post('/register', authenticateJWT, authorizeRoles('admin'), validateRegister, authController.register);

module.exports = router;
