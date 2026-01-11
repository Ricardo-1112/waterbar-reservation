
import { useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';

export default function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    try {
      await login(email, password);
    } catch (e) {
      alert('登录失败：' + e.message);
    }
  };


  return (
    <div className="flex justify-center mt-12">
      <form
        onSubmit={submit}
        className="bg-white rounded-xl shadow-sm p-6 w-full max-w-md space-y-4"
      >
        <h1 className="font-semibold text-lg text-center">登录水吧预约系统</h1>
        <input
          type="email"
          className="w-full border rounded px-3 py-2 text-sm"
          placeholder="邮箱"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          type="password"
          className="w-full border rounded px-3 py-2 text-sm"
          placeholder="密码"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <button
          type="submit"
          className="w-full py-2 rounded bg-slate-900 text-white text-sm font-medium"
        >
          登录
        </button>
      </form>
    </div>
  );
}
