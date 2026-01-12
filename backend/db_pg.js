// backend/db_pg.js
import pg from "pg";
const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  console.error("❌ DATABASE_URL is missing");
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // Render Postgres（尤其 external url）通常需要 SSL
  ssl: process.env.DATABASE_URL?.includes("render.com")
    ? { rejectUnauthorized: false }
    : false,
});

// 把 SQLite 的 ? 占位符自动转成 Postgres 的 $1 $2 ...
function normalizeSql(sql) {
  let i = 0;
  return sql.replace(/\?/g, () => `$${++i}`);
}

export async function run(sql, params = []) {
  const pgSql = normalizeSql(sql);
  const res = await pool.query(pgSql, params);
  return res.rowCount;
}

export async function get(sql, params = []) {
  const pgSql = normalizeSql(sql);
  const res = await pool.query(pgSql, params);
  return res.rows[0] ?? null;
}

export async function all(sql, params = []) {
  const pgSql = normalizeSql(sql);
  const res = await pool.query(pgSql, params);
  return res.rows;
}

/**
 * 初始化表结构（幂等：可重复执行）
 * 你现在服务启动时会调用 initDb()，所以这里必须存在且不报错。
 */
export async function initDb() {
  // 事务包起来更稳
  await pool.query("BEGIN");
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'user',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS products (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        price NUMERIC NOT NULL,
        img TEXT,
        hot INT NOT NULL DEFAULT 0,
        max_per_day INT NOT NULL DEFAULT 0,
        active INT NOT NULL DEFAULT 1,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS reservation_days (
        day DATE PRIMARY KEY,
        is_open INT NOT NULL DEFAULT 1,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS orders (
        id SERIAL PRIMARY KEY,
        user_id INT REFERENCES users(id),
        customer_name TEXT,
        phone TEXT,
        day DATE NOT NULL,
        slot TEXT,
        note TEXT,
        cancelled INT NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS order_items (
        id SERIAL PRIMARY KEY,
        order_id INT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
        product_id INT,
        product_name TEXT,
        qty INT NOT NULL,
        unit_price NUMERIC NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    // 常用索引（可选，但推荐）
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_orders_day ON orders(day);`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);`);

    await pool.query("COMMIT");
  } catch (e) {
    await pool.query("ROLLBACK");
    throw e;
  }
}

export { pool };


