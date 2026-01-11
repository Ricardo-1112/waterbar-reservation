// migrate_order_snapshot.js
import { run, all } from './db.js';

async function main() {
  // 1) 给 order_items 补字段（如果已存在会报错，我们用 try/catch 忽略）
  const alters = [
    "ALTER TABLE order_items ADD COLUMN product_name TEXT",
    "ALTER TABLE order_items ADD COLUMN unit_price REAL",
    "ALTER TABLE order_items ADD COLUMN image_url TEXT",
  ];

  for (const sql of alters) {
    try {
      await run(sql);
      console.log('OK:', sql);
    } catch (e) {
      console.log('SKIP (maybe exists):', sql);
    }
  }

  // 2) 把旧数据回填一次（用当前 products 的值填充缺失快照）
  //    以后新订单会在下单时写入，不需要再跑
  try {
    await run(`
      UPDATE order_items
      SET
        product_name = COALESCE(product_name, (SELECT name FROM products WHERE products.id = order_items.product_id)),
        unit_price   = COALESCE(unit_price,   (SELECT price FROM products WHERE products.id = order_items.product_id)),
        image_url    = COALESCE(image_url,    (SELECT image_url FROM products WHERE products.id = order_items.product_id))
      WHERE product_id IS NOT NULL
    `);
    console.log('OK: backfill snapshot fields');
  } catch (e) {
    console.error('Backfill failed:', e);
  }

  // 3) 打印检查
  const sample = await all(`
    SELECT oi.id, oi.order_id, oi.product_id, oi.product_name, oi.unit_price
    FROM order_items oi
    ORDER BY oi.id DESC
    LIMIT 5
  `);
  console.log('Sample:', sample);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
