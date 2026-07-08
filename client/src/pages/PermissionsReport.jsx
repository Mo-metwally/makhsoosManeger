import React, { useState, useEffect } from 'react';
import { ShieldAlert, CheckCircle, XCircle, Users, RefreshCw, ChevronDown, ChevronUp, Save, X, Edit2, Smartphone, KeyRound, Trash2 } from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import './PermissionsReport.css';

const UserRow = ({ user, currentUser, onRefresh, handleRoleChange, handleAction }) => {
  const [expanded, setExpanded] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    fullName: user.fullName || '',
    username: user.username || '',
    email: user.email || '',
    phone: user.phone || '',
    jobTitle: user.jobTitle || ''
  });

  const toggleExpand = () => setExpanded(!expanded);

  const handleEditChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSave = async () => {
    try {
      await api.put(`/admin/users/${user.id}`, formData);
      setIsEditing(false);
      onRefresh();
    } catch (error) {
      alert('حدث خطأ أثناء الحفظ');
    }
  };

  const handleUnlockDevice = async () => {
    if (window.confirm('هل أنت متأكد من فك ارتباط الجهاز؟ سيسمح هذا للمستخدم بالدخول من جهاز جديد.')) {
      try {
        await api.put(`/admin/users/${user.id}/unlock-device`);
        onRefresh();
      } catch (error) {
        alert('حدث خطأ أثناء فك الارتباط');
      }
    }
  };

  const handleDeleteUser = async () => {
    if (window.confirm(`هل أنت متأكد من رغبتك في حذف حساب "${user.fullName}" نهائياً؟ لا يمكن التراجع عن هذا الإجراء.`)) {
      try {
        await api.delete(`/admin/users/${user.id}`);
        onRefresh();
      } catch (error) {
        alert(error.response?.data?.error || 'حدث خطأ أثناء الحذف');
      }
    }
  };

  return (
    <>
      <tr className={`pr-user-row ${user.status === 'Suspended' ? 'suspended-row' : ''}`} onClick={toggleExpand}>
        <td>
          <div className="flex items-center gap-2">
            {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            {user.username}
          </div>
        </td>
        <td>{user.fullName}</td>
        <td onClick={(e) => e.stopPropagation()}>
          {(currentUser?.role === 'SuperAdmin' || currentUser?.role === 'Admin') && user.role !== 'SuperAdmin' ? (
            <select 
              className="pr-filter" 
              style={{ minWidth: '120px', padding: '0.3rem 0.5rem', fontSize: '0.9rem', height: 'auto' }}
              value={user.role}
              onChange={(e) => handleRoleChange(user.id, e.target.value)}
            >
              <option value="Admin">مدير (Admin)</option>
              <option value="Supervisor">مشرف (Supervisor)</option>
            </select>
          ) : (
            user.role
          )}
        </td>
        <td>
          <span className={`pr-badge ${user.status === 'Active' ? 'active-badge' : 'suspended-badge'}`}>
            {user.status === 'Active' ? 'نشط' : 'موقوف'}
          </span>
        </td>
        <td className="pr-actions" onClick={(e) => e.stopPropagation()}>
          {user.role !== 'SuperAdmin' && user.status === 'Active' && (
            <button className="pr-btn-suspend" onClick={() => handleAction(user.id, 'suspend')} title="إيقاف">
              <XCircle size={20} />
            </button>
          )}
          {user.role !== 'SuperAdmin' && user.status === 'Suspended' && (
            <button className="pr-btn-approve" onClick={() => handleAction(user.id, 'approve')} title="تفعيل">
              <CheckCircle size={20} />
            </button>
          )}
        </td>
      </tr>
      {expanded && (
        <tr className="expanded-row">
          <td colSpan="5">
            <div className="expanded-panel">
              <div className="expanded-header">
                <h3>تفاصيل الحساب</h3>
                {!isEditing ? (
                  <button className="btn-edit-small" onClick={() => setIsEditing(true)}>
                    <Edit2 size={16} /> تعديل البيانات
                  </button>
                ) : (
                  <div className="edit-actions">
                    <button className="btn-save-small" onClick={handleSave}>
                      <Save size={16} /> حفظ
                    </button>
                    <button className="btn-cancel-small" onClick={() => setIsEditing(false)}>
                      <X size={16} /> إلغاء
                    </button>
                  </div>
                )}
              </div>
              <div className="expanded-body">
                <div className="form-grid">
                  <div className="form-group">
                    <label>الاسم الكامل</label>
                    {isEditing ? <input type="text" name="fullName" value={formData.fullName} onChange={handleEditChange} /> : <p>{user.fullName}</p>}
                  </div>
                  <div className="form-group">
                    <label>اسم المستخدم</label>
                    {isEditing ? <input type="text" name="username" value={formData.username} onChange={handleEditChange} /> : <p>{user.username}</p>}
                  </div>
                  <div className="form-group">
                    <label>البريد الإلكتروني</label>
                    {isEditing ? <input type="email" name="email" value={formData.email} onChange={handleEditChange} /> : <p>{user.email || 'غير مسجل'}</p>}
                  </div>
                  <div className="form-group">
                    <label>رقم الهاتف</label>
                    {isEditing ? <input type="tel" name="phone" value={formData.phone} onChange={handleEditChange} /> : <p>{user.phone || 'غير مسجل'}</p>}
                  </div>
                  <div className="form-group">
                    <label>المسمى الوظيفي</label>
                    {isEditing ? <input type="text" name="jobTitle" value={formData.jobTitle} onChange={handleEditChange} /> : <p>{user.jobTitle || 'غير مسجل'}</p>}
                  </div>
                </div>
                
                <div className="device-lock-section">
                  <div className="device-info">
                    <Smartphone size={20} className="text-blue" />
                    <span>الأجهزة المرتبطة: <strong>{user.deviceId ? '1 جهاز (مقفل)' : '0 أجهزة (غير مرتبط)'}</strong></span>
                  </div>
                  {user.deviceId && (
                    <button className="btn-unlock" onClick={handleUnlockDevice}>
                      <KeyRound size={16} /> فك ارتباط الجهاز
                    </button>
                  )}
                </div>

                <div style={{ marginTop: '2rem', borderTop: '1px solid var(--border-color)', paddingTop: '1.5rem', display: 'flex', justifyContent: 'flex-start' }}>
                  <button 
                    onClick={handleDeleteUser} 
                    style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.2)', padding: '0.8rem 1.5rem', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 'bold', transition: '0.3s', cursor: 'pointer' }}
                    onMouseOver={(e) => { e.currentTarget.style.background = '#ef4444'; e.currentTarget.style.color = 'white'; }}
                    onMouseOut={(e) => { e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'; e.currentTarget.style.color = '#ef4444'; }}
                  >
                    <Trash2 size={18} /> حذف الحساب نهائياً
                  </button>
                </div>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
};

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
                    <UserRow 
                      key={u.id} 
                      user={u} 
                      currentUser={currentUser} 
                      onRefresh={fetchUsers} 
                      handleRoleChange={handleRoleChange} 
                      handleAction={handleAction} 
                    />
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
