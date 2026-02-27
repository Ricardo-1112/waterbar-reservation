// frontend/src/pages/user/UserProductsPage.jsx

import { useEffect, useState } from 'react';
import { api } from '../../api/client.js';
import ProductCard from '../../components/ProductCard.jsx';


function useServerTime(intervalMs = 60000) {
  const [serverTime, setServerTime] = useState(null);

  useEffect(() => {
    let timer;

    const tick = async () => {
      try {
        const t = await api.getTime();
        setServerTime(t);
      } catch (e) {
        console.error('useServerTime /api/time failed:', e);
      }
    };

    tick();
    timer = setInterval(tick, intervalMs);

    return () => clearInterval(timer);
  }, [intervalMs]);

  return serverTime;
}

function isOrderAllowed(serverTime) {
  if (!serverTime || typeof serverTime.shanghaiMinutes !== 'number') return false;

  const now = serverTime.shanghaiMinutes;
  const start = 8 * 60;       // 08:00
  const end = 11 * 60 + 30;   // 11:30

  return now >= start && now < end;
}

function getShanghaiMinutesNow() {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Shanghai',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(new Date());

  const hh = Number(parts.find(p => p.type === 'hour')?.value ?? 0);
  const mm = Number(parts.find(p => p.type === 'minute')?.value ?? 0);

  return hh * 60 + mm;
}

function canOrderNowShanghai() {
  const now = getShanghaiMinutesNow();

  const start = 8 * 60;        // 08:00
  const end = 11 * 60 + 30;    // 11:30

  return now >= start && now < end;
}

export default function UserProductsPage() {
  const [products, setProducts] = useState([]);
  const [todayCount, setTodayCount] = useState(0); // 今天已经“下单”的杯数（后台算的）
  const [cart, setCart] = useState({}); // 购物车：{ productId: { product, qty } }

  const serverTime = useServerTime(60000);
  const canOrderByTime = isOrderAllowed(serverTime);   
  
  const canOrder = canOrderByTime;
  console.log("serverTime=", serverTime);
  console.log("shanghaiMinutes=", serverTime?.shanghaiMinutes);
  console.log("canOrderByTime=", canOrderByTime);


  // 初始化加载：商品列表 + 今天已下单杯数
  useEffect(() => {
  (async () => {
    try {
      const [prods, countInfo, openInfo] = await Promise.all([
        api.getProducts(),
        api.getTodayCount(),
        api.reservationToday(),   
      ]);

      setProducts(prods);
      setTodayCount(countInfo.count || 0);
      setIsOpenToday(!!openInfo?.isOpen);   
    } catch (e) {
      console.error(e);
      setIsOpenToday(false); 
    }
  })();
}, []);


  // 购物车里当前“选”的总杯数
  const totalQtyInCart = Object.values(cart).reduce(
    (sum, item) => sum + item.qty,
    0
  );

  // 总使用杯数 = 已下单 + 购物车正在选的
  const totalUsed = todayCount + totalQtyInCart;
  const limitReached = totalUsed >= 2; // 达到 2 杯后，所有商品购买按钮禁用

  // 往购物车里加一杯（点商品卡片上的“加入购物车”）
  const addToCart = (product) => {
    setCart((prev) => {
      // 先算一下之前已经选了多少杯
      const totalInPrev = Object.values(prev).reduce(
        (sum, item) => sum + item.qty,
        0
      );
      // 如果已经达到 2 杯，就不再增加
      if (todayCount + totalInPrev >= 2) {
        return prev;
      }

      const currentQty = prev[product.id]?.qty || 0;
      return {
        ...prev,
        [product.id]: { product, qty: currentQty + 1 },
      };
    });
  };

  // 购物车里的 + 按钮
  const incrementItem = (productId) => {
    setCart((prev) => {
      const totalInPrev = Object.values(prev).reduce(
        (sum, item) => sum + item.qty,
        0
      );
      if (todayCount + totalInPrev >= 2) {
        return prev;
      }
      const item = prev[productId];
      if (!item) return prev;
      return {
        ...prev,
        [productId]: { ...item, qty: item.qty + 1 },
      };
    });
  };

  // 购物车里的 - 按钮
  const decrementItem = (productId) => {
    setCart((prev) => {
      const item = prev[productId];
      if (!item) return prev;

      // 减到 0 就把这个商品从购物车里删掉
      if (item.qty <= 1) {
        const copy = { ...prev };
        delete copy[productId];
        return copy;
      }

      return {
        ...prev,
        [productId]: { ...item, qty: item.qty - 1 },
      };
    });
  };

  // 提交订单
  const handleSubmitOrder = async () => {
    if (totalQtyInCart === 0) return;

    if (!serverTime) {
      alert('正在同步服务器时间，请稍等 1-2 秒再试');
      return;
    }

    const now = serverTime.shanghaiMinutes;

    if (!(now >= 8 * 60 && now < 11 * 60 + 30)) {
      if (now < 8 * 60) alert('未到预约时间（8:00-11:30）');
      else alert('已过预约时间（8:00-11:30）');
      return;
    }

    const items = Object.values(cart).map((item) => ({
      productId: item.product.id,
      qty: item.qty,
    }));

    try {
      await api.createOrder({ items });
      alert('下单成功！取餐时间 12:15–12:50');
      setCart({});
      const countInfo = await api.getTodayCount();
      setTodayCount(countInfo.count || 0);
      const prods = await api.getProducts();
      setProducts(prods);
    } catch (e) {
      alert(e.message);
    }
  };

  return (
    <div className="space-y-4">
      {/* {pickupPhase && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 text-sm px-4 py-2 rounded-lg">
          你有未取的订单，请于 12:50 前到高中部小卖部取餐。
        </div>
      )} */}

      <div className="bg-white rounded-xl p-4 shadow-sm flex items-center justify-between text-sm">
        <div>
          <div className="font-semibold">预约时间：每日 8:00–11:30</div>
          <div className="text-slate-500">
            固定取餐时间：<span className="font-medium">12:15–12:50</span>
          </div>
        </div>
        <div className="text-center text-sm font-medium text-amber-600 bg-amber-50 px-3 py-2 rounded-lg ml-0 mr-6">
          预定后若未前来取货，手环将自动扣费
        </div>

        <div className="text-right text-sm">
          <div>今日已下单：{todayCount} 杯</div>
          <div>本次选择：{totalQtyInCart} 杯</div>
          <div className="mt-1">
            总计：{todayCount + totalQtyInCart} / 2 杯
          </div>
          {limitReached && (
            <div className="text-red-500 mt-1 text-xs">
              已达到 2 杯上限，无法继续选择
            </div>
          )}
        </div>
      </div>

      {/* 商品列表 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {products.map((p) => (
          <ProductCard
            key={p.id}
            product={p}
            canOrder={canOrder}
            limitReached={limitReached}
            onAddToCart={() => addToCart(p)}
          />
        ))}
      </div>

      {/* 购物车区域 */}
      <div className="bg-white rounded-xl p-4 shadow-sm mt-4">
        <h2 className="font-semibold mb-2 text-sm">购物车</h2>
        {totalQtyInCart === 0 ? (
          <div className="text-sm text-slate-500">
            购物车为空，点击上方商品的“加入购物车”试试～
          </div>
        ) : (
          <>
            <ul className="text-sm space-y-2">
              {Object.values(cart).map((item) => (
                <li
                  key={item.product.id}
                  className="flex justify-between items-center"
                >
                  <div>
                    <div>{item.product.name}</div>
                    <div className="text-xs text-slate-500">
                      单价：¥{item.product.price}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => decrementItem(item.product.id)}
                      className="w-7 h-7 rounded-full border flex items-center justify-center text-base"
                    >
                      –
                    </button>
                    <span className="w-6 text-center">{item.qty}</span>
                    <button
                      onClick={() => incrementItem(item.product.id)}
                      disabled={limitReached}
                      className={`w-7 h-7 rounded-full border flex items-center justify-center text-base ${
                        limitReached
                          ? 'text-slate-400 border-slate-200 cursor-not-allowed'
                          : ''
                      }`}
                    >
                      +
                    </button>
                  </div>
                </li>
              ))}
            </ul>

            <div className="flex justify-between items-center mt-3 text-sm">
              <span className="font-medium">
                本次共选择：{totalQtyInCart} 杯（含今日已下单{' '}
                {todayCount} 杯）
              </span>
              <button
                onClick={handleSubmitOrder}
                disabled={!canOrder || totalQtyInCart === 0}
                className={`px-4 py-2 rounded-lg text-sm font-medium ${
                  !canOrder || totalQtyInCart === 0
                    ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                    : 'bg-slate-900 text-white'
                }`}
              >
                提交订单
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
