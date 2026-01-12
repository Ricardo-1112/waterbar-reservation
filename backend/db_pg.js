// backend/db_pg.js
import pg from "pg";
const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // Render Postgres 一般需要 SSL（尤其是 External URL）
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

export { pool };
