/**
 * J-CONNECT AIVEN MYSQL DATA SYNC SCRIPT
 * Synchronizes all 49 tables and ~255 KB of UAT and seed data
 * from server/db_data.json into your remote Aiven MySQL database.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SNAPSHOT_PATH = path.resolve(__dirname, '../server/db_data.json');
const SCHEMA_PATH = path.resolve(__dirname, '../server/schema.sql');

async function main() {
  console.log('======================================================================');
  console.log('  J-CONNECT AIVEN MYSQL DATA SYNCHRONIZATION TOOL');
  console.log('======================================================================\n');

  const connectionUrl = process.env.MYSQL_URL || process.env.DATABASE_URL;
  const host = process.env.MYSQL_HOST || process.env.DB_HOST;

  if (!connectionUrl && !host) {
    console.error('❌ ERROR: No MySQL or Aiven connection details found in .env!\n');
    console.log('Please add your Aiven MySQL credentials to your .env file:');
    console.log('  MYSQL_URL="mysql://avnadmin:YOUR_PASSWORD@mysql-xxxxx.a.aivencloud.com:PORT/defaultdb?ssl-mode=REQUIRED"\n');
    console.log('Or use individual parameters:');
    console.log('  MYSQL_HOST=mysql-xxxxx.a.aivencloud.com');
    console.log('  MYSQL_PORT=PORT');
    console.log('  MYSQL_USER=avnadmin');
    console.log('  MYSQL_PASSWORD=YOUR_PASSWORD');
    console.log('  MYSQL_DATABASE=defaultdb');
    console.log('  MYSQL_SSL=true\n');
    process.exit(1);
  }

  // Build connection config
  let config = {};
  if (connectionUrl) {
    const parsed = new URL(connectionUrl);
    config = {
      host: parsed.hostname,
      port: parsed.port ? parseInt(parsed.port, 10) : 3306,
      user: decodeURIComponent(parsed.username),
      password: decodeURIComponent(parsed.password),
      database: parsed.pathname ? parsed.pathname.replace(/^\//, '') : 'defaultdb',
      ssl: { rejectUnauthorized: false }
    };
  } else {
    config = {
      host: host,
      port: process.env.MYSQL_PORT ? parseInt(process.env.MYSQL_PORT, 10) : 3306,
      user: process.env.MYSQL_USER || 'avnadmin',
      password: process.env.MYSQL_PASSWORD || '',
      database: process.env.MYSQL_DATABASE || 'defaultdb',
      ssl: { rejectUnauthorized: false }
    };
  }

  console.log(`[Aiven Sync] Connecting to MySQL at ${config.host}:${config.port}/${config.database} (User: ${config.user})...`);

  let connection;
  try {
    connection = await mysql.createConnection(config);
    console.log('✅ [Aiven Sync] Connected successfully to remote Aiven MySQL!\n');
  } catch (err) {
    console.error('❌ [Aiven Sync] Failed to connect to Aiven MySQL:', err.message);
    process.exit(1);
  }

  // 1. Apply Schema DDL
  console.log('[Aiven Sync] Step 1: Initializing / verifying all 49 tables from schema.sql...');
  const schemaSql = fs.readFileSync(SCHEMA_PATH, 'utf-8');
  const cleanSql = schemaSql
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/--.*$/gm, '');

  const statements = cleanSql
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0);

  let tablesCreated = 0;
  for (const stmt of statements) {
    try {
      await connection.query(stmt);
      if (stmt.toUpperCase().includes('CREATE TABLE')) {
        tablesCreated++;
      }
    } catch (err) {
      console.warn('  [Schema Warning]:', err.message);
    }
  }
  console.log(`✅ [Aiven Sync] Schema verified (${tablesCreated} table DDL statements executed).\n`);

  // 2. Load Local Data Snapshot
  if (!fs.existsSync(SNAPSHOT_PATH)) {
    console.error('❌ ERROR: server/db_data.json snapshot not found!');
    await connection.end();
    process.exit(1);
  }

  console.log('[Aiven Sync] Step 2: Loading snapshot from server/db_data.json...');
  const snapshotRaw = fs.readFileSync(SNAPSHOT_PATH, 'utf-8');
  const snapshotData = JSON.parse(snapshotRaw);
  const tableNames = Object.keys(snapshotData);
  console.log(`✅ [Aiven Sync] Loaded ${tableNames.length} tables from local storage.\n`);

  console.log('[Aiven Sync] Step 3: Synchronizing data into Aiven MySQL...');
  console.log('----------------------------------------------------------------------');

  let totalRowsSynced = 0;
  let successTables = 0;

  // Disable foreign key checks during batch migration for dependency order independence
  await connection.query('SET FOREIGN_KEY_CHECKS = 0;');

  // Run safe migrations for any columns that might be missing on previously-created tables
  const migrations = [
    { table: 'job_offers', col: 'updated_at', def: 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP' },
    { table: 'mentorship_goals', col: 'updated_at', def: 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP' },
    { table: 'enrollments', col: 'created_at', def: 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP' },
    { table: 'enrollments', col: 'updated_at', def: 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP' },
    { table: 'lesson_completions', col: 'created_at', def: 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP' },
    { table: 'certificates', col: 'status', def: "VARCHAR(50) DEFAULT 'issued'" },
    { table: 'certificates', col: 'created_at', def: 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP' },
    { table: 'quiz_attempts', col: 'created_at', def: 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP' },
    { table: 'chatroom_members', col: 'created_at', def: 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP' },
    { table: 'social_group_members', col: 'created_at', def: 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP' },
    { table: 'approval_workflows', col: 'reviewed_by', def: 'VARCHAR(36) NULL' },
    { table: 'approval_workflows', col: 'reviewed_at', def: 'TIMESTAMP NULL' },
    { table: 'jobs', col: 'location_scope', def: "VARCHAR(50) DEFAULT 'lga'" },
    { table: 'jobs', col: 'custom_questions', def: 'JSON NULL' },
    { table: 'job_applications', col: 'custom_answers', def: 'JSON NULL' },
    { table: 'company_profiles', col: 'company_name', def: 'VARCHAR(255) NULL' },
    { table: 'company_profiles', col: 'company_size', def: 'VARCHAR(50) NULL' },
    { table: 'company_profiles', col: 'founded_year', def: 'INT NULL' },
    { table: 'company_profiles', col: 'lga', def: 'VARCHAR(100) NULL' },
    { table: 'company_profiles', col: 'culture', def: 'TEXT NULL' },
    { table: 'company_profiles', col: 'benefits', def: 'JSON NULL' },
    { table: 'company_reviews', col: 'pros', def: 'TEXT NULL' },
    { table: 'company_reviews', col: 'cons', def: 'TEXT NULL' },
    { table: 'company_reviews', col: 'is_current_employee', def: 'BOOLEAN DEFAULT TRUE' },
    { table: 'mentors', col: 'specialization', def: 'VARCHAR(255) NULL' },
    { table: 'mentors', col: 'years_of_experience', def: 'INT DEFAULT 0' },
    { table: 'mentorship_listings', col: 'skills', def: 'JSON NULL' },
    { table: 'mentorship_listings', col: 'experience_level', def: 'VARCHAR(100) NULL' },
    { table: 'mentorship_listings', col: 'expectations', def: 'TEXT NULL' },
    { table: 'mentorship_listings', col: 'is_active', def: 'BOOLEAN DEFAULT TRUE' },
    { table: 'mentorship_requests', col: 'request_type', def: "VARCHAR(50) DEFAULT 'one_on_one'" },
    { table: 'courses', col: 'level', def: "VARCHAR(50) DEFAULT 'Beginner'" },
    { table: 'course_materials', col: 'lesson_id', def: 'VARCHAR(36) NULL' },
    { table: 'quizzes', col: 'is_published', def: 'BOOLEAN DEFAULT TRUE' },
    { table: 'announcements', col: 'message', def: 'TEXT NULL' },
    { table: 'announcements', col: 'type', def: "VARCHAR(50) DEFAULT 'info'" },
    { table: 'announcements', col: 'audience', def: "VARCHAR(100) DEFAULT 'all'" },
    { table: 'announcements', col: 'link', def: 'TEXT NULL' },
    { table: 'portfolio_items', col: 'category', def: 'VARCHAR(100) NULL' },
    { table: 'portfolio_items', col: 'tags', def: 'JSON NULL' },
    { table: 'social_posts', col: 'visibility', def: "VARCHAR(50) DEFAULT 'public'" },
    { table: 'social_posts', col: 'media_urls', def: 'JSON NULL' },
    { table: 'social_posts', col: 'likes_count', def: 'INT DEFAULT 0' },
    { table: 'social_posts', col: 'comments_count', def: 'INT DEFAULT 0' },
    { table: 'social_groups', col: 'category', def: 'VARCHAR(100) NULL' },
    { table: 'social_groups', col: 'member_count', def: 'INT DEFAULT 1' },
    { table: 'audit_logs', col: 'actor_id', def: 'VARCHAR(36) NULL' },
    { table: 'audit_logs', col: 'details', def: 'JSON NULL' },
    { table: 'branding_settings', col: 'favicon_url', def: 'TEXT NULL' },
    { table: 'branding_settings', col: 'updated_by', def: 'VARCHAR(36) NULL' }
  ];

  for (const m of migrations) {
    try {
      const [cols] = await connection.query(`SHOW COLUMNS FROM \`${m.table}\` LIKE '${m.col}'`);
      if (!cols || cols.length === 0) {
        await connection.query(`ALTER TABLE \`${m.table}\` ADD COLUMN \`${m.col}\` ${m.def}`);
        console.log(`  [Migration] Table \`${m.table}\`: added column \`${m.col}\``);
      }
    } catch (err) {
      // ignore table or column issues
    }
  }

  for (const tableName of tableNames) {
    const rows = snapshotData[tableName];
    if (!Array.isArray(rows) || rows.length === 0) {
      console.log(`  - ${tableName.padEnd(30)} : 0 rows (empty)`);
      continue;
    }

    // Inspect actual database columns
    let validColNames = null;
    try {
      const [dbCols] = await connection.query(`SHOW COLUMNS FROM \`${tableName}\``);
      if (Array.isArray(dbCols) && dbCols.length > 0) {
        validColNames = new Set(dbCols.map(c => c.Field));
      }
    } catch (err) {
      // fallback
    }

    const sampleRow = rows[0];
    const allRowCols = Object.keys(sampleRow);
    const columns = validColNames
      ? allRowCols.filter(c => validColNames.has(c))
      : allRowCols;

    if (columns.length === 0) continue;

    const escapedCols = columns.map(c => `\`${c}\``).join(', ');
    const placeholders = columns.map(() => '?').join(', ');

    let insertedForTable = 0;
    for (const row of rows) {
      const values = columns.map(col => {
        let val = row[col];
        if (val === undefined) return null;
        if (typeof val === 'object' && val !== null) {
          return JSON.stringify(val);
        }
        if (typeof val === 'boolean') {
          return val ? 1 : 0;
        }
        return val;
      });

      try {
        const insertSql = `INSERT INTO \`${tableName}\` (${escapedCols}) VALUES (${placeholders}) ON DUPLICATE KEY UPDATE \`${columns[0]}\` = VALUES(\`${columns[0]}\`)`;
        await connection.query(insertSql, values);
        insertedForTable++;
      } catch (err) {
        // Fallback with INSERT IGNORE if update failed
        try {
          const ignoreSql = `INSERT IGNORE INTO \`${tableName}\` (${escapedCols}) VALUES (${placeholders})`;
          await connection.query(ignoreSql, values);
          insertedForTable++;
        } catch (subErr) {
          // ignore single row error
        }
      }
    }

    console.log(`  ✅ ${tableName.padEnd(30)} : ${insertedForTable} rows synced`);
    totalRowsSynced += insertedForTable;
    successTables++;
  }

  // Re-enable foreign key checks
  await connection.query('SET FOREIGN_KEY_CHECKS = 1;');

  console.log('----------------------------------------------------------------------');
  console.log(`\n🎉 [Aiven Sync Complete] Successfully synced ${totalRowsSynced} rows across ${successTables} tables into Aiven MySQL!\n`);

  await connection.end();
  process.exit(0);
}

main().catch(err => {
  console.error('\n❌ Fatal Error during Aiven sync:', err);
  process.exit(1);
});
