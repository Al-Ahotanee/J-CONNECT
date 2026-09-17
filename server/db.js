import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

function parseMysqlUrl(urlStr) {
  if (!urlStr || typeof urlStr !== 'string') return null;
  const clean = urlStr.trim().replace(/^['"]|['"]$/g, '');
  
  try {
    const parsed = new URL(clean);
    return {
      host: parsed.hostname,
      port: parsed.port ? parseInt(parsed.port, 10) : 3306,
      user: decodeURIComponent(parsed.username || 'avnadmin'),
      password: decodeURIComponent(parsed.password || ''),
      database: parsed.pathname ? parsed.pathname.replace(/^\//, '').split('?')[0] : 'defaultdb',
    };
  } catch (e) {
    // Regex fallback for passwords containing unencoded special characters
    const match = clean.match(/^mysql(?:2)?:\/\/([^:]+):(.+)@([^:/]+)(?::(\d+))?\/(.+)$/);
    if (match) {
      const [, user, password, host, port, dbAndQuery] = match;
      const database = (dbAndQuery || 'defaultdb').split('?')[0];
      return {
        host,
        port: port ? parseInt(port, 10) : 3306,
        user: decodeURIComponent(user),
        password: decodeURIComponent(password),
        database,
      };
    }
    console.warn('[DB] Failed to parse connection URL:', e.message);
    return null;
  }
}

function buildConnectionConfig() {
  const rawUrl = process.env.MYSQL_URL || 
                 process.env.DATABASE_URL || 
                 process.env.AIVEN_URL || 
                 process.env.AIVEN_MYSQL_URL ||
                 process.env.MYSQL_URI ||
                 process.env.MYSQL_CONNECTION_STRING;

  const parsedConfig = parseMysqlUrl(rawUrl) || {};

  const host = parsedConfig.host || process.env.MYSQL_HOST || process.env.DB_HOST || 'localhost';
  const port = parsedConfig.port || (process.env.MYSQL_PORT ? parseInt(process.env.MYSQL_PORT, 10) : (process.env.DB_PORT ? parseInt(process.env.DB_PORT, 10) : 3306));
  const user = parsedConfig.user || process.env.MYSQL_USER || process.env.DB_USER || 'root';
  const password = parsedConfig.password !== undefined ? parsedConfig.password : (process.env.MYSQL_PASSWORD || process.env.DB_PASSWORD || '');
  const database = parsedConfig.database || process.env.MYSQL_DATABASE || process.env.DB_NAME || 'defaultdb';

  const isRemote = host !== 'localhost' && host !== '127.0.0.1';
  const isAiven = host.includes('aivencloud.com');
  const useSsl = process.env.MYSQL_SSL === 'true' || 
                 process.env.DB_SSL === 'true' || 
                 (rawUrl && rawUrl.includes('ssl')) ||
                 isAiven ||
                 isRemote;

  const config = {
    host,
    port,
    user,
    password,
    database,
    waitForConnections: true,
    connectionLimit: parseInt(process.env.DB_POOL_LIMIT || '10', 10),
    queueLimit: 0,
    enableKeepAlive: true,
    keepAliveInitialDelay: 10000,
    connectTimeout: 20000,
  };

  if (useSsl) {
    config.ssl = {
      rejectUnauthorized: process.env.MYSQL_REJECT_UNAUTHORIZED === 'true',
    };
    if (process.env.MYSQL_CA_CERT) {
      config.ssl.ca = process.env.MYSQL_CA_CERT;
    } else if (fs.existsSync(path.join(__dirname, 'ca.pem'))) {
      config.ssl.ca = fs.readFileSync(path.join(__dirname, 'ca.pem'), 'utf-8');
    }
  }

  return config;
}

import { executeInMemory } from './in-memory-db.js';

let useInMemory = false;
let checkedAvailability = false;

const poolConfig = buildConnectionConfig();
export const pool = mysql.createPool(poolConfig);

export function isUsingInMemory() {
  return useInMemory;
}

async function ensureConnection() {
  if (checkedAvailability) return !useInMemory;
  checkedAvailability = true;

  const config = poolConfig;
  const isLocalDefault = (config.host === 'localhost' || config.host === '127.0.0.1') && 
                         !process.env.MYSQL_URL && !process.env.DATABASE_URL && !process.env.MYSQL_HOST;

  if (isLocalDefault) {
    useInMemory = true;
    console.log('[DB] No remote database configured. Resilient in-memory database active.');
    return false;
  }

  console.log(`[DB Connecting] Connecting to MySQL at ${config.user}@${config.host}:${config.port}/${config.database} (SSL: ${!!config.ssl})...`);

  try {
    const [rows] = await pool.query('SELECT 1 AS connected');
    useInMemory = !(rows && rows[0]?.connected === 1);
    if (!useInMemory) {
      console.log(`✅ [DB Connected] Successfully connected to remote MySQL at ${config.host}:${config.port}/${config.database}`);
    } else {
      console.warn('[DB Warning] Unexpected query response from remote MySQL. Falling back to in-memory.');
    }
  } catch (err) {
    useInMemory = true;
    console.error(`❌ [DB Connection Failed] Target: ${config.host}:${config.port} | User: ${config.user} | Error: ${err.message}`);
    if (err.code) console.error(`   Error Code: ${err.code}`);
    console.log('[DB Fallback] Resilient in-memory database active with local snapshot data.');
  }
  return !useInMemory;
}

export async function query(sql, params = []) {
  await ensureConnection();
  if (useInMemory) {
    return executeInMemory(sql, params);
  }
  try {
    const [results] = await pool.query(sql, params);
    return results;
  } catch (err) {
    if (err.code === 'ECONNREFUSED' || err.code === 'ENOTFOUND' || err.code === 'ETIMEDOUT') {
      useInMemory = true;
      return executeInMemory(sql, params);
    }
    console.error(`[DB Error] SQL: ${sql.slice(0, 120)}... | Error:`, err.message);
    throw err;
  }
}

export async function execute(sql, params = []) {
  await ensureConnection();
  if (useInMemory) {
    return executeInMemory(sql, params);
  }
  try {
    const [results] = await pool.execute(sql, params);
    return results;
  } catch (err) {
    if (err.code === 'ECONNREFUSED' || err.code === 'ENOTFOUND' || err.code === 'ETIMEDOUT') {
      useInMemory = true;
      return executeInMemory(sql, params);
    }
    console.error(`[DB Error] Execute: ${sql.slice(0, 120)}... | Error:`, err.message);
    throw err;
  }
}

export async function transaction(callback) {
  await ensureConnection();
  if (useInMemory) {
    return callback({
      query: (sql, params) => executeInMemory(sql, params),
      execute: (sql, params) => executeInMemory(sql, params),
    });
  }
  const connection = await pool.getConnection();
  await connection.beginTransaction();
  try {
    const result = await callback(connection);
    await connection.commit();
    return result;
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
}

export async function checkConnection() {
  await ensureConnection();
  return true;
}
