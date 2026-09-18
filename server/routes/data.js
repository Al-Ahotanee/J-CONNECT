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
  'certificates', 'quizzes', 'quiz_questions', 'quiz_questions_public', 'quiz_attempts',
  'discussion_posts', 'group_chatrooms', 'chatroom_members', 'chatroom_messages',
  'messages', 'notifications', 'announcements', 'video_meetings',
  'skill_endorsements', 'portfolio_items', 'social_posts', 'social_reactions',
  'social_comments', 'social_groups', 'social_group_members', 'social_follows',
  'activity_feed', 'approval_workflows', 'audit_logs', 'branding_settings'
]);

const RELATION_MAP = {
  profiles: {
    education: { table: 'education', foreignKey: 'user_id', localKey: 'user_id', isArray: true },
    user_roles: { table: 'user_roles', foreignKey: 'user_id', localKey: 'user_id', isArray: true },
  },
  enrollments: {
    courses: { table: 'courses', foreignKey: 'id', localKey: 'course_id', isArray: false },
    profiles: { table: 'profiles', foreignKey: 'user_id', localKey: 'user_id', isArray: false },
  },
  certificates: {
    courses: { table: 'courses', foreignKey: 'id', localKey: 'course_id', isArray: false },
    profiles: { table: 'profiles', foreignKey: 'user_id', localKey: 'user_id', isArray: false },
  },
  quiz_attempts: {
    quizzes: { table: 'quizzes', foreignKey: 'id', localKey: 'quiz_id', isArray: false },
    profiles: { table: 'profiles', foreignKey: 'user_id', localKey: 'user_id', isArray: false },
  },
  quizzes: {
    quiz_questions: { table: 'quiz_questions', foreignKey: 'quiz_id', localKey: 'id', isArray: true },
    courses: { table: 'courses', foreignKey: 'id', localKey: 'course_id', isArray: false },
    jobs: { table: 'jobs', foreignKey: 'id', localKey: 'job_id', isArray: false },
  },
  quiz_questions: {
    quizzes: { table: 'quizzes', foreignKey: 'id', localKey: 'quiz_id', isArray: false },
  },
  mentorship_mappings: {
    mentors: { table: 'mentors', foreignKey: 'id', localKey: 'mentor_id', isArray: false },
    mentee: { table: 'profiles', foreignKey: 'user_id', localKey: 'mentee_id', isArray: false },
    profiles: { table: 'profiles', foreignKey: 'user_id', localKey: 'mentee_id', isArray: false },
  },
  mentors: {
    profiles: { table: 'profiles', foreignKey: 'user_id', localKey: 'user_id', isArray: false },
  },
  mentorship_sessions: {
    mentor: { table: 'profiles', foreignKey: 'user_id', localKey: 'mentor_id', isArray: false },
    mentee: { table: 'profiles', foreignKey: 'user_id', localKey: 'mentee_id', isArray: false },
    mapping: { table: 'mentorship_mappings', foreignKey: 'id', localKey: 'mapping_id', isArray: false },
  },
  mentorship_goals: {
    mapping: { table: 'mentorship_mappings', foreignKey: 'id', localKey: 'mapping_id', isArray: false },
    profiles: { table: 'profiles', foreignKey: 'user_id', localKey: 'created_by', isArray: false },
  },
  mentor_ratings: {
    mentor: { table: 'profiles', foreignKey: 'user_id', localKey: 'mentor_id', isArray: false },
    mentee: { table: 'profiles', foreignKey: 'user_id', localKey: 'mentee_id', isArray: false },
    mapping: { table: 'mentorship_mappings', foreignKey: 'id', localKey: 'mapping_id', isArray: false },
  },
  mentorship_listings: {
    profiles: { table: 'profiles', foreignKey: 'user_id', localKey: 'user_id', isArray: false },
  },
  mentorship_requests: {
    from_profile: { table: 'profiles', foreignKey: 'user_id', localKey: 'from_user_id', isArray: false },
    to_profile: { table: 'profiles', foreignKey: 'user_id', localKey: 'to_user_id', isArray: false },
    profiles: { table: 'profiles', foreignKey: 'user_id', localKey: 'from_user_id', isArray: false },
  },
  skill_endorsements: {
    endorser: { table: 'profiles', foreignKey: 'user_id', localKey: 'endorser_id', isArray: false },
    profiles: { table: 'profiles', foreignKey: 'user_id', localKey: 'user_id', isArray: false },
  },
  job_applications: {
    jobs: { table: 'jobs', foreignKey: 'id', localKey: 'job_id', isArray: false },
    profiles: { table: 'profiles', foreignKey: 'user_id', localKey: 'user_id', isArray: false },
  },
  job_offers: {
    jobs: { table: 'jobs', foreignKey: 'id', localKey: 'job_id', isArray: false },
    profiles: { table: 'profiles', foreignKey: 'user_id', localKey: 'user_id', isArray: false },
  },
  interview_invitations: {
    jobs: { table: 'jobs', foreignKey: 'id', localKey: 'job_id', isArray: false },
    profiles: { table: 'profiles', foreignKey: 'user_id', localKey: 'user_id', isArray: false },
  },
  candidate_scores: {
    profiles: { table: 'profiles', foreignKey: 'user_id', localKey: 'recruiter_id', isArray: false },
    job_applications: { table: 'job_applications', foreignKey: 'id', localKey: 'application_id', isArray: false },
  },
  company_reviews: {
    profiles: { table: 'profiles', foreignKey: 'user_id', localKey: 'user_id', isArray: false },
  },
  jobs: {
    applications: { table: 'job_applications', foreignKey: 'job_id', localKey: 'id', isArray: true },
    profiles: { table: 'profiles', foreignKey: 'user_id', localKey: 'posted_by', isArray: false },
  },
  saved_candidates: {
    profiles: { table: 'profiles', foreignKey: 'user_id', localKey: 'candidate_id', isArray: false },
  },
  approval_workflows: {
    profiles: { table: 'profiles', foreignKey: 'user_id', localKey: 'submitted_by', isArray: false },
    reviewer: { table: 'profiles', foreignKey: 'user_id', localKey: 'reviewer_id', isArray: false },
  },
  audit_logs: {
    profiles: { table: 'profiles', foreignKey: 'user_id', localKey: 'user_id', isArray: false },
    actor: { table: 'profiles', foreignKey: 'user_id', localKey: 'actor_id', isArray: false },
  },
  social_posts: {
    profiles: { table: 'profiles', foreignKey: 'user_id', localKey: 'user_id', isArray: false },
    social_groups: { table: 'social_groups', foreignKey: 'id', localKey: 'group_id', isArray: false },
    comments: { table: 'social_comments', foreignKey: 'post_id', localKey: 'id', isArray: true },
    reactions: { table: 'social_reactions', foreignKey: 'post_id', localKey: 'id', isArray: true },
  },
  social_comments: {
    profiles: { table: 'profiles', foreignKey: 'user_id', localKey: 'user_id', isArray: false },
    post: { table: 'social_posts', foreignKey: 'id', localKey: 'post_id', isArray: false },
  },
  social_reactions: {
    profiles: { table: 'profiles', foreignKey: 'user_id', localKey: 'user_id', isArray: false },
  },
  social_groups: {
    creator: { table: 'profiles', foreignKey: 'user_id', localKey: 'created_by', isArray: false },
    profiles: { table: 'profiles', foreignKey: 'user_id', localKey: 'created_by', isArray: false },
    members: { table: 'social_group_members', foreignKey: 'group_id', localKey: 'id', isArray: true },
    posts: { table: 'social_posts', foreignKey: 'group_id', localKey: 'id', isArray: true },
  },
  social_group_members: {
    profiles: { table: 'profiles', foreignKey: 'user_id', localKey: 'user_id', isArray: false },
    group: { table: 'social_groups', foreignKey: 'id', localKey: 'group_id', isArray: false },
  },
  social_follows: {
    profiles: { table: 'profiles', foreignKey: 'user_id', localKey: 'following_id', isArray: false },
    following: { table: 'profiles', foreignKey: 'user_id', localKey: 'following_id', isArray: false },
    follower: { table: 'profiles', foreignKey: 'user_id', localKey: 'follower_id', isArray: false },
  }
};

async function resolveRelations(parentTable, rows, selectStr) {
  if (!selectStr || !rows || rows.length === 0) return rows;
  
  const relRegex = /(?:([a-zA-Z0-9_]+):)?([a-zA-Z0-9_]+)\(([^)]*)\)/g;
  let match;
  while ((match = relRegex.exec(selectStr)) !== null) {
    const alias = match[1];
    const relName = match[2];
    const requestedCols = match[3].trim();
    
    let config = null;
    let propName = alias || relName;

    if (alias && relName.endsWith('_id')) {
      config = {
        table: 'profiles',
        foreignKey: 'user_id',
        localKey: relName,
        isArray: false
      };
    } else if (RELATION_MAP[parentTable] && RELATION_MAP[parentTable][relName]) {
      config = RELATION_MAP[parentTable][relName];
    }

    if (!config) continue;

    const { table: targetTable, foreignKey, localKey, isArray } = config;
    const keys = [...new Set(rows.map(r => r[localKey]).filter(v => v !== null && v !== undefined && v !== ''))];
    
    if (keys.length === 0) {
      for (const row of rows) {
        row[propName] = isArray ? [] : null;
      }
      continue;
    }

    let selectCols = '*';
    if (requestedCols && requestedCols !== '*') {
      const cols = requestedCols.split(',').map(c => c.trim()).filter(Boolean);
      if (!cols.includes(foreignKey) && !cols.includes('*')) {
        cols.push(foreignKey);
      }
      selectCols = cols.map(c => `\`${c.replace(/[^a-zA-Z0-9_]/g, '')}\``).join(', ');
    }

    const placeholders = keys.map(() => '?').join(', ');
    try {
      const relRows = await query(
        `SELECT ${selectCols} FROM \`${targetTable}\` WHERE \`${foreignKey}\` IN (${placeholders})`,
        keys
      );
      const parsedRelRows = (relRows || []).map(parseJsonColumns);

      if (isArray) {
        const groupMap = new Map();
        for (const item of parsedRelRows) {
          const k = String(item[foreignKey]);
          if (!groupMap.has(k)) groupMap.set(k, []);
          groupMap.get(k).push(item);
        }
        for (const row of rows) {
          const k = String(row[localKey]);
          row[propName] = groupMap.get(k) || [];
        }
      } else {
        const singleMap = new Map();
        for (const item of parsedRelRows) {
          singleMap.set(String(item[foreignKey]), item);
        }
        for (const row of rows) {
          const k = String(row[localKey]);
          row[propName] = singleMap.get(k) || null;
        }
      }
    } catch (relErr) {
      console.warn(`[ResolveRelation Warning] Failed to join ${targetTable} on ${parentTable}:`, relErr.message);
      for (const row of rows) {
        row[propName] = isArray ? [] : null;
      }
    }
  }

  return rows;
}

function parseJsonColumns(row) {
  if (!row) return row;
  const jsonCols = [
    'skills', 'certifications', 'skills_required', 'documents', 'screening_answers',
    'options', 'answers', 'participants', 'media_urls', 'metadata', 'old_data', 'new_data',
    'custom_questions', 'custom_answers', 'benefits', 'details'
  ];
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

    let sql = table === 'quiz_questions_public'
      ? 'SELECT id, quiz_id, question, options, order_index, created_at FROM `quiz_questions`'
      : `SELECT * FROM \`${table}\``;
    const whereClauses = [];
    const params = [];

    // Parse filters from query parameters
    for (const [key, rawVal] of Object.entries(req.query)) {
      if (['select', 'order', 'limit', 'offset', 'single', 'maybe_single'].includes(key)) continue;

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

    // Resolve embedded / joined resources requested in select
    await resolveRelations(table, parsedRows, req.query.select);

    if (req.query.maybe_single === 'true') {
      return res.json(parsedRows[0] || null);
    }

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

const tableColumnCache = new Map();

async function getValidColumnsForTable(table) {
  if (tableColumnCache.has(table)) {
    return tableColumnCache.get(table);
  }
  try {
    const cols = await query(`SHOW COLUMNS FROM \`${table}\``);
    if (Array.isArray(cols) && cols.length > 0 && cols[0] && typeof cols[0].Field === 'string') {
      const set = new Set(cols.map(c => c.Field));

      // Auto-migrate newly required columns if missing on remote DB
      if (table === 'courses') {
        if (!set.has('bank_name')) {
          try {
            await query('ALTER TABLE `courses` ADD COLUMN `bank_name` VARCHAR(100)');
            set.add('bank_name');
          } catch (e) {}
        }
        if (!set.has('account_number')) {
          try {
            await query('ALTER TABLE `courses` ADD COLUMN `account_number` VARCHAR(20)');
            set.add('account_number');
          } catch (e) {}
        }
        if (!set.has('account_name')) {
          try {
            await query('ALTER TABLE `courses` ADD COLUMN `account_name` VARCHAR(100)');
            set.add('account_name');
          } catch (e) {}
        }
        if (!set.has('currency')) {
          try {
            await query("ALTER TABLE `courses` ADD COLUMN `currency` VARCHAR(10) DEFAULT 'NGN'");
            set.add('currency');
          } catch (e) {}
        }
      }

      if (table === 'course_materials') {
        try {
          await query('ALTER TABLE `course_materials` MODIFY COLUMN `file_size` BIGINT DEFAULT 0');
        } catch (e) {}
      }

      tableColumnCache.set(table, set);
      return set;
    }
  } catch (e) {
    // fallback
  }
  return null;
}

function normalizeDocValues(table, doc, reqUser) {
  if (table === 'courses') {
    if (!doc.slug && doc.title) {
      doc.slug = String(doc.title).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') + '-' + uuidv4().substring(0, 8);
    }
    if (!doc.instructor_id) {
      doc.instructor_id = doc.created_by || doc.creator_id || reqUser?.id || 'instructor-default';
    }
  } else if (table === 'course_materials') {
    if (doc.file_size !== undefined && doc.file_size !== null) {
      if (typeof doc.file_size === 'string') {
        const m = doc.file_size.match(/^([\d.]+)\s*(MB|KB|GB|B)?$/i);
        if (m) {
          const num = parseFloat(m[1]);
          const unit = (m[2] || 'B').toUpperCase();
          if (unit === 'GB') doc.file_size = Math.round(num * 1024 * 1024 * 1024);
          else if (unit === 'MB') doc.file_size = Math.round(num * 1024 * 1024);
          else if (unit === 'KB') doc.file_size = Math.round(num * 1024);
          else doc.file_size = Math.round(num);
        } else {
          const parsed = parseInt(doc.file_size, 10);
          doc.file_size = isNaN(parsed) ? 0 : parsed;
        }
      } else if (typeof doc.file_size === 'number') {
        doc.file_size = Math.round(doc.file_size);
      }
    }
  } else if (table === 'mentors') {
    if (!doc.category) {
      doc.category = doc.specialization || 'General Mentorship';
    }
  } else if (table === 'company_profiles') {
    if (!doc.name && doc.company_name) {
      doc.name = doc.company_name;
    }
    if (!doc.company_name && doc.name) {
      doc.company_name = doc.name;
    }
  }

  for (const [k, v] of Object.entries(doc)) {
    if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(v)) {
      let cleaned = v.replace('T', ' ').replace(/\..+$/, '').replace('Z', '');
      if (cleaned.length === 16) cleaned += ':00';
      doc[k] = cleaned;
    }
  }
}

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
    const validCols = await getValidColumnsForTable(table);

    for (const record of records) {
      const doc = { ...record };
      if (!doc.id) doc.id = uuidv4();

      normalizeDocValues(table, doc, req.user);

      // Safe column filter: remove any fields not in MySQL schema
      if (validCols) {
        for (const k of Object.keys(doc)) {
          if (!validCols.has(k)) {
            delete doc[k];
          }
        }
      }

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

      // Fetch inserted or upserted row
      let row = null;
      const rows = await query(`SELECT * FROM \`${table}\` WHERE id = ?`, [doc.id]);
      if (Array.isArray(rows) && rows.length > 0) {
        row = rows[0];
      } else if (doc.user_id) {
        const uRows = await query(`SELECT * FROM \`${table}\` WHERE user_id = ?`, [doc.user_id]);
        if (Array.isArray(uRows) && uRows.length > 0) row = uRows[0];
      }
      inserted.push(parseJsonColumns(row || doc));
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
      if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(v)) {
        let cleaned = v.replace('T', ' ').replace(/\..+$/, '').replace('Z', '');
        if (cleaned.length === 16) cleaned += ':00';
        updates[k] = cleaned;
      }
    }

    // Safe column filter: remove any fields not in MySQL schema
    const validCols = await getValidColumnsForTable(table);
    if (validCols) {
      for (const k of Object.keys(updates)) {
        if (!validCols.has(k)) {
          delete updates[k];
        }
      }
    }

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
