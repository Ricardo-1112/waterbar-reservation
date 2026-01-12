// backend/db.pg.js
import pg from "pg";
const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // Render Postgres 通常需要 SSL
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false,
});

function normalizeSql(sql) {
  let i = 0;
  return sql.replace(/\?/g, () => `$${++i}`);
}

export async function run(sql, params = []) {
  return pool.query(normalizeSql(sql), params);
}
export async function get(sql, params = []) {
  const r = await pool.query(normalizeSql(sql), params);
  return r.rows[0];
}
export async function all(sql, params = []) {
  const r = await pool.query(normalizeSql(sql), params);
  return r.rows;
}


export async function run(sql, params = []) {
  const res = await pool.query(sql, params);
  return res;
}

export async function get(sql, params = []) {
  const res = await pool.query(sql, params);
  return res.rows[0] || null;
}

export async function all(sql, params = []) {
  const res = await pool.query(sql, params);
  return res.rows;
}

export async function initDb() {
  // 表结构：把 AUTOINCREMENT 改成 SERIAL，SQLite 的 REAL 改 NUMERIC
  await run(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK (role IN ('user', 'barAdmin', 'studentAdmin'))
    );
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS products (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      price NUMERIC NOT NULL,
      img TEXT,
      hot INTEGER NOT NULL DEFAULT 0,
      max_per_day INTEGER NOT NULL DEFAULT 50,
      active INTEGER NOT NULL DEFAULT 1
    );
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS orders (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id),
      created_at TIMESTAMPTZ NOT NULL,
      cancelled INTEGER NOT NULL DEFAULT 0,
      pickup_status TEXT
    );
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS order_items (
      id SERIAL PRIMARY KEY,
      order_id INTEGER NOT NULL REFERENCES orders(id),
      product_id INTEGER NOT NULL REFERENCES products(id),
      product_name TEXT,
      unit_price NUMERIC,
      qty INTEGER NOT NULL
    );
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS reservation_days (
      day TEXT PRIMARY KEY,
      is_open INTEGER NOT NULL DEFAULT 0,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);

  // 默认管理员账号（跟你 sqlite 版本逻辑一致）
  const admin = await get(`SELECT * FROM users WHERE role='barAdmin' LIMIT 1`);
  if (!admin) {
    const bcryptModule = await import("bcrypt");
    const bcrypt = bcryptModule.default || bcryptModule;
    const hash = await bcrypt.hash("admin123", 10);
    await run(
      `INSERT INTO users (email, password_hash, role) VALUES ($1, $2, 'barAdmin')`,
      ["admin@example.com", hash]
    );
    console.log("创建默认水吧管理员账号：admin@example.com / admin123");
  }
}
