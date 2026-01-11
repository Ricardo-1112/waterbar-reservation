// frontend/src/pages/admin/AdminOrdersPage.jsx

import { useEffect, useState } from 'react';
import { api } from '../../api/client.js';

export default function StudentOrdersPage() {
  const markPicked = async (orderId) => {
  if (!window.confirm('确认该订单已取餐？')) return;

  try {
    await api.studentPickupStatus(orderId, true);
    await loadData(); // 重新拉取订单，保证同步
  } catch (e) {
    alert(e.message);
  }
};

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await api.studentTodayOrders();

      let flat = [];

      if (Array.isArray(data) && data.length > 0) {
        if (data[0].items) {
          // 情况一：每个订单下面有 items 数组
          data.forEach((order) => {
            const created =
              order.createdAt ||
              order.created_at ||
              order.orderTime ||
              order.order_time ||
              order.time;

            order.items.forEach((it) => {
              flat.push({
                id: `${order.id}-${it.productName || it.name}`,
                userEmail: order.userEmail || order.email || '未知',
                productName: it.productName || it.name,
                qty: it.qty,
                createdAt: created || null,
                pickupStatus: order.pickupStatus || 'pending',
              });
            });
          });
        } else {
          // 情况二：后端已经是平铺好的
          flat = data.map((row, idx) => {
            const created =
              row.createdAt ||
              row.created_at ||
              row.orderTime ||
              row.order_time ||
              row.time;

            return {
              id: row.id ?? idx,
              userEmail: row.userEmail || row.email || '未知',
              productName: row.productName || row.name,
              qty: row.qty || row.quantity || 0,
              createdAt: created || null,
              pickupStatus: row.pickupStatus || 'pending',
            };
          });
        }
      }

      flat.sort((a, b) => {
        if (!a.createdAt && !b.createdAt) return 0;
        if (!a.createdAt) return 1;
        if (!b.createdAt) return -1;
        return new Date(b.createdAt) - new Date(a.createdAt);
      });

      setRows(flat);
    } catch (e) {
      console.error(e);
      alert(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // 每 10 秒自动刷新一次
    const timer = setInterval(loadData, 10000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="bg-white rounded-xl p-4 shadow-sm">
      <div className="flex justify-between items-center mb-3">
        <h1 className="font-semibold text-sm">今日订单（实时）</h1>
        <button
          onClick={loadData}
          className="px-3 py-1 rounded bg-slate-900 text-white text-xs"
        >
          手动刷新
        </button>
      </div>

      {loading && rows.length === 0 ? (
        <div className="text-sm text-slate-500">加载中…</div>
      ) : rows.length === 0 ? (
        <div className="text-sm text-slate-500">今日暂无订单</div>
      ) : (
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b">
              <th className="py-2 text-left">用户（邮箱）</th>
              <th className="text-left">商品名称</th>
              <th className="text-left">数量</th>
              <th className="text-left">下单时间</th>
              <th className="text-left">是否已取</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-b">
                <td className="py-2">{r.userEmail}</td>
                <td>{r.productName}</td>
                <td>{r.qty}</td>
                <td>
                  {r.createdAt
                    ? new Date(r.createdAt).toLocaleTimeString('zh-CN', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                    : '-'}
                </td>
                <td>
                  {r.pickupStatus === 'picked' ? (
                    <span className="text-emerald-600 font-semibold">✔ 已取</span>
                  ) : (
                    <button
                      onClick={() => markPicked(r.id)}
                      className="px-2 py-1 text-xs rounded bg-emerald-500 text-white"
                    >
                      标记已取
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
