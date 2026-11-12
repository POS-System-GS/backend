const jwt = require('jsonwebtoken');

/**
 * Middleware to authenticate requests via JWT Token
 */
const authenticateJWT = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
      if (err) {
        return res.status(403).json({ 
          success: false, 
          error: 'Forbidden: Access token is invalid or expired.' 
        });
      }

      // Attach user payload (id, username, role, email) to request
      req.user = user;
      next();
    });
  } else {
    res.status(401).json({ 
      success: false, 
      error: 'Unauthorized: Access token is missing or malformed.' 
    });
  }
};

/**
 * Middleware to restrict access based on user role(s)
 * @param {string[]} roles - Array of permitted roles (e.g., ['admin'])
 */
const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        success: false, 
        error: 'Unauthorized: User is not authenticated.' 
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ 
        success: false, 
        error: `Forbidden: User role [${req.user.role}] does not have permission to access this resource.` 
      });
    }

    next();
  };
};

module.exports = {
  authenticateJWT,
  authorizeRoles
};
