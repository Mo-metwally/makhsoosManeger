import React, { useState, useEffect, useRef } from 'react';
import { ShieldAlert, CheckCircle, XCircle, Users, RefreshCw, ChevronDown, ChevronUp, Save, X, Edit2, Smartphone, KeyRound, Trash2, Crown, Shield, User } from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import './PermissionsReport.css';
import CustomSelect from '../components/CustomSelect';
import { useToast } from '../contexts/ToastContext';

const RoleSelector = ({ currentRole, currentUserRole, userId, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const options = [];
  if (currentUserRole === 'SuperAdmin') {
    options.push({ value: 'SuperAdmin', label: 'مدير تنفيذي', icon: <Crown size={16} /> });
  }
  options.push({ value: 'Admin', label: 'مدير', icon: <Shield size={16} /> });
  options.push({ value: 'Supervisor', label: 'مشرف', icon: <User size={16} /> });

  const selectedOption = options.find(o => o.value === currentRole) || { label: currentRole, icon: <User size={16} /> };

  return (
    <div className="adv-role-selector" ref={dropdownRef}>
      <div className={`adv-role-selected role-${currentRole.toLowerCase()}`} onClick={(e) => { e.stopPropagation(); setIsOpen(!isOpen); }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {selectedOption.icon}
          <span>{selectedOption.label}</span>
        </div>
        <ChevronDown size={14} className={`adv-role-arrow ${isOpen ? 'open' : ''}`} />
      </div>
      {isOpen && (
        <div className="adv-role-dropdown scale-in">
          {options.map(opt => (
            <div 
              key={opt.value} 
              className={`adv-role-option ${currentRole === opt.value ? 'active' : ''}`}
              onClick={(e) => {
                e.stopPropagation();
                setIsOpen(false);
                if (opt.value !== currentRole) onChange(userId, opt.value);
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span className={`role-icon-wrapper role-${opt.value.toLowerCase()}`}>
                  {opt.icon}
                </span>
                <span>{opt.label}</span>
              </div>
              {currentRole === opt.value && <CheckCircle size={14} className="adv-role-check text-green-500" />}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const UserRow = ({ user, currentUser, onRefresh, handleRoleChange, handleAction }) => {
  const [expanded, setExpanded] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const { showToast } = useToast();
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
      showToast('تم تحديث بيانات المستخدم بنجاح', 'success');
    } catch (error) {
      showToast('حدث خطأ أثناء الحفظ', 'error');
    }
  };

  const handleUnlockDevice = async () => {
    if (window.confirm('هل أنت متأكد من فك ارتباط الجهاز؟ سيسمح هذا للمستخدم بالدخول من جهاز جديد.')) {
      try {
        await api.put(`/admin/users/${user.id}/unlock-device`);
        onRefresh();
        showToast('تم فك ارتباط الجهاز بنجاح', 'success');
      } catch (error) {
        showToast('حدث خطأ أثناء فك الارتباط', 'error');
      }
    }
  };

  const handleDeleteUser = async () => {
    if (window.confirm(`هل أنت متأكد من رغبتك في حذف حساب "${user.fullName}" نهائياً؟ لا يمكن التراجع عن هذا الإجراء.`)) {
      try {
        await api.delete(`/admin/users/${user.id}`);
        onRefresh();
        showToast('تم حذف المستخدم بنجاح', 'success');
      } catch (error) {
        showToast(error.response?.data?.error || 'حدث خطأ أثناء الحذف', 'error');
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
        <td onClick={(e) => e.stopPropagation()} style={{ position: 'relative' }}>
          {(currentUser?.role === 'SuperAdmin' || currentUser?.role === 'Admin') && (currentUser?.role === 'SuperAdmin' || user.role !== 'SuperAdmin') ? (
            <RoleSelector 
              currentRole={user.role} 
              currentUserRole={currentUser?.role} 
              userId={user.id} 
              onChange={handleRoleChange} 
            />
          ) : (
            <span style={{ fontSize: '0.95rem' }}>
              {user.role === 'SuperAdmin' ? 'مدير تنفيذي (SuperAdmin)' : user.role === 'Admin' ? 'مدير (Admin)' : 'مشرف (Supervisor)'}
            </span>
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
  const { showToast } = useToast();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [roleFilter, setRoleFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, title: '', message: '', onConfirm: null, isLoading: false });

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
      showToast('تم تنفيذ الإجراء بنجاح', 'success');
    } catch (error) {
      showToast('حدث خطأ أثناء تنفيذ الإجراء', 'error');
    }
  };

  const handleRoleChange = (id, newRole) => {
    setConfirmModal({
      isOpen: true,
      title: 'تأكيد تغيير الصلاحية',
      message: `هل أنت متأكد من تغيير صلاحية هذا الحساب إلى ${newRole === 'SuperAdmin' ? 'مدير تنفيذي' : newRole === 'Admin' ? 'مدير' : 'مشرف'}؟\nتنبيه: سيتم تطبيق الصلاحيات الجديدة فوراً.`,
      onConfirm: async () => {
        setConfirmModal(prev => ({ ...prev, isLoading: true }));
        try {
          await api.put(`/admin/users/${id}/role`, { role: newRole });
          fetchUsers();
          showToast('تم تحديث الصلاحية بنجاح', 'success');
        } catch (error) {
          showToast(error.response?.data?.error || 'حدث خطأ أثناء تغيير الصلاحية', 'error');
          fetchUsers();
        } finally {
          setConfirmModal({ isOpen: false, title: '', message: '', onConfirm: null, isLoading: false });
        }
      }
    });
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
          <CustomSelect
            options={[
              { value: 'All', label: 'جميع الصلاحيات' },
              { value: 'SuperAdmin', label: 'المدير العام (SuperAdmin)' },
              { value: 'Admin', label: 'مدير (Admin)' },
              { value: 'Supervisor', label: 'مشرف (Supervisor)' }
            ]}
            value={roleFilter}
            onChange={setRoleFilter}
            placeholder="الصلاحية"
          />
          <CustomSelect
            options={[
              { value: 'All', label: 'جميع الحالات' },
              { value: 'Active', label: 'نشط' },
              { value: 'Suspended', label: 'موقوف' }
            ]}
            value={statusFilter}
            onChange={setStatusFilter}
            placeholder="الحالة"
          />
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

      {/* Custom Confirmation Modal */}
      {confirmModal.isOpen && (
        <div className="custom-modal-overlay fade-in" onClick={() => !confirmModal.isLoading && setConfirmModal({ isOpen: false })}>
          <div className="custom-modal-content scale-in" onClick={e => e.stopPropagation()}>
            <div className="custom-modal-header">
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#f97316' }}>
                <ShieldAlert size={24} />
                {confirmModal.title}
              </h3>
              <button className="close-btn" onClick={() => setConfirmModal({ isOpen: false })} disabled={confirmModal.isLoading}>
                <X size={20} />
              </button>
            </div>
            <div className="custom-modal-body">
              {confirmModal.message.split('\n').map((line, i) => (
                <p key={i} style={{ marginBottom: '0.5rem' }}>{line}</p>
              ))}
            </div>
            <div className="custom-modal-footer">
              <button className="pr-btn-cancel" onClick={() => setConfirmModal({ isOpen: false })} disabled={confirmModal.isLoading}>إلغاء</button>
              <button className="pr-btn-confirm" onClick={confirmModal.onConfirm} disabled={confirmModal.isLoading}>
                {confirmModal.isLoading ? <RefreshCw size={18} className="spinning" /> : 'تأكيد وحفظ'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PermissionsReport;
