/**
 * Middleware for validating incoming request payloads
 */

// Helper to check if email is valid
const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

const validateRegister = (req, res, next) => {
  const { username, email, password, role } = req.body;
  const errors = [];

  if (!username || typeof username !== 'string' || username.trim().length < 3) {
    errors.push('Username is required and must be at least 3 characters long.');
  }

  if (!email || !isValidEmail(email)) {
    errors.push('A valid email address is required.');
  }

  if (!password || typeof password !== 'string' || password.length < 6) {
    errors.push('Password is required and must be at least 6 characters long.');
  }

  if (!role || !['admin', 'cashier'].includes(role)) {
    errors.push('Role is required and must be either "admin" or "cashier".');
  }

  if (errors.length > 0) {
    return res.status(400).json({ success: false, errors });
  }

  next();
};

const validateLogin = (req, res, next) => {
  const { email, password } = req.body;
  const errors = [];

  if (!email) {
    errors.push('Email or Username is required.');
  }

  if (!password) {
    errors.push('Password is required.');
  }

  if (errors.length > 0) {
    return res.status(400).json({ success: false, errors });
  }

  next();
};

const validateCategory = (req, res, next) => {
  const { name } = req.body;
  const errors = [];

  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    errors.push('Category name is required.');
  }

  if (errors.length > 0) {
    return res.status(400).json({ success: false, errors });
  }

  next();
};

const validateProduct = (req, res, next) => {
  const { name, barcode, price, costPrice, stockQuantity, reorderLevel, categoryId } = req.body;
  const errors = [];

  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    errors.push('Product name is required.');
  }

  if (!barcode || typeof barcode !== 'string' || barcode.trim().length === 0) {
    errors.push('Product barcode is required.');
  }

  if (price === undefined || typeof price !== 'number' || price < 0) {
    errors.push('Product price is required and must be a positive number.');
  }

  if (costPrice === undefined || typeof costPrice !== 'number' || costPrice < 0) {
    errors.push('Product cost price is required and must be a positive number.');
  }

  if (stockQuantity !== undefined && (typeof stockQuantity !== 'number' || stockQuantity < 0)) {
    errors.push('Stock quantity must be a non-negative integer.');
  }

  if (reorderLevel !== undefined && (typeof reorderLevel !== 'number' || reorderLevel < 0)) {
    errors.push('Reorder level must be a non-negative integer.');
  }

  if (categoryId !== undefined && categoryId !== null && typeof categoryId !== 'number') {
    errors.push('Category ID must be an integer.');
  }

  if (errors.length > 0) {
    return res.status(400).json({ success: false, errors });
  }

  next();
};

const validateCustomer = (req, res, next) => {
  const { name, email, phone } = req.body;
  const errors = [];

  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    errors.push('Customer name is required.');
  }

  if (email && !isValidEmail(email)) {
    errors.push('Email format is invalid.');
  }

  if (phone && (typeof phone !== 'string' || phone.trim().length < 8)) {
    errors.push('Phone number must be at least 8 characters.');
  }

  if (errors.length > 0) {
    return res.status(400).json({ success: false, errors });
  }

  next();
};

const validateSale = (req, res, next) => {
  const { paymentMethod, items, customerId, discountAmount, taxAmount } = req.body;
  const errors = [];

  if (!paymentMethod || !['cash', 'card', 'mobile'].includes(paymentMethod)) {
    errors.push('Payment method is required and must be either "cash", "card", or "mobile".');
  }

  if (!items || !Array.isArray(items) || items.length === 0) {
    errors.push('Sales transaction must contain at least one item.');
  } else {
    items.forEach((item, index) => {
      if (!item.productId || typeof item.productId !== 'number') {
        errors.push(`Item at index ${index} must have a valid productId.`);
      }
      if (!item.quantity || typeof item.quantity !== 'number' || item.quantity <= 0) {
        errors.push(`Item at index ${index} must have a quantity greater than 0.`);
      }
    });
  }

  if (customerId !== undefined && customerId !== null && typeof customerId !== 'number') {
    errors.push('Customer ID must be a number.');
  }

  if (discountAmount !== undefined && (typeof discountAmount !== 'number' || discountAmount < 0)) {
    errors.push('Discount amount must be a positive number.');
  }

  if (taxAmount !== undefined && (typeof taxAmount !== 'number' || taxAmount < 0)) {
    errors.push('Tax amount must be a positive number.');
  }

  if (errors.length > 0) {
    return res.status(400).json({ success: false, errors });
  }

  next();
};

module.exports = {
  validateRegister,
  validateLogin,
  validateCategory,
  validateProduct,
  validateCustomer,
  validateSale
};
