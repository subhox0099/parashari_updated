const jwt = require('jsonwebtoken');
const User = require('../models/User');

function getJwtSecret() {
  return process.env.JWT_SECRET || 'dev-secret-key-12345';
}

async function authMiddleware(req, res, next) {
  try {
    const authHeader = req.headers['authorization'] || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!token) return res.status(401).json({ message: 'Authorization token missing' });

    let decoded;
    try {
      decoded = jwt.verify(token, getJwtSecret(), { algorithms: ['HS256'] });
    } catch (e) {
      return res.status(401).json({ message: 'Invalid or expired token' });
    }

    const userId = decoded?.userId;
    if (!userId) return res.status(401).json({ message: 'Invalid token payload' });

    const user = await User.findById(userId).select('-password').lean();
    if (!user) return res.status(401).json({ message: 'User not found' });
    if (user.active === false) return res.status(403).json({ message: 'Account is disabled' });

    // Attach minimal auth info for downstream handlers.
    req.auth = {
      userId: String(user._id),
      role: user.role,
      websiteId: user.websiteId,
    };
    next();
  } catch (err) {
    console.error('authMiddleware failed:', err);
    res.status(500).json({ message: 'Server error' });
  }
}

function requireAdmin(req, res, next) {
  if (req.auth?.role !== 'admin') {
    return res.status(403).json({ message: 'Admin access required' });
  }
  next();
}

function requireEmployee(req, res, next) {
  // In this repo, EMPLOYEE is mapped to role `instructor`.
  // If you have a different mapping, change it here.
  if (req.auth?.role !== 'instructor') {
    return res.status(403).json({ message: 'Employee access required' });
  }
  if (!req.auth?.websiteId) {
    return res.status(400).json({ message: 'Employee must be assigned a websiteId' });
  }
  next();
}

module.exports = { authMiddleware, requireAdmin, requireEmployee };

