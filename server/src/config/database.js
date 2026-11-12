import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

/**
 * database.js — Authoritative MySQL/MariaDB Connection Pool.
 * Conforms to PRD Section 3 & Prompt 7:
 * - Uses mysql2/promise for async/await transactions
 * - Default targets XAMPP on 127.0.0.1:3306
 * - Graceful connection checking and error reporting
 */

const dbConfig = {
  host: process.env.DB_HOST || '127.0.0.1',
  port: parseInt(process.env.DB_PORT, 10) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'lumina_eyewear_db',
  charset: 'utf8mb4',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  decimalNumbers: true, // Return DECIMAL as JS numbers
};

export const pool = mysql.createPool(dbConfig);

/**
 * Verifies database connectivity.
 * @returns {Promise<boolean>}
 */
export async function testConnection() {
  try {
    const connection = await pool.getConnection();
    const [rows] = await connection.query('SELECT 1 + 1 AS result');
    connection.release();
    return rows[0].result === 2;
  } catch (error) {
    console.error('[Database] Connection test failed:', error.message);
    return false;
  }
}
