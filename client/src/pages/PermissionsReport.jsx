import React, { useState, useEffect } from 'react';
import { ShieldAlert, CheckCircle, XCircle, Users, RefreshCw } from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import './PermissionsReport.css';

const PermissionsReport = () => {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [roleFilter, setRoleFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await api.get('/admin/users');
      setUsers(res.data);
      setError('');
    } catch (err) {
      setError('حدث خطأ في جلب بيانات المستخدمين. يرجى التأكد من صلاحياتك.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    document.title = "لوحة إدارة الصلاحيات | مخصوص";
    fetchUsers();
  }, []);

  const handleAction = async (id, action) => {
    try {
      if (action === 'approve') {
        await api.put(`/admin/users/${id}/approve`);
      } else if (action === 'suspend') {
        await api.put(`/admin/users/${id}/suspend`);
      }
      fetchUsers();
    } catch (error) {
      alert('حدث خطأ أثناء تنفيذ الإجراء');
    }
  };

  const handleRoleChange = async (id, newRole) => {
    try {
      await api.put(`/admin/users/${id}/role`, { role: newRole });
      fetchUsers();
    } catch (error) {
      alert(error.response?.data?.error || 'حدث خطأ أثناء تغيير الصلاحية');
    }
  };

  const pendingUsers = users.filter(u => u.status === 'Pending Approval');
  
  let filteredUsers = users.filter(u => u.status !== 'Pending Approval');
  if (roleFilter !== 'All') {
    filteredUsers = filteredUsers.filter(u => u.role === roleFilter);
  }
  if (statusFilter !== 'All') {
    filteredUsers = filteredUsers.filter(u => u.status === statusFilter);
  }

  return (
    <div className="permissions-report-container fade-in">
      <div className="pr-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 className="pr-title">
            <Users size={32} />
            <span>إدارة حسابات النظام (الصلاحيات)</span>
          </h1>
          <p className="pr-subtitle mt-2 text-slate-400">تحكم كامل في الحسابات، صلاحيات الدخول، ومراجعة طلبات الانضمام.</p>
        </div>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <select className="pr-filter" value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
            <option value="All">جميع الصلاحيات</option>
            <option value="SuperAdmin">المدير العام (SuperAdmin)</option>
            <option value="Admin">مدير (Admin)</option>
            <option value="Supervisor">مشرف (Supervisor)</option>
          </select>
          <select className="pr-filter" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="All">جميع الحالات</option>
            <option value="Active">نشط</option>
            <option value="Suspended">موقوف</option>
          </select>
          <button className="pr-refresh-btn" onClick={fetchUsers}>
            <RefreshCw size={20} className={loading ? 'spinning' : ''} />
            تحديث البيانات
          </button>
        </div>
      </div>

      {error && <div className="pr-error-box">{error}</div>}

      <div className="pr-sections">
        {/* Pending Approval Section */}
        <div className="pr-section glass-panel pending-section">
          <h2 className="pr-section-title text-orange-500">
            <ShieldAlert size={24} />
            طلبات قيد المراجعة ({pendingUsers.length})
          </h2>
          {pendingUsers.length === 0 ? (
            <p className="pr-empty-text">لا توجد طلبات معلقة حالياً.</p>
          ) : (
            <div className="pr-table-wrapper">
              <table className="pr-table">
                <thead>
                  <tr>
                    <th>اسم المستخدم</th>
                    <th>الاسم الكامل</th>
                    <th>البريد الإلكتروني</th>
                    <th>إجراء</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingUsers.map(u => (
                    <tr key={u.id}>
                      <td>{u.username}</td>
                      <td>{u.fullName}</td>
                      <td>{u.email}</td>
                      <td className="pr-actions">
                        <button className="pr-btn-approve" onClick={() => handleAction(u.id, 'approve')} title="موافقة">
                          <CheckCircle size={20} />
                        </button>
                        <button className="pr-btn-suspend" onClick={() => handleAction(u.id, 'suspend')} title="رفض">
                          <XCircle size={20} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Filtered Users Section */}
        <div className="pr-section glass-panel">
          <h2 className="pr-section-title text-green-500">
            <CheckCircle size={24} />
            الحسابات المسجلة ({filteredUsers.length})
          </h2>
          {filteredUsers.length === 0 ? (
            <p className="pr-empty-text">لا توجد حسابات تطابق خيارات الفلترة.</p>
          ) : (
            <div className="pr-table-wrapper">
              <table className="pr-table">
                <thead>
                  <tr>
                    <th>اسم المستخدم</th>
                    <th>الاسم الكامل</th>
                    <th>الصلاحية</th>
                    <th>الحالة</th>
                    <th>إجراء</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map(u => (
                    <tr key={u.id} className={u.status === 'Suspended' ? 'suspended-row' : ''}>
                      <td>{u.username}</td>
                      <td>{u.fullName}</td>
                      <td>
                        {(currentUser?.role === 'SuperAdmin' || currentUser?.role === 'Admin') && u.role !== 'SuperAdmin' ? (
                          <select 
                            className="pr-filter" 
                            style={{ minWidth: '120px', padding: '0.3rem 0.5rem', fontSize: '0.9rem', height: 'auto' }}
                            value={u.role}
                            onChange={(e) => handleRoleChange(u.id, e.target.value)}
                          >
                            <option value="Admin">مدير (Admin)</option>
                            <option value="Supervisor">مشرف (Supervisor)</option>
                          </select>
                        ) : (
                          u.role
                        )}
                      </td>
                      <td>
                        <span className={`pr-badge ${u.status === 'Active' ? 'active-badge' : 'suspended-badge'}`}>
                          {u.status === 'Active' ? 'نشط' : 'موقوف'}
                        </span>
                      </td>
                      <td className="pr-actions">
                        {u.role !== 'SuperAdmin' && u.status === 'Active' && (
                          <button className="pr-btn-suspend" onClick={() => handleAction(u.id, 'suspend')} title="إيقاف">
                            <XCircle size={20} />
                          </button>
                        )}
                        {u.role !== 'SuperAdmin' && u.status === 'Suspended' && (
                          <button className="pr-btn-approve" onClick={() => handleAction(u.id, 'approve')} title="تفعيل">
                            <CheckCircle size={20} />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PermissionsReport;
