
import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

sqlite3.verbose();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.join(__dirname, 'waterbar.sqlite');
export const db = new sqlite3.Database(dbPath);

export function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) return reject(err);
      resolve(this);
    });
  });
}

export function get(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) return reject(err);
      resolve(row);
    });
  });
}

export function all(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) return reject(err);
      resolve(rows);
    });
  });
}

export async function initDb() {
  await run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK (role IN ('user', 'barAdmin', 'studentAdmin'))
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      price REAL NOT NULL,
      img TEXT,
      hot INTEGER NOT NULL DEFAULT 0,
      max_per_day INTEGER NOT NULL DEFAULT 50,
      active INTEGER NOT NULL DEFAULT 1
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      created_at TEXT NOT NULL,
      cancelled INTEGER NOT NULL DEFAULT 0,
      pickup_status TEXT,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS order_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL,
      product_id INTEGER NOT NULL,
      qty INTEGER NOT NULL,
      FOREIGN KEY (order_id) REFERENCES orders(id),
      FOREIGN KEY (product_id) REFERENCES products(id)
    )
  `);

  // 预约开放日表（按北京时间日期）
  await db.exec(`
    CREATE TABLE IF NOT EXISTS reservation_days (
      day TEXT PRIMARY KEY,            -- 'YYYY-MM-DD'（北京时间）
      is_open INTEGER NOT NULL DEFAULT 0,  -- 默认：不开放
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  const bcryptModule = (await import('bcrypt'));
  const bcrypt = bcryptModule.default || bcryptModule;
  const admin = await get(`SELECT * FROM users WHERE role='barAdmin' LIMIT 1`);
  if (!admin) {
    const hash = await bcrypt.hash('admin123', 10);
    await run(
      `INSERT INTO users (email, password_hash, role) VALUES (?, ?, 'barAdmin')`,
      ['admin@example.com', hash]
    );
    console.log('创建默认水吧管理员账号：admin@example.com / admin123');
  }
}
