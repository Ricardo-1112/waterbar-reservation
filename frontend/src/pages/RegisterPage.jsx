
import { useState } from 'react';
import { api } from '../api/client.js';
import { useNavigate } from 'react-router-dom';

export default function RegisterPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const isValidStudentEmail = (email) => /^00\d{4}@nkcswx\.cn$/.test(email);

  const submit = async (e) => {
    e.preventDefault();
    
    // ✅ 邮箱格式校验：00XXXX@nkcswx.cn（XXXX 为 4 位数字）
  if (!isValidStudentEmail(email)) {
    alert('用户名格式必须为 00XXXX@nkcswx.cn（XXXX为4位数字）');
    return;
  }
    try {
      await api.register({ email, password });
      alert('注册成功，请登录');
      navigate('/login');
    } catch (e) {
      alert('注册失败：' + e.message);
    }
  };

  return (
    <div className="flex justify-center mt-12">
      <form
        onSubmit={submit}
        className="bg-white rounded-xl shadow-sm p-6 w-full max-w-md space-y-4"
      >
        <h1 className="font-semibold text-lg text-center">注册账号</h1>
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
          注册
        </button>
      </form>
    </div>
  );
}
