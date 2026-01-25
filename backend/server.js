
import express from 'express';
import session from 'express-session';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import dotenv from 'dotenv';
import bcrypt from 'bcrypt';
import ExcelJS from 'exceljs';
import { initDb, run, get, all } from './db_pg.js';
import { isNowWithinRange } from './utils.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;
const SESSION_SECRET = process.env.SESSION_SECRET || 'dev-secret';

const ALLOWED_ORIGINS = [
  'http://localhost:5173',
  'https://waterbar-reservation.vercel.app',
  /^https:\/\/.*\.shipsip\.cn$/,
  'https://shipsip.cn',
];

app.set('trust proxy', 1);

app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);

    if (ALLOWED_ORIGINS.includes(origin)) {
      return callback(null, true);
    }

    // 不要抛异常！直接拒绝即可
    return callback(null, false);
  },
  credentials: true,
  methods: ['GET','POST','PUT','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.options('*', cors({
  origin: function (origin, callback) { /* 你原来的逻辑 */ },
  credentials: true,
  methods: ['GET','POST','PUT','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization']
}));

app.use(express.json());
app.use(cookieParser());
app.use(
  session({
    name: 'waterbar.sid',
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    proxy:true,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',   // Render 是 https
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 天
    },
  })
);


function requireLogin(req, res, next) {
  if (!req.session.userId) {
    return res.status(401).json({ error: '未登录' });
  }
  next();
}

function requireRole(role) {
  return (req, res, next) => {
    if (!req.session.userId) return res.status(401).json({ error: '未登录' });
    if (req.session.role !== role)
      return res.status(403).json({ error: '无权限' });
    next();
  };
}

function isValidStudentEmail(email) {
  return /^00\d{4}@nkcswx\.cn$/.test(email);
}

async function getCurrentUser(req) {
  if (!req.session.userId) return null;
  const user = await get('SELECT id, email, role FROM users WHERE id = ?', [
    req.session.userId,
  ]);
  return user;
}

app.post('/api/register', async (req, res) => {
  const { email, password, role } = req.body;
   if (!isValidStudentEmail(email)) {
    return res.status(400).json({
      error: '用户名格式必须为 00XXXX@nkcswx.cn（XXXX 为4位数字）'
    });
  }
  
  const exist = await get('SELECT id FROM users WHERE email = ?', [email]);
  if (exist) {
    return res.status(400).json({ error: '该学号已注册，请直接登录' });
  }

  if (!email || !password) {
    return res.status(400).json({ error: '邮箱和密码必填' });
  }
  const userRole =
    role && ['user', 'barAdmin', 'studentAdmin'].includes(role)
      ? role
      : 'user';

  try {
    const hash = await bcrypt.hash(password, 10);
    await run(
      'INSERT INTO users (email, password_hash, role) VALUES (?, ?, ?)',
      [email, hash, userRole]
    );
    res.json({ success: true });
  } catch (e) {
    if (e.message.includes('UNIQUE')) {
      return res.status(400).json({ error: '邮箱已被注册' });
    }
    console.error(e);
    res.status(500).json({ error: '注册失败' });
  }
});

app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;

  // ① 先查用户
  const user = await get('SELECT * FROM users WHERE email = ?', [email]);
  if (!user) return res.status(400).json({ error: '账号或密码错误' });

  // ② 只有学生账号才校验格式
  if (user.role === 'user' && !isValidStudentEmail(email)) {
    return res.status(400).json({
      error: '学生用户名格式必须为 00XXXX@nkcswx.cn（XXXX为4位数字）'
    });
  }

  // ③ 校验密码
  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) return res.status(400).json({ error: '账号或密码错误' });

  // ④ 登录成功
  req.session.userId = user.id;
  req.session.role = user.role;
  res.json({ success: true });
});


app.get('/api/me', async (req, res) => {
  const user = await getCurrentUser(req);
  if (!user) return res.status(401).json({ error: '未登录' });
  res.json(user);
});

app.post('/api/logout', (req, res) => {
  req.session.destroy(() => {
    res.json({ success: true });
  });
});

app.get('/api/server-time', (req, res) => {
  res.json({ now: new Date().toISOString() });
});

// 商品列表接口：根据“今天未取消的订单(day=今天)”计算剩余数量
app.get('/api/products', async (req, res) => {
  try {
    const rows = await all(`
      SELECT
        p.id,
        p.name,
        p.price,
        p.img,
        p.hot,
        p.max_per_day,
        p.active,
        COALESCE(
          SUM(
            CASE
              WHEN o.cancelled = 0
               AND o.day = (now() AT TIME ZONE 'Asia/Shanghai')::date
              THEN COALESCE(oi.qty, 0)
              ELSE 0
            END
          ),
          0
        ) AS sold_today
      FROM products p
      LEFT JOIN order_items oi ON oi.product_id = p.id
      LEFT JOIN orders o ON oi.order_id = o.id
      WHERE p.active = 1
      GROUP BY p.id
      ORDER BY p.id
    `);

    const products = rows.map((r) => {
      const maxPerDay = Number(r.max_per_day) || 0;
      const soldToday = Number(r.sold_today) || 0;
      const stockToday = Math.max(maxPerDay - soldToday, 0);

      return {
        id: r.id,
        name: r.name,
        price: r.price,
        img: r.img,
        hot: !!r.hot,
        maxPerDay,
        stockToday,
      };
    });

    res.json(products);
  } catch (e) {
    console.error('GET /api/products failed:', e);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.post('/api/admin/product', requireRole('admin'), async (req, res) => {
  const { name, price, img, hot, maxPerDay } = req.body;
  if (!name || price == null) {
    return res.status(400).json({ error: '名称和价格必填' });
  }

  if (!img) {
  return res.status(400).json({ error: '请上传商品图片' });
  }
  
  await run(
    `
    INSERT INTO products (name, price, img, hot, max_per_day, active)
    VALUES (?, ?, ?, ?, ?, 1)
  `,
    [name, price, img || '', hot ? 1 : 0, maxPerDay || 50]
  );
  res.json({ success: true });
});

// 水吧管理员：重置学生密码（只允许重置 role='user' 的学生）
app.post(
  '/api/admin/users/reset-student-password',
  requireRole('admin'),
  async (req, res) => {
    const { email, newPassword } = req.body;

    if (!email || !newPassword) {
      return res.status(400).json({ error: 'email 和 newPassword 必填' });
    }

    // 只允许重置学生格式账号
    if (!isValidStudentEmail(email)) {
      return res
        .status(400)
        .json({ error: '只能重置学生账号：00XXXX@nkcswx.cn（XXXX为4位数字）' });
    }

    const user = await get('SELECT id, role FROM users WHERE email = ?', [email]);
    if (!user) return res.status(404).json({ error: '该学生账号不存在' });

    if (user.role !== 'user') {
      return res.status(403).json({ error: '只能重置学生用户（role=user）的密码' });
    }

    const hash = await bcrypt.hash(newPassword, 10);
    await run('UPDATE users SET password_hash = ? WHERE id = ?', [hash, user.id]);

    res.json({ success: true });
  }
);

app.put('/api/admin/products/:id', requireRole('admin'), async (req, res) => {
  const id = req.params.id;
  const { name, price, img, hot, maxPerDay, active } = req.body;

  const exist = await get(
    'SELECT id FROM products WHERE id = ?',
    [id]
  );
  if (!exist) {
    return res.status(404).json({ error: '商品不存在' });
  }

  await run(
    `
    UPDATE products
    SET name = ?, price = ?, img = ?, hot = ?, max_per_day = ?, active = ?
    WHERE id = ?
    `,
    [
      name,
      price,
      img || null,
      hot ? 1 : 0,
      maxPerDay,
      active ? 1 : 0,
      id,
    ]
  );

  const row = await get(
    'SELECT id, name, price, img, hot, max_per_day, active FROM products WHERE id = ?',
    [id]
  );

  res.json({
    id: row.id,
    name: row.name,
    price: row.price,
    img: row.img,
    hot: !!row.hot,
    maxPerDay: row.max_per_day,
    active: !!row.active,
  });
});



app.put('/api/admin/product/:id', requireRole('admin'), async (req, res) => {
  const { id } = req.params;
  const fields = [];
  const params = [];

  const allowed = ['name', 'price', 'img', 'hot', 'maxPerDay', 'active'];
  for (const key of allowed) {
    if (key in req.body) {
      if (key === 'maxPerDay') {
        fields.push('max_per_day = ?');
        params.push(req.body[key]);
      } else {
        fields.push(`${key === 'hot' ? 'hot' : key} = ?`);
        params.push(
          key === 'hot' || key === 'active' ? (req.body[key] ? 1 : 0) : req.body[key]
        );
      }
    }
  }

  if (!fields.length) {
    return res.status(400).json({ error: '无更新内容' });
  }

  params.push(id);
  await run(`UPDATE products SET ${fields.join(', ')} WHERE id = ?`, params);
  res.json({ success: true });
});

app.delete('/api/admin/product/:id', requireRole('admin'), async (req, res) => {
  const { id } = req.params;
  await run('DELETE FROM products WHERE id = ?', [id]);
  res.json({ success: true });
});

app.get('/api/me/today-count', requireLogin, async (req, res) => {
  const userId = req.session.userId;
  const row = await get(
    `
    SELECT COALESCE(SUM(oi.qty), 0) AS count
    FROM orders o
    JOIN order_items oi ON oi.order_id = o.id
    WHERE o.user_id = ?
      AND o.cancelled = 0
      AND (o.created_at AT TIME ZONE 'Asia/Shanghai')::date = (now() AT TIME ZONE 'Asia/Shanghai')::date
  `,
    [userId]
  );
  res.json({ count: row?.count || 0 });
});

app.post('/api/order', requireLogin, async (req, res) => {
  const userId = req.session.userId;
  const { items } = req.body;
  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: '购物车为空' });
  }

  if (!isNowWithinRange('08:00', '11:30')) {
    return res.status(400).json({ error: '已过预约时间（8:00–11:30）' });
  }

  // ✅ 今日是否开放预约（默认：否）
  const day = await getBJDay(0);
  const openRow = await get(`SELECT is_open FROM reservation_days WHERE day = ?`, [day]);
  const isOpenToday = openRow ? openRow.is_open === 1 : false;

  if (!isOpenToday) {
    return res.status(400).json({ error: '今日未开放预约，仅可浏览' });
  }


  const todayRow = await get(
    `
    SELECT COALESCE(SUM(oi.qty), 0) AS count
    FROM orders o
    JOIN order_items oi ON oi.order_id = o.id
    WHERE o.user_id = ?
      AND o.cancelled = 0
      AND (o.created_at AT TIME ZONE 'Asia/Shanghai')::date = (now() AT TIME ZONE 'Asia/Shanghai')::date
  `,
    [userId]
  );
  const already = todayRow?.count || 0;
  const newQty = items.reduce((sum, it) => sum + (it.qty || 0), 0);

  if (already + newQty > 2) {
    return res
      .status(400)
      .json({ error: '每日最多预约 2 杯，请检查数量' });
  }

  const productIds = items.map((i) => i.productId);
  const placeholders = productIds.map(() => '?').join(',');
    const rows = await all(
    `
    SELECT
      p.id,
      p.name,
      p.max_per_day,
      COALESCE(
        SUM(
          CASE
            WHEN o.cancelled = 0
             AND (o.created_at AT TIME ZONE 'Asia/Shanghai')::date = (now() AT TIME ZONE 'Asia/Shanghai')::date
            THEN oi.qty
            ELSE 0
          END
        ),
        0
      ) AS soldToday
    FROM products p
    LEFT JOIN order_items oi ON oi.product_id = p.id
    LEFT JOIN orders o ON oi.order_id = o.id
    WHERE p.id IN (${placeholders}) AND p.active = 1
    GROUP BY p.id
  `,
    productIds
  );


  if (rows.length !== productIds.length) {
    return res.status(400).json({ error: '包含无效商品' });
  }

  for (const it of items) {
    const p = rows.find((r) => r.id === it.productId);
    const remaining = p.max_per_day - p.soldToday;
    if (it.qty > remaining) {
      return res.status(400).json({
        error: `商品「${p.name}」库存不足，剩余 ${remaining} 杯`,
      });
    }
  }

  const now = new Date().toISOString();

  try {
    await run('BEGIN TRANSACTION');

    const orderResult = await run(
      'INSERT INTO orders (user_id, created_at, cancelled, pickup_status) VALUES (?, ?, 0, NULL)',
      [userId, now]
    );
    const orderId = orderResult.lastID;

    for (const it of items) {
  // ① 读取商品当前信息，作为“下单快照”
  const product = await get(
    'SELECT id, name, price FROM products WHERE id = ?',
    [it.productId]
  );

  if (!product) {
    throw new Error('商品不存在，无法创建订单');
  }

  // ② 写入 order_items（冻结商品信息）
  await run(
    `INSERT INTO order_items
      (order_id, product_id, qty, product_name, unit_price)
     VALUES (?, ?, ?, ?, ?)`,
    [
      orderId,
      product.id,
      it.qty,
      product.name,
      product.price,
    ]
  );
}


    await run('COMMIT');
    res.json({ success: true, orderId });
  } catch (e) {
    await run('ROLLBACK');
    console.error(e);
    res.status(500).json({ error: '创建订单失败' });
  }
});

app.get('/api/order/mine', requireLogin, async (req, res) => {
  const userId = req.session.userId;

  const orders = await all(
    `
    SELECT
      o.id,
      o.created_at,
      (o.created_at AT TIME ZONE 'Asia/Shanghai')::date AS bj_day,
      o.cancelled,
      o.pickup_status,
      SUM(oi.qty * oi.unit_price) AS totalPrice
    FROM orders o
    JOIN order_items oi ON oi.order_id = o.id
    WHERE o.user_id = ?
    GROUP BY o.id
    ORDER BY o.created_at DESC
  `,
    [userId]
  );

  const details = await all(
    `
    SELECT
      o.id AS orderId,
      oi.product_name AS productName,
      oi.qty,
      oi.unit_price
    FROM orders o
    JOIN order_items oi ON oi.order_id = o.id
    WHERE o.user_id = ?
  `,
    [userId]
  );

  const orderMap = {};
  for (const o of orders) {
  const ps = o.pickup_status || 'pending';
  let finalStatus = ps;

  if (!o.cancelled && ps !== 'picked') {
    if (o.bj_day !== todayBJ) finalStatus = 'missed';
    else if (nowLocked) finalStatus = 'missed';
  }
    orderMap[o.id] = {
      id: o.id,
      createdAt: o.created_at,
      cancelled: !!o.cancelled,
      pickupStatus: finalStatus,
      totalPrice: o.totalPrice,
      items: [],
    };
  }

  for (const d of details) {
    orderMap[d.orderId].items.push({
      productName: d.productName,
      qty: d.qty,
    });
  }

  res.json(Object.values(orderMap));
});

app.delete('/api/order/:id', requireLogin, async (req, res) => {
  const userId = req.session.userId;
  const { id } = req.params;

  // 1) 先查订单（必须是自己的）
  const order = await get(
    'SELECT * FROM orders WHERE id = ? AND user_id = ?',
    [id, userId]
  );
  if (!order) return res.status(404).json({ error: '订单不存在' });
  if (order.cancelled) return res.status(400).json({ error: '订单已取消' });

  // 2) 如果已取，也不能取消
  if (order.pickup_status === 'picked') {
    return res.status(400).json({ error: '已取订单不可取消' });
  }

  // 3) 计算订单的“北京时间日期”，并和“今天北京时间日期”比较
  const todayBJ = await getBJDay(0);
  const orderBJDay = await toBJDayFromISO(order.created_at);

  // 规则A：非当天订单一律不可取消（前几天的订单直接锁死）
  if (orderBJDay !== todayBJ) {
    return res.status(400).json({ error: '非当天订单不可取消（已锁定）' });
  }

  // 规则B：当天 11:30 后不可取消
  if (!isNowWithinRange('08:00', '11:30')) {
    return res.status(400).json({ error: '已过取消时间（11:30）' });
  }

  // 规则C：12:50 后若仍未取，锁定“未取”，不可取消（防止特殊情况/未来改逻辑）
  const locked = await isNowBJAtOrAfter('12:50');
  if (locked) {
    return res.status(400).json({ error: '订单已锁定为未取，不可取消' });
  }

  // 4) 允许取消
  await run('UPDATE orders SET cancelled = 1 WHERE id = ?', [id]);
  res.json({ success: true });
});

app.get('/api/admin/orders/today', requireRole('admin'), async (req, res) => {
  const rows = await all(
    `
    SELECT
      o.id,
      u.email AS userEmail,
      oi.product_name AS productName,
      oi.qty,
      o.created_at,
      o.pickup_status
    FROM orders o
    JOIN users u ON u.id = o.user_id
    JOIN order_items oi ON oi.order_id = o.id
    WHERE (o.created_at AT TIME ZONE 'Asia/Shanghai')::date = (now() AT TIME ZONE 'Asia/Shanghai')::date
      AND o.cancelled = 0
    ORDER BY o.created_at
  `
  );

  res.json(rows);
});

app.get('/api/time', (req, res) => {
  // 上海当前时间
  const now = new Date(
    new Date().toLocaleString('en-US', { timeZone: 'Asia/Shanghai' })
  );
  const minutes = now.getHours() * 60 + now.getMinutes();

  res.json({
    shanghaiMinutes: minutes,
    hh: now.getHours(),
    mm: now.getMinutes(),
    iso: now.toISOString(),
  });
});

app.get('/api/admin/report/daily', requireRole('admin'), async (req, res) => {
  const rows = await all(
    `
    SELECT
      (o.created_at AT TIME ZONE 'Asia/Shanghai')::date AS day,
      COUNT(DISTINCT o.id) AS orders,
      COALESCE(SUM(oi.qty), 0) AS cups,
      COALESCE(SUM(oi.qty * oi.unit_price), 0) AS amount
    FROM orders o
    JOIN order_items oi ON oi.order_id = o.id
    WHERE o.cancelled = 0
    GROUP BY (o.created_at AT TIME ZONE 'Asia/Shanghai')::date
    ORDER BY (o.created_at AT TIME ZONE 'Asia/Shanghai')::date DESC
    LIMIT 7
  `
  );

  res.json(rows);
});

app.get('/api/admin/report/weekly', requireRole('admin'), async (req, res) => {
  const rows = await all(
    `
    SELECT
      to_char(o.created_at AT TIME ZONE 'Asia/Shanghai', 'IYYY-IW') AS week,
      COUNT(DISTINCT o.id) AS orders,
      COALESCE(SUM(oi.qty), 0) AS cups,
      COALESCE(SUM(oi.qty * oi.unit_price), 0) AS amount
    FROM orders o
    JOIN order_items oi ON oi.order_id = o.id
    WHERE o.cancelled = 0
    GROUP BY 1
    ORDER BY 1 DESC
    LIMIT 4
  `
  );

  res.json(rows);
});

app.get('/api/admin/report/monthly', requireRole('admin'), async (req, res) => {
  const rows = await all(
    `
    SELECT
      to_char(o.created_at AT TIME ZONE 'Asia/Shanghai', 'IYYY-IW') AS month,
      COUNT(DISTINCT o.id) AS orders,
      COALESCE(SUM(oi.qty), 0) AS cups,
      COALESCE(SUM(oi.qty * oi.unit_price), 0) AS amount
    FROM orders o
    JOIN order_items oi ON oi.order_id = o.id
    WHERE o.cancelled = 0
    GROUP BY 1
    ORDER BY 1 DESC
    LIMIT 6
  `
  );

  res.json(rows);
});

app.get('/api/admin/report/excel', requireRole('admin'), async (req, res) => {
  let { date } = req.query;

  if (!date) {
  const todayRow = await get(`
    SELECT (now() AT TIME ZONE 'Asia/Shanghai')::date AS today
  `);
  date = todayRow.today;
}


  const rows = await all(
    `
    SELECT
      oi.product_name AS productName,
      COALESCE(SUM(oi.qty), 0) AS cups,
      COALESCE(SUM(oi.qty * oi.unit_price), 0) AS amount
    FROM orders o
    JOIN order_items oi ON oi.order_id = o.id
    WHERE o.cancelled = 0
      AND (o.created_at AT TIME ZONE 'Asia/Shanghai')::date = ?
    GROUP BY oi.product_name
    ORDER BY productName
  `,
    [date]
  );

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('DailyReport');

  sheet.columns = [
    { header: '日期', key: 'date', width: 15 },
    { header: '商品名称', key: 'productName', width: 25 },
    { header: '销量(杯)', key: 'cups', width: 12 },
    { header: '销售金额', key: 'amount', width: 15 },
  ];

  rows.forEach((r) => {
    sheet.addRow({
      date,
      productName: r.productName,
      cups: r.cups,
      amount: r.amount,
    });
  });

  const totalCups = rows.reduce((sum, r) => sum + r.cups, 0);
  const totalAmount = rows.reduce((sum, r) => sum + r.amount, 0);
  sheet.addRow({});
  sheet.addRow({
    date: '',
    productName: '合计',
    cups: totalCups,
    amount: totalAmount,
  });

  const fileName = `waterbar-report-${date}.xlsx`;
  res.setHeader(
    'Content-Type',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  );
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="${fileName}"`
  );

  await workbook.xlsx.write(res);
  res.end();
});

app.get('/api/student/orders/today', requireRole('student_admin'), async (req, res) => {
  const rows = await all(
    `
      SELECT
        o.id,
        u.email AS userEmail,
        oi.product_name AS productName,
        oi.qty,
        o.created_at,
        o.pickup_status
      FROM orders o
      JOIN users u ON u.id = o.user_id
      JOIN order_items oi ON oi.order_id = o.id
      WHERE (o.created_at AT TIME ZONE 'Asia/Shanghai')::date = (now() AT TIME ZONE 'Asia/Shanghai')::date
        AND o.cancelled = 0
      ORDER BY o.created_at
    `
  );
  res.json(rows);
});

// 学生管理员：标记是否已取
app.put('/api/student/order/:id/pickup-status', requireRole('student_admin'), async (req, res) => {
  const { id } = req.params;
  const { pickupStatus } = req.body; // 前端传 true / false 或 'picked' / 'pending'

  // 统一存成字符串：'picked' 或 'pending'
  const status =
    pickupStatus === true || pickupStatus === 'picked'
      ? 'picked'
      : 'pending';

  try {
    // ⚠️ 这里用的是真正数据库里的字段名，一般是 snake_case
    await run(
      'UPDATE orders SET pickup_status = ? WHERE id = ?',
      [status, id]
    );

    res.json({ success: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: '更新取餐状态失败' });
  }
});

async function getBJDay(offsetDays = 0) {
  const row = await get(
    `SELECT ((now() AT TIME ZONE 'Asia/Shanghai') + (? * INTERVAL '1 day'))::date AS d`,
    [offsetDays]
  );
  return row.d; // 例如 '2026-01-11'
}

async function toBJDayFromISO(iso) {
  const row = await get(
    `SELECT ((($1)::timestamptz AT TIME ZONE 'Asia/Shanghai')::date) AS d`,
    [iso]
  );
  return row.d;
}

// 判断当前北京时间是否 >= 某个时间（比如 '12:50'）
async function isNowBJAtOrAfter(hhmm) {
  const row = await get(
    `SELECT (to_char(now() AT TIME ZONE 'Asia/Shanghai','HH24:MI') >= $1) AS ok`,
    [hhmm]
  );
  return row.ok === true;
}


// 1) 学生端：获取“今天是否开放预约”（默认：否）
app.get('/api/reservation/today', requireLogin, async (req, res) => {
  const day = await getBJDay(0);
  const row = await get(`SELECT is_open FROM reservation_days WHERE day = ?`, [day]);
  const isOpen = row ? row.is_open === 1 : false; // ✅ 默认不开放
  res.json({ day, isOpen });
});

// 2) 水吧管理员：获取“明天是否开放预约”（默认：否）
app.get('/api/admin/reservation/tomorrow', requireRole('admin'), async (req, res) => {
  const day = await getBJDay(1);
  const row = await get(`SELECT is_open FROM reservation_days WHERE day = ?`, [day]);
  const isOpen = row ? row.is_open === 1 : false; // ✅ 默认不开放
  res.json({ day, isOpen });
});

// 3) 水吧管理员：设置“明天是否开放预约”
app.put('/api/admin/reservation/tomorrow', requireRole('admin'), async (req, res) => {
  const { isOpen } = req.body;

  // 允许 true/false 或 1/0
  const value = isOpen === true || isOpen === 1 ? 1 : 0;
  const day = await getBJDay(1);

  const exist = await get(`SELECT day FROM reservation_days WHERE day = ?`, [day]);
  if (exist) {
    await run(
    `UPDATE reservation_days SET is_open = $1, updated_at = NOW() AT TIME ZONE 'Asia/Shanghai' WHERE day = $2`,
      [value, day]
    );
  } else {
    await run(
      `INSERT INTO reservation_days (day, is_open, updated_at) VALUES ($1, $2, NOW() AT TIME ZONE 'Asia/Shanghai')`,
      [day, value]
    );
  }

  res.json({ success: true, day, isOpen: value === 1 });
});


initDb()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Backend running on http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error('DB 初始化失败', err);
    process.exit(1);
  });
