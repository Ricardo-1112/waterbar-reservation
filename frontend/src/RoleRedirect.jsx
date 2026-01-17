import { Navigate } from "react-router-dom";
import { useAuth } from "./context/AuthContext.jsx";

export default function RoleRedirect() {
  const { user, loading } = useAuth();

  if (loading) return <div className="p-4">加载中...</div>;
  if (!user) return <Navigate to="/login" replace />;

  if (user.role === "admin") return <Navigate to="/admin" replace />;
  if (user.role === "student_admin") return <Navigate to="/student/pickup" replace />;

  return <Navigate to="/products" replace />; // 普通学生
}