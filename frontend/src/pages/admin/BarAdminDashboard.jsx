// frontend/src/pages/admin/AdminProductsPage.jsx

import { useEffect, useState } from 'react';
import { api } from '../../api/client.js';

export default function AdminProductsPage() {
  const [products, setProducts] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [tomorrowInfo, setTomorrowInfo] = useState({
    day: '',
    isOpen: false,
  });
  const [editingReservation, setEditingReservation] = useState(false);
  const [tempIsOpen, setTempIsOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '',
    price: '',
    img: '',
    hot: false,
    maxPerDay: '',
    active: true,
  });

  const [newForm, setNewForm] = useState({
    name: '',
    price: '',
    img: '',
    hot: false,
    maxPerDay: '',
    active: true,
  });

  const [resetEmail, setResetEmail] = useState('');
  const [resetPwd, setResetPwd] = useState('');

  // 读取商品列表（管理员和学生都用同一个 getProducts）
  const loadProducts = async () => {
    const data = await api.getProducts();
    setProducts(data);
  };

  useEffect(() => {
    loadProducts();
    loadTomorrowReservation();
  }, []);

    // 加载明日是否开放预约
  const loadTomorrowReservation = async () => {
    try {
      const data = await api.adminReservationTomorrow();
      setTomorrowInfo(data);
      setTempIsOpen(data.isOpen);
    } catch (e) {
      console.error(e);
      // 默认不开放
      setTomorrowInfo({ day: '', isOpen: false });
      setTempIsOpen(false);
    }
  };


  // 点击“编辑”时，把这一行商品的数据放到 editForm 里
  const startEdit = (p) => {
    setEditingId(p.id);
    setEditForm({
      name: p.name,
      price: p.price,
      img: p.img || '',
      hot: !!p.hot,
      maxPerDay: p.maxPerDay ?? p.max_per_day ?? 0,
      active: p.active ?? true,
    });
  };

  const handleEditChange = (field, value) => {
    setEditForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  // 保存修改：调用 api.adminProducts.update
  const saveEdit = async (id) => {
    try {
      const payload = {
        name: editForm.name.trim(),
        price: Number(editForm.price),
        img: editForm.img.trim() || null,
        hot: !!editForm.hot,
        maxPerDay: Number(editForm.maxPerDay),
        active: !!editForm.active,
      };

      await api.adminProducts.update(id, payload);
      setEditingId(null);
      await loadProducts();
      alert('修改成功');
    } catch (e) {
      alert(e.message);
    }
  };

  const cancelEdit = () => {
    setEditingId(null);
  };

  // 删除：调用 api.adminProducts.remove
  const deleteProduct = async (id) => {
    if (!confirm('确定删除该商品？')) return;
    try {
      await api.adminProducts.remove(id);
      await loadProducts();
      alert('已删除');
    } catch (e) {
      alert(e.message);
    }
  };

    // 保存明日预约状态
  const saveTomorrowReservation = async () => {
    try {
      await api.adminSetReservationTomorrow(tempIsOpen);
      setEditingReservation(false);
      await loadTomorrowReservation();
      alert('已保存');
    } catch (e) {
      alert('保存失败');
    }
  };


  // 新增：调用 api.adminProducts.create
  const createProduct = async () => {
    try {
      const payload = {
        name: newForm.name.trim(),
        price: Number(newForm.price),
        img: newForm.img.trim() || null,
        hot: !!newForm.hot,
        maxPerDay: Number(newForm.maxPerDay),
        active: !!newForm.active,
      };

      await api.adminProducts.create(payload);
      setNewForm({
        name: '',
        price: '',
        img: '',
        hot: false,
        maxPerDay: '',
        active: true,
      });
      await loadProducts();
      alert('新增成功');
    } catch (e) {
      alert(e.message);
    }
  };

  return (
    <div className="bg-white rounded-xl p-4 shadow-sm space-y-4">

    {/* ✅ 水吧管理员：重置学生密码 */}
    <div className="border rounded-lg p-3 bg-slate-50 flex flex-col gap-2">
      <div className="font-semibold text-sm">重置学生密码（仅学生账号 00XXXX@nkcswx.cn）</div>

      <div className="flex flex-wrap items-center gap-2 text-sm">
        <input
          className="border rounded px-2 py-1 w-56"
          placeholder="学生邮箱：00XXXX@nkcswx.cn"
          value={resetEmail}
          onChange={(e) => setResetEmail(e.target.value)}
        />
        <input
          className="border rounded px-2 py-1 w-56"
          placeholder="新密码"
          value={resetPwd}
          onChange={(e) => setResetPwd(e.target.value)}
        />
        <button
          className="px-3 py-1 rounded bg-slate-900 text-white"
          onClick={async () => {
            try {
              if (!resetEmail || !resetPwd) {
                alert('请填写学生邮箱和新密码');
                return;
              }
              await api.adminResetStudentPassword(resetEmail.trim(), resetPwd);
              alert('重置成功');
              setResetPwd('');
            } catch (e) {
              alert('重置失败：' + e.message);
            }
          }}
        >
          重置
        </button>
      </div>

      <div className="text-xs text-slate-500">
        说明：只会修改学生账号密码，不会影响历史订单；管理员账号不可在这里被重置。
      </div>
    </div>

            {/* 明日是否开放预约 */}
      <div className="bg-slate-50 border rounded-lg p-3 flex items-center justify-between text-sm">
        <div>
          <div className="font-medium">
            明日（{tomorrowInfo.day || '未设置'}）是否开放预约
          </div>
          <div className="text-slate-500 mt-1">
            状态：
            <span className="ml-1 font-semibold">
              {tomorrowInfo.isOpen ? '是' : '否'}
            </span>
          </div>
        </div>

        <div>
          {editingReservation ? (
            <div className="flex items-center gap-2">
              <select
                className="border rounded px-2 py-1"
                value={tempIsOpen ? 'yes' : 'no'}
                onChange={(e) => setTempIsOpen(e.target.value === 'yes')}
              >
                <option value="no">否</option>
                <option value="yes">是</option>
              </select>

              <button
                onClick={saveTomorrowReservation}
                className="px-3 py-1 rounded bg-emerald-600 text-white text-xs"
              >
                保存
              </button>

              <button
                onClick={() => setEditingReservation(false)}
                className="px-3 py-1 rounded bg-slate-100 text-xs"
              >
                取消
              </button>
            </div>
          ) : (
            <button
              onClick={() => setEditingReservation(true)}
              className="px-3 py-1 rounded bg-slate-100 text-xs"
            >
              编辑
            </button>
          )}
        </div>
      </div>

      <h1 className="font-semibold text-sm mb-2">商品管理</h1>

      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="border-b">
            <th className="py-2 text-left">名称</th>
            <th className="text-left">价格</th>
            <th className="text-left">每日上限</th>
            <th className="text-left">图片 URL</th>
            <th className="text-left">热卖</th>
            <th className="text-left">上架</th>
            <th className="text-left">操作</th>
          </tr>
        </thead>
        <tbody>
          {products.map((p) => {
            const isEditing = editingId === p.id;
            return (
              <tr key={p.id} className="border-b align-top">
                <td className="py-2">
                  {isEditing ? (
                    <input
                      className="border rounded px-1 py-0.5 w-32"
                      value={editForm.name}
                      onChange={(e) =>
                        handleEditChange('name', e.target.value)
                      }
                    />
                  ) : (
                    p.name
                  )}
                </td>
                <td>
                  {isEditing ? (
                    <input
                      type="number"
                      className="border rounded px-1 py-0.5 w-20"
                      value={editForm.price}
                      onChange={(e) =>
                        handleEditChange('price', e.target.value)
                      }
                    />
                  ) : (
                    `¥${p.price}`
                  )}
                </td>
                <td>
                  {isEditing ? (
                    <input
                      type="number"
                      className="border rounded px-1 py-0.5 w-20"
                      value={editForm.maxPerDay}
                      onChange={(e) =>
                        handleEditChange('maxPerDay', e.target.value)
                      }
                    />
                  ) : (
                    p.maxPerDay ?? p.max_per_day
                  )}
                </td>
                <td>
                  {isEditing ? (
                    <input
                      className="border rounded px-1 py-0.5 w-56"
                      value={editForm.img}
                      onChange={(e) =>
                        handleEditChange('img', e.target.value)
                      }
                      placeholder="可留空"
                    />
                  ) : p.img ? (
                    <span className="break-all text-xs">{p.img}</span>
                  ) : (
                    <span className="text-slate-400 text-xs">（无）</span>
                  )}
                </td>
                <td>
                  {isEditing ? (
                    <input
                      type="checkbox"
                      checked={editForm.hot}
                      onChange={(e) =>
                        handleEditChange('hot', e.target.checked)
                      }
                    />
                  ) : p.hot ? (
                    '是'
                  ) : (
                    '否'
                  )}
                </td>
                <td>
                  {isEditing ? (
                    <input
                      type="checkbox"
                      checked={editForm.active}
                      onChange={(e) =>
                        handleEditChange('active', e.target.checked)
                      }
                    />
                  ) : p.active ? (
                    '上架'
                  ) : (
                    '下架'
                  )}
                </td>
                <td>
                  {isEditing ? (
                    <div className="flex gap-2">
                      <button
                        onClick={() => saveEdit(p.id)}
                        className="px-2 py-1 rounded bg-slate-900 text-white text-xs"
                      >
                        保存
                      </button>
                      <button
                        onClick={cancelEdit}
                        className="px-2 py-1 rounded bg-slate-100 text-xs"
                      >
                        取消
                      </button>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <button
                        onClick={() => startEdit(p)}
                        className="px-2 py-1 rounded bg-slate-100 text-xs"
                      >
                        编辑
                      </button>
                      <button
                        onClick={() => deleteProduct(p.id)}
                        className="px-2 py-1 rounded bg-red-100 text-red-600 text-xs"
                      >
                        删除
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            );
          })}

          {/* 新增商品这一行 */}
          <tr>
            <td className="py-2">
              <input
                className="border rounded px-1 py-0.5 w-32"
                placeholder="名称"
                value={newForm.name}
                onChange={(e) =>
                  setNewForm((prev) => ({ ...prev, name: e.target.value }))
                }
              />
            </td>
            <td>
              <input
                type="number"
                className="border rounded px-1 py-0.5 w-20"
                placeholder="价格"
                value={newForm.price}
                onChange={(e) =>
                  setNewForm((prev) => ({ ...prev, price: e.target.value }))
                }
              />
            </td>
            <td>
              <input
                type="number"
                className="border rounded px-1 py-0.5 w-20"
                placeholder="上限"
                value={newForm.maxPerDay}
                onChange={(e) =>
                  setNewForm((prev) => ({
                    ...prev,
                    maxPerDay: e.target.value,
                  }))
                }
              />
            </td>
            <td>
              <input
                className="border rounded px-1 py-0.5 w-56"
                placeholder="图片 URL，可留空"
                value={newForm.img}
                onChange={(e) =>
                  setNewForm((prev) => ({ ...prev, img: e.target.value }))
                }
              />
            </td>
            <td>
              <input
                type="checkbox"
                checked={newForm.hot}
                onChange={(e) =>
                  setNewForm((prev) => ({ ...prev, hot: e.target.checked }))
                }
              />
            </td>
            <td>
              <input
                type="checkbox"
                checked={newForm.active}
                onChange={(e) =>
                  setNewForm((prev) => ({
                    ...prev,
                    active: e.target.checked,
                  }))
                }
              />
            </td>
            <td>
              <button
                onClick={createProduct}
                className="px-3 py-1 rounded bg-emerald-600 text-white text-xs"
              >
                新增
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
