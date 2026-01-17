import pg from "pg";
import bcrypt from "bcryptjs";

const { Client } = pg;

const c = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

await c.connect();

const email = "admin@nkcswx.cn";
const r = await c.query(
  "SELECT email, password_hash FROM users WHERE email=$1",
  [email]
);

const hash = r.rows?.[0]?.password_hash;
console.log("db email:", r.rows?.[0]?.email);
console.log("db hash :", hash);
console.log("bcrypt compare(adminnkcs):", await bcrypt.compare("adminnkcs", hash));

await c.end();

