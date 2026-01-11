
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function Navbar() {
  const { user, logout } = useAuth();

  return (
    <header className="bg-white shadow-sm">
      <nav className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
        <Link to="/" className="font-semibold text-lg">
          水吧预约系统
        </Link>
        <div className="flex items-center gap-4 text-sm">
          {user?.role === 'user' && (
            <>
              <Link to="/">商品</Link>
              <Link to="/orders">我的订单</Link>
            </>
          )}
          {user?.role === 'barAdmin' && (
            <>
              <Link to="/admin">水吧后台</Link>
              <Link to="/admin/orders">订单管理</Link> 
              <Link to="/admin/reports">统计报表</Link>
            </>
          )}
          {user?.role === 'studentAdmin' && <Link to="/student/pickup">取餐核对</Link>}

          {user ? (
            <>
              <span className="text-slate-500">{user.email}</span>
              <button
                onClick={logout}
                className="px-3 py-1 rounded bg-slate-900 text-white text-xs"
              >
                退出
              </button>
            </>
          ) : (
            <>
              <Link to="/login">登录</Link>
              <Link to="/register">注册</Link>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}
