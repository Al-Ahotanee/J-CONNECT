import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

function buildConnectionConfig() {
  const connectionUrl = process.env.MYSQL_URL || process.env.DATABASE_URL;

  let config = {};

  if (connectionUrl) {
    try {
      const parsed = new URL(connectionUrl);
      config = {
        host: parsed.hostname,
        port: parsed.port ? parseInt(parsed.port, 10) : 3306,
        user: decodeURIComponent(parsed.username),
        password: decodeURIComponent(parsed.password),
        database: parsed.pathname ? parsed.pathname.replace(/^\//, '') : 'defaultdb',
      };
    } catch (e) {
      console.warn('[DB] Failed to parse connection URL, falling back to env vars:', e.message);
    }
  }

  config.host = config.host || process.env.MYSQL_HOST || process.env.DB_HOST || 'localhost';
  config.port = config.port || (process.env.MYSQL_PORT ? parseInt(process.env.MYSQL_PORT, 10) : (process.env.DB_PORT ? parseInt(process.env.DB_PORT, 10) : 3306));
  config.user = config.user || process.env.MYSQL_USER || process.env.DB_USER || 'root';
  config.password = config.password !== undefined ? config.password : (process.env.MYSQL_PASSWORD || process.env.DB_PASSWORD || '');
  config.database = config.database || process.env.MYSQL_DATABASE || process.env.DB_NAME || 'defaultdb';

  const useSsl = process.env.MYSQL_SSL === 'true' || 
                 process.env.DB_SSL === 'true' || 
                 (connectionUrl && connectionUrl.includes('ssl-mode')) ||
                 config.host.includes('aivencloud.com');

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

  config.waitForConnections = true;
  config.connectionLimit = parseInt(process.env.DB_POOL_LIMIT || '10', 10);
  config.queueLimit = 0;
  config.enableKeepAlive = true;
  config.keepAliveInitialDelay = 10000;

  return config;
}

const poolConfig = buildConnectionConfig();
export const pool = mysql.createPool(poolConfig);

export async function query(sql, params = []) {
  try {
    const [results] = await pool.query(sql, params);
    return results;
  } catch (err) {
    console.error(`[DB Error] SQL: ${sql.slice(0, 120)}... | Error:`, err.message);
    throw err;
  }
}

export async function execute(sql, params = []) {
  try {
    const [results] = await pool.execute(sql, params);
    return results;
  } catch (err) {
    console.error(`[DB Error] Execute: ${sql.slice(0, 120)}... | Error:`, err.message);
    throw err;
  }
}

export async function transaction(callback) {
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
  try {
    const [rows] = await pool.query('SELECT 1 AS connected');
    return rows && rows[0]?.connected === 1;
  } catch (err) {
    console.warn('[DB] Connection check failed:', err.message);
    return false;
  }
}
