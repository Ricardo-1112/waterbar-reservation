
import { Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar.jsx';
import LoginPage from './pages/LoginPage.jsx';
import RegisterPage from './pages/RegisterPage.jsx';

import UserProductsPage from './pages/user/UserProductsPage.jsx';
import UserOrdersPage from './pages/user/UserOrdersPage.jsx';

import BarAdminDashboard from './pages/admin/BarAdminDashboard.jsx';
import AdminOrdersPage from './pages/admin/AdminOrdersPage.jsx';
import ReportsPage from './pages/admin/ReportsPage.jsx';

import StudentPickupPage from './pages/student/StudentPickupPage.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import RoleRedirect from './RoleRedirect.jsx';

function App() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-6">
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          <Route path="/" element={<RoleRedirect />} />
          <Route
            path="/orders"
            element={
              <ProtectedRoute roles={['user']}>
                <UserOrdersPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/products"
            element={
              <ProtectedRoute roles={['user']}>
                <UserProductsPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin"
            element={
              <ProtectedRoute roles={['admin']}>
                <BarAdminDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/orders"
            element={
              <ProtectedRoute roles={['admin']}>
                <AdminOrdersPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/reports"
            element={
              <ProtectedRoute roles={['admin']}>
                <ReportsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/student/pickup"
            element={
              <ProtectedRoute roles={['student_admin']}>
                <StudentPickupPage />
              </ProtectedRoute>
            }
          />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;
