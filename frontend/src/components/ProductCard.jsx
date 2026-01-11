// frontend/src/components/ProductCard.jsx

export default function ProductCard({
  product,
  canOrder,
  limitReached,
  onAddToCart,
}) {
  const remaining = product.stockToday;
  const soldOut = remaining <= 0;

  let badgeText = '';
  if (remaining > 0 && remaining <= 10) {
    badgeText = `仅剩 ${remaining} 杯`;
  }

  const disabled = !canOrder || soldOut || limitReached;

  return (
    <div className="bg-white rounded-xl shadow-sm p-4 flex flex-col">
      {product.img && (
        <img
          src={product.img}
          alt={product.name}
          className="w-full h-40 object-cover rounded-lg mb-3"
        />
      )}

      <div className="flex-1">
        <div className="flex items-center justify-between mb-1">
          <h3 className="font-semibold text-sm">{product.name}</h3>
          <span className="text-amber-600 font-semibold">¥{product.price}</span>
        </div>
        <div className="flex gap-2 text-xs mt-1">
          {product.hot && (
            <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-600">
              热卖
            </span>
          )}
          {badgeText && (
            <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
              {badgeText}
            </span>
          )}
          {soldOut && (
            <span className="px-2 py-0.5 rounded-full bg-slate-200 text-slate-500">
              今日售罄
            </span>
          )}
        </div>
      </div>

      <button
        disabled={disabled}
        onClick={onAddToCart}
        className={`mt-3 w-full py-2 rounded-lg text-sm font-medium ${
          disabled
            ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
            : 'bg-slate-900 text-white hover:opacity-90'
        }`}
      >
        {soldOut
          ? '今日已售罄'
          : limitReached
          ? '今日已达 2 杯上限'
          : canOrder
          ? '加入购物车'
          : '预约时间 8:00–11:30'}
      </button>
    </div>
  );
}
