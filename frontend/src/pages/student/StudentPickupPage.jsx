
import { useEffect, useState } from 'react';
import { api } from '../../api/client.js';

export default function StudentPickupPage() {
  const [orders, setOrders] = useState([]);

  const load = async () => {
    const data = await api.studentTodayOrders();
    setOrders(data);
  };

  useEffect(() => {
    load();
  }, []);

  const markPicked = async (o) => {
    if (o.pickupStatus) return;
    await api.studentPickupStatus(o.id, true);
    await load();
  };

  return (
    <div className="bg-white rounded-xl p-4 shadow-sm">
      <h1 className="font-semibold mb-3 text-sm">今日取餐核对</h1>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b">
            <th className="py-2 text-left">用户邮箱</th>
            <th className="text-left">商品</th>
            <th className="text-left">数量</th>
            <th className="text-left">下单时间</th>
            <th className="text-left">是否取单</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {orders.map((o) => (
            <tr key={`${o.id}-${o.product_name}`} className="border-b">
              <td className="py-2">{o.email}</td>
              <td>{o.product_name}</td>
              <td>{o.qty}</td>
              <td>
                {new Date(o.created_at).toLocaleTimeString('zh-CN', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </td>
              <td>{o.pickupStatus ? '✔ 已取' : '未取'}</td>
              <td>
                {!o.pickupStatus && (
                  <button
                    onClick={() => markPicked(o)}
                    className="px-3 py-1 text-xs rounded bg-emerald-100 text-emerald-700"
                  >
                    标记已取
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
