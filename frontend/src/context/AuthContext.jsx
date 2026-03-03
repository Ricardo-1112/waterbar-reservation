
import { createContext, useContext, useEffect, useState } from 'react';
import { api } from '../api/client.js';
import { useNavigate } from 'react-router-dom';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      try {
        const me = await api.me();
        setUser(me);
      } catch {
        setUser(null);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const login = async (email, password) => {
    try {
      await api.login({ email, password });

      const me = await api.me();
      setUser(me);

      if (me.role === 'barAdmin') navigate('/admin');
      else if (me.role === 'studentAdmin') navigate('/student/pickup');
      else navigate('/');

    } catch (err) {
      if (err.response?.data?.message) {
        throw new Error(err.response.data.message);
      }
      throw new Error('登录失败，请稍后再试');
    }
  };

  const logout = async () => {
    try {
      await api.logout();
    } catch {}
    setUser(null);
    navigate('/login');
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
