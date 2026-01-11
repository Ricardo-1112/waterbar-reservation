
import { useEffect, useState } from 'react';
import { api } from '../../api/client.js';

export default function ReportsPage() {
  const [daily, setDaily] = useState([]);
  const [weekly, setWeekly] = useState([]);
  const [monthly, setMonthly] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [d, w, m] = await Promise.all([
          api.adminReportDaily(),
          api.adminReportWeekly(),
          api.adminReportMonthly(),
        ]);
        setDaily(d);
        setWeekly(w);
        setMonthly(m);
      } catch (e) {
        alert('加载报表失败：' + e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleDownloadExcel = (day) => {
    api.downloadExcel(day);
  };

  if (loading) return <div>加载中...</div>;

  return (
    <div className="space-y-6">
      <section className="bg-white rounded-xl p-4 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-sm">最近 7 天每日统计</h2>
          <span className="text-xs text-slate-500">
            点击对应日期可导出 Excel
          </span>
        </div>
        {daily.length === 0 ? (
          <div className="text-sm text-slate-500">暂无数据</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="py-2 text-left">日期</th>
                <th className="text-left">订单数</th>
                <th className="text-left">总杯数</th>
                <th className="text-left">总金额</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {daily.map((r) => (
                <tr key={r.day} className="border-b">
                  <td className="py-2">{r.day}</td>
                  <td>{r.orders}</td>
                  <td>{r.cups}</td>
                  <td>¥{r.amount}</td>
                  <td>
                    <button
                      onClick={() => handleDownloadExcel(r.day)}
                      className="px-3 py-1 text-xs rounded bg-slate-900 text-white"
                    >
                      导出 Excel
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section className="bg-white rounded-xl p-4 shadow-sm">
        <h2 className="font-semibold mb-3 text-sm">最近 4 周统计</h2>
        {weekly.length === 0 ? (
          <div className="text-sm text-slate-500">暂无数据</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="py-2 text-left">周（YYYY-WW）</th>
                <th className="text-left">订单数</th>
                <th className="text-left">总杯数</th>
                <th className="text-left">总金额</th>
              </tr>
            </thead>
            <tbody>
              {weekly.map((r) => (
                <tr key={r.week} className="border-b">
                  <td className="py-2">{r.week}</td>
                  <td>{r.orders}</td>
                  <td>{r.cups}</td>
                  <td>¥{r.amount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section className="bg-white rounded-xl p-4 shadow-sm">
        <h2 className="font-semibold mb-3 text-sm">最近 6 个月统计</h2>
        {monthly.length === 0 ? (
          <div className="text-sm text-slate-500">暂无数据</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="py-2 text-left">月份（YYYY-MM）</th>
                <th className="text-left">订单数</th>
                <th className="text-left">总杯数</th>
                <th className="text-left">总金额</th>
              </tr>
            </thead>
            <tbody>
              {monthly.map((r) => (
                <tr key={r.month} className="border-b">
                  <td className="py-2">{r.month}</td>
                  <td>{r.orders}</td>
                  <td>{r.cups}</td>
                  <td>¥{r.amount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
