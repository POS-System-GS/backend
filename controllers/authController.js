const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { sql, poolPromise } = require('../config/db');

/**
 * Register User
 * POST /api/auth/register
 */
exports.register = async (req, res, next) => {
  try {
    const { username, email, password, role } = req.body;

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const pool = await poolPromise;
    
    // Check if user already exists
    const checkQuery = `
      SELECT ID FROM dbo.users 
      WHERE Username = @Username OR Email = @Email
    `;
    const checkResult = await pool.request()
      .input('Username', sql.NVarChar, username)
      .input('Email', sql.NVarChar, email)
      .query(checkQuery);

    if (checkResult.recordset.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Username or email already exists.'
      });
    }

    // Insert user
    const insertQuery = `
      INSERT INTO dbo.users (Username, Email, PasswordHash, Role)
      OUTPUT INSERTED.ID, INSERTED.Username, INSERTED.Email, INSERTED.Role, INSERTED.CreatedAt
      VALUES (@Username, @Email, @PasswordHash, @Role)
    `;

    const result = await pool.request()
      .input('Username', sql.NVarChar, username)
      .input('Email', sql.NVarChar, email)
      .input('PasswordHash', sql.NVarChar, passwordHash)
      .input('Role', sql.NVarChar, role)
      .query(insertQuery);

    const newUser = result.recordset[0];

    res.status(201).json({
      success: true,
      message: 'User registered successfully.',
      data: newUser
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Login User
 * POST /api/auth/login
 */
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body; // email could be username or email

    const pool = await poolPromise;
    
    // Find user by username or email
    const query = `
      SELECT ID, Username, Email, PasswordHash, Role 
      FROM dbo.users 
      WHERE Email = @Identifier OR Username = @Identifier
    `;

    const result = await pool.request()
      .input('Identifier', sql.NVarChar, email)
      .query(query);

    if (result.recordset.length === 0) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials.'
      });
    }

    const user = result.recordset[0];

    // Verify password
    const isMatch = await bcrypt.compare(password, user.PasswordHash);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials.'
      });
    }

    // Generate JWT
    const payload = {
      id: user.ID,
      username: user.Username,
      email: user.Email,
      role: user.Role
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN || '24h'
    });

    res.status(200).json({
      success: true,
      message: 'Logged in successfully.',
      token: `Bearer ${token}`,
      user: {
        id: user.ID,
        username: user.Username,
        email: user.Email,
        role: user.Role
      }
    });
  } catch (error) {
    next(error);
  }
};
