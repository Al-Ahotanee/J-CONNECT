import express from 'express';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { query, pool } from '../db.js';
import { requireAuth, generateToken } from '../middleware/auth.js';

const router = express.Router();

// ==========================================
// REGISTER
// ==========================================
router.post('/register', async (req, res) => {
  try {
    const { 
      email, password, full_name, phone, lga, ward, 
      gender, employment_status, user_type, role 
    } = req.body;

    if (!email || !password || !full_name) {
      return res.status(400).json({ error: 'Email, password, and full name are required.' });
    }

    const cleanEmail = email.trim().toLowerCase();

    // Check if user exists
    const existing = await query('SELECT id FROM users WHERE LOWER(email) = ?', [cleanEmail]);
    if (existing && existing.length > 0) {
      return res.status(409).json({ error: 'An account with this email already exists.' });
    }

    const userId = uuidv4();
    const profileId = uuidv4();
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Insert user
    await query('INSERT INTO users (id, email, password_hash) VALUES (?, ?, ?)', [
      userId, cleanEmail, passwordHash
    ]);

    // Insert default role
    const assignedRole = role || 'user';
    await query('INSERT INTO user_roles (id, user_id, role) VALUES (?, ?, ?)', [
      uuidv4(), userId, assignedRole
    ]);

    // Insert profile
    await query(
      `INSERT INTO profiles 
       (id, user_id, full_name, email, phone, lga, ward, gender, employment_status, user_type, profile_completion, approval_status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        profileId, userId, full_name.trim(), cleanEmail,
        phone || null, lga || null, ward || null, gender || null,
        employment_status || 'Unemployed', user_type || 'job_seeker',
        50, 'pending'
      ]
    );

    const token = generateToken({ id: userId, email: cleanEmail });

    return res.status(201).json({
      success: true,
      token,
      user: {
        id: userId,
        email: cleanEmail,
        role: assignedRole,
        roles: [assignedRole],
      },
      profile: {
        id: profileId,
        user_id: userId,
        full_name,
        email: cleanEmail,
        lga,
        ward,
      }
    });
  } catch (err) {
    console.error('[Auth Register Error]:', err);
    return res.status(500).json({ error: err.message || 'Registration failed.' });
  }
});

// ==========================================
// LOGIN
// ==========================================
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const users = await query('SELECT * FROM users WHERE LOWER(email) = ?', [cleanEmail]);

    if (!users || users.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const user = users[0];
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    // Get user roles
    const rolesRows = await query('SELECT role FROM user_roles WHERE user_id = ?', [user.id]);
    const roles = rolesRows.map(r => r.role);
    const primaryRole = roles[0] || 'user';

    // Get profile
    const profiles = await query('SELECT * FROM profiles WHERE user_id = ?', [user.id]);
    const profile = profiles[0] || null;

    const token = generateToken({ id: user.id, email: user.email });

    return res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        role: primaryRole,
        roles,
        user_metadata: {
          full_name: profile?.full_name || '',
        }
      },
      profile,
      roles,
    });
  } catch (err) {
    console.error('[Auth Login Error]:', err);
    return res.status(500).json({ error: err.message || 'Login failed.' });
  }
});

// ==========================================
// CURRENT SESSION (/me)
// ==========================================
router.get('/me', requireAuth, async (req, res) => {
  try {
    const profiles = await query('SELECT * FROM profiles WHERE user_id = ?', [req.user.id]);
    const profile = profiles[0] || null;

    return res.json({
      user: {
        id: req.user.id,
        email: req.user.email,
        role: req.user.role,
        roles: req.user.roles,
        user_metadata: {
          full_name: profile?.full_name || '',
        }
      },
      profile,
      roles: req.user.roles,
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// ==========================================
// CHANGE PASSWORD (Authenticated)
// ==========================================
router.post('/change-password', requireAuth, async (req, res) => {
  try {
    const { current_password, new_password } = req.body;
    if (!new_password || new_password.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters.' });
    }

    const users = await query('SELECT password_hash FROM users WHERE id = ?', [req.user.id]);
    if (!users.length) return res.status(404).json({ error: 'User not found.' });

    if (current_password) {
      const isMatch = await bcrypt.compare(current_password, users[0].password_hash);
      if (!isMatch) {
        return res.status(400).json({ error: 'Current password does not match.' });
      }
    }

    const salt = await bcrypt.genSalt(10);
    const newHash = await bcrypt.hash(new_password, salt);

    await query('UPDATE users SET password_hash = ? WHERE id = ?', [newHash, req.user.id]);

    return res.json({ success: true, message: 'Password updated successfully.' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// ==========================================
// RESET PASSWORD (Public recovery link)
// ==========================================
router.post('/reset-password', async (req, res) => {
  try {
    const { email, new_password } = req.body;
    if (!email || !new_password || new_password.length < 6) {
      return res.status(400).json({ error: 'Valid email and new password (min 6 chars) required.' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const users = await query('SELECT id FROM users WHERE LOWER(email) = ?', [cleanEmail]);
    if (!users.length) {
      return res.status(404).json({ error: 'Account not found with this email.' });
    }

    const salt = await bcrypt.genSalt(10);
    const newHash = await bcrypt.hash(new_password, salt);

    await query('UPDATE users SET password_hash = ? WHERE id = ?', [newHash, users[0].id]);

    return res.json({ success: true, message: 'Password reset successfully.' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;
