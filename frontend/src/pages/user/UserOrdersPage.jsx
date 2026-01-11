// frontend/src/pages/user/UserOrdersPage.jsx

import { useEffect, useState } from 'react';
import { api } from '../../api/client.js';
import { useServerTime, isOrderAllowed } from '../../hooks/useServerTime.js';
import { useNavigate } from 'react-router-dom';

export default function UserOrdersPage() {
  const [orders, setOrders] = useState([]);
  const serverTime = useServerTime(60000);
  const navigate = useNavigate();

  // ====== 这里是“是否允许取消”的控制开关 ======
  // ✅ 正式上线时，用这一行：按 8:00–11:30 限制取消
   const canModify = isOrderAllowed(serverTime);

  // 🧪 测试阶段，用这一行：不看时间，随时可以取消
  //const canModify = true;
  // ==========================================

  const loadOrders = async () => {
    const data = await api.myOrders();
    setOrders(data);
  };

  useEffect(() => {
    loadOrders();
  }, []);

  const handleCancel = async (id) => {
    if (!canModify) {
      alert('已过修改时间（11:30），无法取消订单');
      return;
    }
    if (!confirm('确定取消该订单？')) return;

    try {
      await api.cancelOrder(id);
      alert('订单已取消');

      // 关键：取消后回到商品页，商品列表会重新从后端获取
      // 首页组件挂载时会重新调用 /api/products，库存会按“未取消订单”重新计算
      navigate('/');
    } catch (e) {
      alert(e.message);
    }
  };

  return (
    <div className="bg-white rounded-xl p-4 shadow-sm">
      <h1 className="font-semibold mb-3 text-sm">我的订单</h1>
      {orders.length === 0 ? (
        <div className="text-sm text-slate-500">暂无订单</div>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b">
              <th className="py-2 text-left">下单时间</th>
              <th className="text-left">商品</th>
              <th className="text-left">总价</th>
              <th className="text-left">状态</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.id} className="border-b">
                <td className="py-2">
                  {o.createdAt
                    ? new Date(o.createdAt).toLocaleString('zh-CN', {
                        year: 'numeric',
                        month: '2-digit',
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                    : '-'}
                </td>
                <td>
                  {o.items
                    .map((it) => `${it.productName} x ${it.qty}`)
                    .join('，')}
                </td>
                <td>¥{o.totalPrice}</td>
                <td>
                  {o.cancelled
                    ? '已取消'
                    : o.pickupStatus === 'picked'
                    ? '已取'
                    : '未取'}
                </td>
                <td>
                  {!o.cancelled && !o.pickupStatus && (
                    <button
                      disabled={!canModify}
                      onClick={() => handleCancel(o.id)}
                      className={`px-2 py-1 rounded text-xs ${
                        canModify
                          ? 'bg-red-100 text-red-600'
                          : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                      }`}
                    >
                      取消
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
