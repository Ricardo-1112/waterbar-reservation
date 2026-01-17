import pg from "pg";
import bcrypt from "bcryptjs";

const { Client } = pg;

const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

const email = "admin@nkcswx.cn";
const newPassword = "adminnkcs";   // 你以后用来登录的真实密码

await client.connect();

// 现场生成 bcrypt hash
const newHash = await bcrypt.hash(newPassword, 10);

// 写入数据库
const r = await client.query(
  `UPDATE users 
   SET password_hash = $1 
   WHERE email = $2 
   RETURNING id, email, role`,
  [newHash, email]
);

console.log("✅ 已更新用户：", r.rows[0]);
console.log("新密码:", newPassword);
console.log("新 hash:", newHash);
console.log("bcrypt 校验:", await bcrypt.compare(newPassword, newHash));

await client.end();

