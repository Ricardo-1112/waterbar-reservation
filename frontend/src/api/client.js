async function request(path, options = {}) {
  const res = await fetch(path, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
    ...options,
  });

  if (!res.ok) {
    let message = 'Request failed';
    try {
      const data = await res.json();
      message = data.error || message;
    } catch {}
    throw new Error(message);
  }

  try {
    return await res.json();
  } catch {
    return null;
  }
}


export const api = {
  getTime: () =>
    fetch('/api/time', {
      credentials: 'include'
    }).then(r => r.json()),

  register: (data) =>
    request('/api/register', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  login: (data) =>
    fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(data),
    }).then(r => r.json()),
  me: () => request('/api/me'),
  logout: () =>
    request('/api/logout', {
      method: 'POST',
    }),

  reservationToday: () => request('/api/reservation/today'),

  adminReservationTomorrow: () => request('/api/admin/reservation/tomorrow'),
  adminSetReservationTomorrow: (isOpen) =>
    request('/api/admin/reservation/tomorrow', {
      method: 'PUT',
      body: JSON.stringify({ isOpen }),
    }),

  adminResetStudentPassword: (email, newPassword) =>
    request('/api/admin/users/reset-student-password', {
      method: 'POST',
      body: JSON.stringify({ email, newPassword }),
    }),


  // ==== 学生端下单相关 ====
  getProducts: () => request('/api/products'),
  getTodayCount: () => request('/api/me/today-count'),
  createOrder: (data) =>
    request('/api/order', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  cancelOrder: (id) => request(`/api/order/${id}`, { method: 'DELETE' }),
  myOrders: () => request('/api/order/mine'),

  // ✅ 新增：水吧管理员更新商品（我们新加的 PUT 接口）
  updateProduct: (id, data) =>
    request(`/api/admin/products/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  // ==== 原来就有的 admin 分组（可以先保留，不冲突）====
  adminProducts: {
    create: (data) =>
      request('/api/admin/product', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    update: (id, data) =>
      request(`/api/admin/product/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    remove: (id) =>
      request(`/api/admin/product/${id}`, {
        method: 'DELETE',
      }),
  },

  adminTodayOrders: () => request('/api/admin/orders/today'),
  adminReportDaily: () => request('/api/admin/report/daily'),
  adminReportWeekly: () => request('/api/admin/report/weekly'),
  adminReportMonthly: () => request('/api/admin/report/monthly'),
  downloadExcel: (dateStr) =>
    window.open(`/api/admin/report/excel?date=${dateStr}`, '_blank'),

  // 学生管理员端
  studentTodayOrders: () => request('/api/student/orders/today'),
  studentPickupStatus: (id, picked) =>
    request(`/api/student/order/${id}/pickup-status`, {
      method: 'PUT',
      body: JSON.stringify({ pickupStatus: picked }),
    }),

  // 服务端时间
  serverTime: () => request('/api/server-time'),
};
