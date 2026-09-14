import jwt from 'jsonwebtoken';
import { query } from '../db.js';

const JWT_SECRET = process.env.JWT_SECRET || 'jconnect_super_secret_jwt_key_2026';

export async function requireAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authentication required. No token provided.' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);

    // Fetch fresh user and roles from DB
    const users = await query('SELECT id, email FROM users WHERE id = ?', [decoded.id]);
    if (!users || users.length === 0) {
      return res.status(401).json({ error: 'User not found or session invalid.' });
    }

    const rolesRows = await query('SELECT role FROM user_roles WHERE user_id = ?', [decoded.id]);
    const roles = rolesRows.map(r => r.role);

    req.user = {
      id: users[0].id,
      email: users[0].email,
      roles: roles.length ? roles : ['user'],
      role: roles[0] || 'user',
    };

    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired. Please log in again.' });
    }
    return res.status(401).json({ error: 'Invalid authentication token.' });
  }
}

export function requireRole(allowedRoles = []) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required.' });
    }

    const hasPermission = req.user.roles.some(r => 
      allowedRoles.includes(r) || r === 'super_admin'
    );

    if (!hasPermission) {
      return res.status(403).json({ 
        error: `Forbidden: requires one of the following roles: [${allowedRoles.join(', ')}]` 
      });
    }

    next();
  };
}

export async function optionalAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      const decoded = jwt.verify(token, JWT_SECRET);
      const rolesRows = await query('SELECT role FROM user_roles WHERE user_id = ?', [decoded.id]);
      req.user = {
        id: decoded.id,
        email: decoded.email,
        roles: rolesRows.map(r => r.role),
      };
    }
  } catch (e) {
    // Ignore invalid token in optionalAuth
  }
  next();
}

export function generateToken(payload, expiresIn = '7d') {
  return jwt.sign(payload, JWT_SECRET, { expiresIn });
}
