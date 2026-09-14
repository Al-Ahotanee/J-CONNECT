// ======================================================================
// J-CONNECT RESILIENT IN-MEMORY DATABASE ENGINE
// Provides instant zero-config database execution when MySQL is not running locally.
// Seamlessly replaced by Aiven MySQL whenever MYSQL_HOST/MYSQL_URL is provided.
// ======================================================================

const tables = new Map();

function cleanIdentifier(str) {
  return str.replace(/[`"' ]/g, '').toLowerCase();
}

export function resetInMemoryDb() {
  tables.clear();
}

export function executeInMemory(sql, params = []) {
  const trimmed = sql.trim();
  const lower = trimmed.toLowerCase();

  // 1. Connection check
  if (lower.startsWith('select 1 as connected') || lower.startsWith('select 1')) {
    return [{ connected: 1 }];
  }

  // 2. CREATE TABLE / VIEW
  if (lower.startsWith('create table')) {
    const match = trimmed.match(/create\s+table\s+(?:if\s+not\s+exists\s+)?([`a-zA-Z0-9_]+)/i);
    if (match) {
      const tbl = cleanIdentifier(match[1]);
      if (!tables.has(tbl)) tables.set(tbl, []);
    }
    return [{ affectedRows: 0 }];
  }

  if (lower.startsWith('create') && (lower.includes('view') || lower.includes('index'))) {
    return [{ affectedRows: 0 }];
  }

  // 3. INSERT / INSERT IGNORE
  if (lower.startsWith('insert')) {
    const tblMatch = trimmed.match(/insert\s+(?:ignore\s+)?into\s+([`a-zA-Z0-9_]+)/i);
    if (!tblMatch) return [{ affectedRows: 0 }];
    const tbl = cleanIdentifier(tblMatch[1]);
    if (!tables.has(tbl)) tables.set(tbl, []);
    const rowList = tables.get(tbl);

    const colsMatch = trimmed.match(/\(([^)]+)\)\s*values/i);
    if (!colsMatch) return [{ affectedRows: 0 }];
    const cols = colsMatch[1].split(',').map(c => cleanIdentifier(c));

    // Map parameters to columns
    const doc = {};
    cols.forEach((col, idx) => {
      doc[col] = params[idx] !== undefined ? params[idx] : null;
    });

    // Check duplicate key on id or unique keys
    const existingIdx = rowList.findIndex(r => {
      if (doc.id && r.id === doc.id) return true;
      if (tbl === 'users' && doc.email && r.email?.toLowerCase() === doc.email?.toLowerCase()) return true;
      if (tbl === 'user_roles' && doc.user_id && doc.role && r.user_id === doc.user_id && r.role === doc.role) return true;
      return false;
    });

    if (existingIdx >= 0) {
      if (lower.includes('on duplicate key update')) {
        rowList[existingIdx] = { ...rowList[existingIdx], ...doc };
        return [{ insertId: doc.id, affectedRows: 1 }];
      }
      if (lower.includes('ignore')) {
        return [{ insertId: doc.id, affectedRows: 0 }];
      }
      rowList[existingIdx] = { ...rowList[existingIdx], ...doc };
      return [{ insertId: doc.id, affectedRows: 1 }];
    }

    if (!doc.created_at) doc.created_at = new Date().toISOString();
    rowList.push(doc);
    return [{ insertId: doc.id, affectedRows: 1 }];
  }

  // 4. SELECT
  if (lower.startsWith('select')) {
    let tbl = '';
    const fromMatch = trimmed.match(/from\s+([`a-zA-Z0-9_]+)/i);
    if (fromMatch) {
      tbl = cleanIdentifier(fromMatch[1]);
    }

    if (tbl === 'quiz_questions_public') tbl = 'quiz_questions';
    if (!tables.has(tbl)) tables.set(tbl, []);
    let rows = [...(tables.get(tbl) || [])];

    // COUNT(*)
    if (lower.includes('count(*)')) {
      return [{ cnt: rows.length }];
    }

    // WHERE filtering
    if (lower.includes('where')) {
      const wherePart = trimmed.slice(trimmed.toLowerCase().indexOf('where') + 5);
      const whereClause = wherePart.split(/order\s+by|limit/i)[0].trim();
      rows = filterRows(rows, whereClause, params);
    }

    // ORDER BY
    const orderMatch = trimmed.match(/order\s+by\s+([^limit]+)/i);
    if (orderMatch) {
      const orderDefs = orderMatch[1].split(',').map(s => s.trim());
      for (const o of orderDefs) {
        const parts = o.split(/\s+/);
        const col = cleanIdentifier(parts[0]);
        const dir = parts[1]?.toLowerCase() === 'asc' ? 1 : -1;
        rows.sort((a, b) => {
          const valA = a[col] || '';
          const valB = b[col] || '';
          return valA > valB ? dir : valA < valB ? -dir : 0;
        });
      }
    }

    // LIMIT & OFFSET
    const limitMatch = trimmed.match(/limit\s+(\d+)(?:\s+offset\s+(\d+))?/i);
    if (limitMatch) {
      const lim = parseInt(limitMatch[1], 10);
      const off = limitMatch[2] ? parseInt(limitMatch[2], 10) : 0;
      rows = rows.slice(off, off + lim);
    }

    // Column projection (e.g. SELECT col1, col2 FROM ...)
    const selectColsMatch = trimmed.match(/select\s+(.+?)\s+from/i);
    if (selectColsMatch) {
      const colStr = selectColsMatch[1].trim();
      if (colStr !== '*' && !colStr.toLowerCase().includes('count(*)')) {
        const requestedCols = colStr.split(',').map(cleanIdentifier);
        return rows.map(r => {
          const projected = {};
          for (const c of requestedCols) {
            projected[c] = r[c] !== undefined ? r[c] : null;
          }
          return projected;
        });
      }
    }

    return rows.map(r => ({ ...r }));
  }

  // 5. UPDATE
  if (lower.startsWith('update')) {
    const tblMatch = trimmed.match(/update\s+([`a-zA-Z0-9_]+)/i);
    if (!tblMatch) return [{ affectedRows: 0 }];
    const tbl = cleanIdentifier(tblMatch[1]);
    if (!tables.has(tbl)) tables.set(tbl, []);
    const rowList = tables.get(tbl);

    const setMatch = trimmed.match(/set\s+(.+?)\s+where/i);
    if (!setMatch) return [{ affectedRows: 0 }];
    const setAssignments = setMatch[1].split(',').map(s => s.trim());

    const numSetParams = setAssignments.filter(s => s.includes('?')).length;
    const setParams = params.slice(0, numSetParams);
    const whereParams = params.slice(numSetParams);

    const updates = {};
    let pIdx = 0;
    for (const a of setAssignments) {
      const col = cleanIdentifier(a.split('=')[0]);
      if (a.includes('?')) {
        updates[col] = setParams[pIdx++];
      } else if (a.toLowerCase().includes('now()')) {
        updates[col] = new Date().toISOString();
      }
    }

    const wherePart = trimmed.slice(trimmed.toLowerCase().indexOf('where') + 5);
    let affected = 0;

    for (let i = 0; i < rowList.length; i++) {
      if (matchesWhere(rowList[i], wherePart, whereParams)) {
        rowList[i] = { ...rowList[i], ...updates, updated_at: new Date().toISOString() };
        affected++;
      }
    }

    return [{ affectedRows: affected }];
  }

  // 6. DELETE
  if (lower.startsWith('delete')) {
    const tblMatch = trimmed.match(/delete\s+from\s+([`a-zA-Z0-9_]+)/i);
    if (!tblMatch) return [{ affectedRows: 0 }];
    const tbl = cleanIdentifier(tblMatch[1]);
    if (!tables.has(tbl)) return [{ affectedRows: 0 }];

    const wherePart = trimmed.slice(trimmed.toLowerCase().indexOf('where') + 5);
    const initialLen = tables.get(tbl).length;
    const kept = tables.get(tbl).filter(r => !matchesWhere(r, wherePart, params));
    tables.set(tbl, kept);

    return [{ affectedRows: initialLen - kept.length }];
  }

  return [{ affectedRows: 0 }];
}

function filterRows(rows, whereClause, params) {
  return rows.filter(row => matchesCondition(row, whereClause, params));
}

function matchesWhere(row, whereClause, params) {
  return matchesCondition(row, whereClause, params);
}

function matchesCondition(row, clause, params) {
  if (clause.includes(' OR ')) {
    const orParts = clause.replace(/^\(|\)$/g, '').split(' OR ');
    return orParts.some(op => matchesCondition(row, op.trim(), params));
  }

  if (clause.includes(' AND ')) {
    const andParts = clause.replace(/^\(|\)$/g, '').split(' AND ');
    return andParts.every(ap => matchesCondition(row, ap.trim(), params));
  }

  const c = clause.trim();

  // JSON_CONTAINS
  const jsonContainsMatch = c.match(/json_contains\s*\(\s*[`a-zA-Z0-9_]+\s*,\s*json_quote\s*\(\s*\?\s*\)\s*\)/i);
  if (jsonContainsMatch) {
    const col = cleanIdentifier(c.match(/json_contains\s*\(\s*([`a-zA-Z0-9_]+)/i)[1]);
    const val = params.find(p => p !== undefined);
    const arr = typeof row[col] === 'string' ? JSON.parse(row[col] || '[]') : (row[col] || []);
    return Array.isArray(arr) && arr.some(item => String(item).toLowerCase().includes(String(val).toLowerCase()));
  }

  // IN (?, ?, ...)
  const inMatch = c.match(/([`a-zA-Z0-9_]+)\s+in\s*\(([^)]+)\)/i);
  if (inMatch) {
    const col = cleanIdentifier(inMatch[1]);
    const rowVal = String(row[col] || '').toLowerCase();
    return params.some(p => String(p).toLowerCase() === rowVal);
  }

  // LOWER(col) = ?
  const lowerEqMatch = c.match(/lower\s*\(\s*([`a-zA-Z0-9_]+)\s*\)\s*=\s*\?/i);
  if (lowerEqMatch) {
    const col = cleanIdentifier(lowerEqMatch[1]);
    const targetVal = String(params[0] || '').toLowerCase();
    return String(row[col] || '').toLowerCase() === targetVal;
  }

  // col LIKE ?
  const likeMatch = c.match(/([`a-zA-Z0-9_]+)\s+(?:i?like)\s+\?/i);
  if (likeMatch) {
    const col = cleanIdentifier(likeMatch[1]);
    const targetPattern = String(params[0] || '').replace(/%/g, '').toLowerCase();
    return String(row[col] || '').toLowerCase().includes(targetPattern);
  }

  // col = ?
  const eqMatch = c.match(/([`a-zA-Z0-9_]+)\s*=\s*\?/i);
  if (eqMatch) {
    const col = cleanIdentifier(eqMatch[1]);
    const targetVal = params.find(p => p !== undefined);
    return String(row[col] || '') === String(targetVal || '');
  }

  // col != ?
  const neqMatch = c.match(/([`a-zA-Z0-9_]+)\s*!=\s*\?/i);
  if (neqMatch) {
    const col = cleanIdentifier(neqMatch[1]);
    const targetVal = params.find(p => p !== undefined);
    return String(row[col] || '') !== String(targetVal || '');
  }

  // col = TRUE
  const trueMatch = c.match(/([`a-zA-Z0-9_]+)\s*=\s*true/i);
  if (trueMatch) {
    const col = cleanIdentifier(trueMatch[1]);
    return row[col] === true || row[col] === 1 || row[col] === '1';
  }

  return true;
}
