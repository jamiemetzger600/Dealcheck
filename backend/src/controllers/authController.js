import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import pool from '../db/pool.js';
import { setAuthCookie, clearAuthCookie } from '../lib/authCookies.js';

const SALT_ROUNDS = 10;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '30d';

const DB_ACTIVE_TIME_QUOTA =
  "Database is temporarily unavailable: the database plan's active-time limit was reached. Upgrade the database or wait for the limit to reset.";

function isDbActiveTimeQuotaError(error) {
  const msg = String(error?.message || '');
  return msg.includes('exceeded the active time quota') || msg.includes('active time quota');
}

// Register new user
export const register = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password required' });
  }

  if (password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters' });
  }

  try {
    // Check if user exists
    const existingUser = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      [email.toLowerCase()]
    );

    if (existingUser.rows.length > 0) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    // Create user
    const result = await pool.query(
      'INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id, email, created_at',
      [email.toLowerCase(), passwordHash]
    );

    const user = result.rows[0];

    // Create default user settings
    await pool.query(
      'INSERT INTO user_settings (user_id) VALUES ($1)',
      [user.id]
    );

    // Create default subscription (free)
    await pool.query(
      'INSERT INTO subscriptions (user_id, status, plan) VALUES ($1, $2, $3)',
      [user.id, 'none', 'free']
    );

    // Generate JWT
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );
    setAuthCookie(res, token, req);

    res.status(201).json({
      message: 'User registered successfully',
      user: {
        id: user.id,
        email: user.email,
        createdAt: user.created_at
      },
      token
    });

  } catch (error) {
    console.error('Registration error:', error);
    if (isDbActiveTimeQuotaError(error)) {
      return res.status(503).json({ error: DB_ACTIVE_TIME_QUOTA });
    }
    res.status(500).json({ error: 'Server error during registration' });
  }
};

// Login
export const login = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password required' });
  }

  try {
    // Get user
    const result = await pool.query(
      'SELECT id, email, password_hash, created_at FROM users WHERE email = $1',
      [email.toLowerCase()]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = result.rows[0];

    // Verify password
    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate JWT
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );
    setAuthCookie(res, token, req);

    res.json({
      message: 'Login successful',
      user: {
        id: user.id,
        email: user.email,
        createdAt: user.created_at
      },
      token
    });

  } catch (error) {
    console.error('Login error:', error);
    if (isDbActiveTimeQuotaError(error)) {
      return res.status(503).json({ error: DB_ACTIVE_TIME_QUOTA });
    }
    res.status(500).json({ error: 'Server error during login' });
  }
};

// Get current user
export const getCurrentUser = async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, email, created_at FROM users WHERE id = $1',
      [req.user.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user: result.rows[0] });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

export const logout = async (req, res) => {
  clearAuthCookie(res);
  res.json({ message: 'Logout successful' });
};
