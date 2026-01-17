import pg from "pg";
import bcrypt from "bcryptjs";

const { Client } = pg;

const email = "admin-student@nkcswx.cn";
const newPassword = "adminstudent";

const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

await client.connect();

// 生成新 hash
const newHash = await bcrypt.hash(newPassword, 10);

// 更新数据库
const r = await client.query(
  `UPDATE users
   SET password_hash = $1
   WHERE email = $2
   RETURNING id, email, role`,
  [newHash, email]
);

console.log("✅ 已更新用户：", r.rows[0]);
console.log("新密码：", newPassword);
console.log("新 hash:", newHash);

// 立刻验证（确保不会再出现 false）
const check = await client.query(
  `SELECT password_hash FROM users WHERE email=$1`,
  [email]
);
console.log("bcrypt 校验：", await bcrypt.compare(newPassword, check.rows[0].password_hash));

await client.end();

