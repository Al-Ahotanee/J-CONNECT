import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { query, pool } from '../db.js';
import { optionalAuth } from '../middleware/auth.js';

const router = express.Router();

const ALLOWED_TABLES = new Set([
  'users', 'user_roles', 'profiles', 'education', 'jobs', 'job_applications',
  'job_offers', 'interview_invitations', 'candidate_scores', 'pipeline_history',
  'saved_candidates', 'company_profiles', 'company_reviews', 'mentors',
  'mentorship_mappings', 'mentorship_sessions', 'mentorship_goals',
  'mentorship_listings', 'mentorship_requests', 'mentor_ratings', 'courses',
  'lessons', 'course_materials', 'enrollments', 'lesson_completions',
  'certificates', 'quizzes', 'quiz_questions', 'quiz_attempts',
  'discussion_posts', 'group_chatrooms', 'chatroom_members', 'chatroom_messages',
  'messages', 'notifications', 'announcements', 'video_meetings',
  'skill_endorsements', 'portfolio_items', 'social_posts', 'social_reactions',
  'social_comments', 'social_groups', 'social_group_members', 'social_follows',
  'activity_feed', 'approval_workflows', 'audit_logs', 'branding_settings'
]);

function parseJsonColumns(row) {
  if (!row) return row;
  const jsonCols = ['skills', 'certifications', 'skills_required', 'documents', 'screening_answers', 'options', 'answers', 'participants', 'media_urls', 'metadata', 'old_data', 'new_data'];
  for (const col of jsonCols) {
    if (row[col] !== undefined && typeof row[col] === 'string') {
      try {
        row[col] = JSON.parse(row[col]);
      } catch (e) {
        // keep as is
      }
    }
  }
  return row;
}

// ==========================================
// GET /api/data/:table
// ==========================================
router.get('/:table', optionalAuth, async (req, res) => {
  try {
    const table = req.params.table.toLowerCase();
    if (!ALLOWED_TABLES.has(table)) {
      return res.status(400).json({ error: `Table '${table}' is not recognized or not allowed.` });
    }

    let sql = `SELECT * FROM \`${table}\``;
    const whereClauses = [];
    const params = [];

    // Parse filters from query parameters
    for (const [key, rawVal] of Object.entries(req.query)) {
      if (['select', 'order', 'limit', 'offset', 'single'].includes(key)) continue;

      if (key === 'or') {
        const orStr = String(rawVal);
        const tokens = [];
        let cur = '';
        let depth = 0;
        for (let i = 0; i < orStr.length; i++) {
          const char = orStr[i];
          if (char === '(') depth++;
          else if (char === ')') depth--;
          if (char === ',' && depth === 0) {
            tokens.push(cur.trim());
            cur = '';
          } else {
            cur += char;
          }
        }
        if (cur.trim()) tokens.push(cur.trim());

        const orSubClauses = [];
        for (const token of tokens) {
          if (token.startsWith('and(') && token.endsWith(')')) {
            const inner = token.slice(4, -1);
            const innerTokens = inner.split(',').map(s => s.trim());
            const andClauses = [];
            for (const it of innerTokens) {
              const parts = it.split('.');
              if (parts.length >= 3) {
                const c = parts[0].replace(/[^a-zA-Z0-9_]/g, '');
                const op = parts[1];
                const v = parts.slice(2).join('.');
                if (op === 'eq') { andClauses.push(`\`${c}\` = ?`); params.push(v); }
                else if (op === 'neq') { andClauses.push(`\`${c}\` != ?`); params.push(v); }
                else if (op === 'like' || op === 'ilike') { andClauses.push(`\`${c}\` LIKE ?`); params.push(v); }
                else if (op === 'cs') { andClauses.push(`JSON_CONTAINS(\`${c}\`, JSON_QUOTE(?))`); params.push(v.replace(/^\{|\}$/g, '')); }
              }
            }
            if (andClauses.length > 0) orSubClauses.push(`(${andClauses.join(' AND ')})`);
          } else {
            const parts = token.split('.');
            if (parts.length >= 3) {
              const c = parts[0].replace(/[^a-zA-Z0-9_]/g, '');
              const op = parts[1];
              const v = parts.slice(2).join('.');
              if (op === 'eq') { orSubClauses.push(`\`${c}\` = ?`); params.push(v); }
              else if (op === 'neq') { orSubClauses.push(`\`${c}\` != ?`); params.push(v); }
              else if (op === 'like' || op === 'ilike') { orSubClauses.push(`\`${c}\` LIKE ?`); params.push(v); }
              else if (op === 'cs') { orSubClauses.push(`JSON_CONTAINS(\`${c}\`, JSON_QUOTE(?))`); params.push(v.replace(/^\{|\}$/g, '')); }
              else if (op === 'is') { orSubClauses.push(`\`${c}\` IS NULL`); }
            }
          }
        }
        if (orSubClauses.length > 0) {
          whereClauses.push(`(${orSubClauses.join(' OR ')})`);
        }
        continue;
      }

      const val = String(rawVal);
      if (val.startsWith('eq.')) {
        const v = val.slice(3);
        if (v === 'true') {
          whereClauses.push(`\`${key}\` = TRUE`);
        } else if (v === 'false') {
          whereClauses.push(`\`${key}\` = FALSE`);
        } else if (v === 'null') {
          whereClauses.push(`\`${key}\` IS NULL`);
        } else {
          whereClauses.push(`\`${key}\` = ?`);
          params.push(v);
        }
      } else if (val.startsWith('neq.')) {
        whereClauses.push(`\`${key}\` != ?`);
        params.push(val.slice(4));
      } else if (val.startsWith('like.') || val.startsWith('ilike.')) {
        const pattern = val.replace(/^(like|ilike)\./, '');
        whereClauses.push(`\`${key}\` LIKE ?`);
        params.push(pattern);
      } else if (val.startsWith('cs.')) {
        const csVal = val.slice(3).replace(/^\{|\}$/g, '');
        whereClauses.push(`JSON_CONTAINS(\`${key}\`, JSON_QUOTE(?))`);
        params.push(csVal);
      } else if (val.startsWith('in.')) {
        const inVals = val.slice(3).replace(/^\(|\)$/g, '').split(',').map(s => s.trim());
        if (inVals.length > 0) {
          const placeholders = inVals.map(() => '?').join(',');
          whereClauses.push(`\`${key}\` IN (${placeholders})`);
          params.push(...inVals);
        }
      } else if (val.startsWith('gte.')) {
        whereClauses.push(`\`${key}\` >= ?`);
        params.push(val.slice(4));
      } else if (val.startsWith('gt.')) {
        whereClauses.push(`\`${key}\` > ?`);
        params.push(val.slice(3));
      } else if (val.startsWith('lte.')) {
        whereClauses.push(`\`${key}\` <= ?`);
        params.push(val.slice(4));
      } else if (val.startsWith('lt.')) {
        whereClauses.push(`\`${key}\` < ?`);
        params.push(val.slice(3));
      } else if (val.startsWith('is.')) {
        const isVal = val.slice(3).toLowerCase();
        if (isVal === 'null') whereClauses.push(`\`${key}\` IS NULL`);
        else if (isVal === 'not.null') whereClauses.push(`\`${key}\` IS NOT NULL`);
      } else {
        whereClauses.push(`\`${key}\` = ?`);
        params.push(val);
      }
    }

    if (whereClauses.length > 0) {
      sql += ' WHERE ' + whereClauses.join(' AND ');
    }

    // Order By
    if (req.query.order) {
      const orderParts = String(req.query.order).split(',');
      const orderClauses = orderParts.map(part => {
        const [col, dir] = part.trim().split('.');
        const direction = dir?.toLowerCase() === 'asc' ? 'ASC' : 'DESC';
        return `\`${col}\` ${direction}`;
      });
      sql += ' ORDER BY ' + orderClauses.join(', ');
    }

    // Limit and Offset
    if (req.query.limit) {
      const limit = parseInt(req.query.limit, 10);
      if (!isNaN(limit)) {
        sql += ` LIMIT ${limit}`;
        if (req.query.offset) {
          const offset = parseInt(req.query.offset, 10);
          if (!isNaN(offset)) sql += ` OFFSET ${offset}`;
        }
      }
    }

    const rows = await query(sql, params);
    const parsedRows = (rows || []).map(parseJsonColumns);

    if (req.query.single === 'true') {
      if (parsedRows.length === 0) {
        return res.status(404).json({ error: 'Record not found' });
      }
      return res.json(parsedRows[0]);
    }

    return res.json(parsedRows);
  } catch (err) {
    console.error('[Data GET Error]:', err);
    return res.status(500).json({ error: err.message });
  }
});

// ==========================================
// POST /api/data/:table (Insert or Upsert)
// ==========================================
router.post('/:table', optionalAuth, async (req, res) => {
  try {
    const table = req.params.table.toLowerCase();
    if (!ALLOWED_TABLES.has(table)) {
      return res.status(400).json({ error: `Table '${table}' not allowed.` });
    }

    const records = Array.isArray(req.body) ? req.body : [req.body];
    const inserted = [];

    for (const record of records) {
      const doc = { ...record };
      if (!doc.id) doc.id = uuidv4();

      // Serialize objects / arrays to JSON string
      for (const [k, v] of Object.entries(doc)) {
        if (v !== null && typeof v === 'object') {
          doc[k] = JSON.stringify(v);
        }
      }

      const keys = Object.keys(doc);
      const cols = keys.map(k => `\`${k}\``).join(', ');
      const placeholders = keys.map(() => '?').join(', ');
      const values = Object.values(doc);

      let sql = `INSERT INTO \`${table}\` (${cols}) VALUES (${placeholders})`;

      if (req.query.upsert === 'true') {
        const updateCols = keys
          .filter(k => k !== 'id')
          .map(k => `\`${k}\` = VALUES(\`${k}\`)`)
          .join(', ');
        if (updateCols) {
          sql += ` ON DUPLICATE KEY UPDATE ${updateCols}`;
        }
      }

      await query(sql, values);

      // Fetch inserted row
      const [row] = await query(`SELECT * FROM \`${table}\` WHERE id = ?`, [doc.id]);
      inserted.push(parseJsonColumns(row));
    }

    if (!Array.isArray(req.body)) {
      return res.status(201).json(inserted[0]);
    }
    return res.status(201).json(inserted);
  } catch (err) {
    console.error('[Data POST Error]:', err);
    return res.status(500).json({ error: err.message });
  }
});

// ==========================================
// PATCH /api/data/:table (Update)
// ==========================================
router.patch('/:table', optionalAuth, async (req, res) => {
  try {
    const table = req.params.table.toLowerCase();
    if (!ALLOWED_TABLES.has(table)) {
      return res.status(400).json({ error: `Table '${table}' not allowed.` });
    }

    const updates = { ...req.body };
    delete updates.id;

    for (const [k, v] of Object.entries(updates)) {
      if (v !== null && typeof v === 'object') {
        updates[k] = JSON.stringify(v);
      }
    }

    const updateKeys = Object.keys(updates);
    if (updateKeys.length === 0) {
      return res.status(400).json({ error: 'No fields to update.' });
    }

    const setClause = updateKeys.map(k => `\`${k}\` = ?`).join(', ');
    const params = Object.values(updates);

    const whereClauses = [];
    for (const [key, rawVal] of Object.entries(req.query)) {
      if (['select', 'order', 'limit', 'single'].includes(key)) continue;
      const val = String(rawVal);
      if (val.startsWith('eq.')) {
        whereClauses.push(`\`${key}\` = ?`);
        params.push(val.slice(3));
      } else {
        whereClauses.push(`\`${key}\` = ?`);
        params.push(val);
      }
    }

    if (whereClauses.length === 0) {
      return res.status(400).json({ error: 'Update requires at least one filter criterion.' });
    }

    const sql = `UPDATE \`${table}\` SET ${setClause} WHERE ${whereClauses.join(' AND ')}`;
    await query(sql, params);

    // If query was eq on id or single
    const rows = await query(`SELECT * FROM \`${table}\` WHERE ${whereClauses.join(' AND ')}`, params.slice(updateKeys.length));
    const parsed = (rows || []).map(parseJsonColumns);

    if (req.query.single === 'true' || parsed.length === 1) {
      return res.json(parsed[0] || {});
    }
    return res.json(parsed);
  } catch (err) {
    console.error('[Data PATCH Error]:', err);
    return res.status(500).json({ error: err.message });
  }
});

// ==========================================
// DELETE /api/data/:table
// ==========================================
router.delete('/:table', optionalAuth, async (req, res) => {
  try {
    const table = req.params.table.toLowerCase();
    if (!ALLOWED_TABLES.has(table)) {
      return res.status(400).json({ error: `Table '${table}' not allowed.` });
    }

    const whereClauses = [];
    const params = [];

    for (const [key, rawVal] of Object.entries(req.query)) {
      const val = String(rawVal);
      if (val.startsWith('eq.')) {
        whereClauses.push(`\`${key}\` = ?`);
        params.push(val.slice(3));
      } else {
        whereClauses.push(`\`${key}\` = ?`);
        params.push(val);
      }
    }

    if (whereClauses.length === 0) {
      return res.status(400).json({ error: 'Delete requires at least one filter criterion.' });
    }

    const sql = `DELETE FROM \`${table}\` WHERE ${whereClauses.join(' AND ')}`;
    await query(sql, params);

    return res.json({ success: true });
  } catch (err) {
    console.error('[Data DELETE Error]:', err);
    return res.status(500).json({ error: err.message });
  }
});

export default router;
