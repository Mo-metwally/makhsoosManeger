import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Clock, Plus, Users, Trash2, Calendar, Check, Save, TriangleAlert, Search, User as UserIcon, Edit, ShieldCheck, Crown, Shield, Cat, Star, Smile, Briefcase, Flame, Zap, Heart, Moon, Activity } from 'lucide-react';
import api from '../services/api';
import './Account.css'; // Reuse form styles

const DAYS_OF_WEEK = [
  { id: 'Saturday', label: 'السبت' },
  { id: 'Sunday', label: 'الأحد' },
  { id: 'Monday', label: 'الإثنين' },
  { id: 'Tuesday', label: 'الثلاثاء' },
  { id: 'Wednesday', label: 'الأربعاء' },
  { id: 'Thursday', label: 'الخميس' },
  { id: 'Friday', label: 'الجمعة' }
];

import AvatarIcon from '../components/AvatarIcon';

const ShiftManagement = () => {
  const [shifts, setShifts] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  
  // Form State
  const [shiftForm, setShiftForm] = useState({
    name: '',
    startTime: '09:00',
    endTime: '17:00',
    workingDays: [],
    dayOffType: 'Fixed',
    fixedDaysOff: [],
    variableDaysOffCount: 0
  });
  const [editingShiftId, setEditingShiftId] = useState(null);

  // Modal State
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedShift, setSelectedShift] = useState(null);
  const [selectedUserIds, setSelectedUserIds] = useState([]);
  const [modalSearchTerm, setModalSearchTerm] = useState('');

  // Shift-specific search terms
  const [shiftSearchTerms, setShiftSearchTerms] = useState({});

  // Notifications
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

  useEffect(() => {
    document.title = "تنظيم الورديات | مخصوص";
    fetchShifts();
    fetchAllUsers();
  }, []);

  const fetchShifts = async () => {
    try {
      const res = await api.get('/shifts');
      setShifts(res.data);
    } catch (err) {
      showToast('خطأ في جلب الورديات', 'error');
    }
  };

  const fetchAllUsers = async () => {
    try {
      const res = await api.get('/admin/users');
      const activeUsers = res.data.filter(u => u.status === 'Active');
      setAllUsers(activeUsers);
    } catch (err) {
      console.error(err);
    }
  };

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3000);
  };

  const handleDayToggle = (dayId) => {
    setShiftForm(prev => {
      const isSelected = prev.workingDays.includes(dayId);
      if (isSelected) {
        return { ...prev, workingDays: prev.workingDays.filter(d => d !== dayId) };
      } else {
        return { ...prev, workingDays: [...prev.workingDays, dayId] };
      }
    });
  };

  const handleFixedDayOffToggle = (dayId) => {
    setShiftForm(prev => {
      const isSelected = prev.fixedDaysOff.includes(dayId);
      if (isSelected) {
        return { ...prev, fixedDaysOff: prev.fixedDaysOff.filter(d => d !== dayId) };
      } else {
        return { ...prev, fixedDaysOff: [...prev.fixedDaysOff, dayId] };
      }
    });
  };

  const handleSubmitShift = async (e) => {
    e.preventDefault();
    if (shiftForm.workingDays.length === 0) {
      showToast('يرجى اختيار أيام العمل للوردية', 'error');
      return;
    }

    try {
      if (editingShiftId) {
        await api.put(`/shifts/${editingShiftId}`, shiftForm);
        showToast('تم تحديث الوردية بنجاح');
      } else {
        await api.post('/shifts', shiftForm);
        showToast('تم إنشاء الوردية بنجاح');
      }
      resetForm();
      fetchShifts();
    } catch (err) {
      showToast('حدث خطأ أثناء حفظ الوردية', 'error');
    }
  };

  const resetForm = () => {
    setShiftForm({ 
      name: '', 
      startTime: '09:00', 
      endTime: '17:00', 
      workingDays: [],
      dayOffType: 'Fixed',
      fixedDaysOff: [],
      variableDaysOffCount: 0 
    });
    setEditingShiftId(null);
    setIsFormModalOpen(false);
  };

  const handleEditShift = (shift) => {
    setShiftForm({
      name: shift.name,
      startTime: shift.startTime,
      endTime: shift.endTime,
      workingDays: shift.workingDays,
      dayOffType: shift.dayOffType || 'Fixed',
      fixedDaysOff: shift.fixedDaysOff || [],
      variableDaysOffCount: shift.variableDaysOffCount || 0
    });
    setEditingShiftId(shift.id);
    setIsFormModalOpen(true);
  };

  const handleDeleteShift = async (id) => {
    if (!window.confirm('هل أنت متأكد من حذف هذه الوردية؟')) return;
    try {
      await api.delete(`/shifts/${id}`);
      showToast('تم الحذف بنجاح');
      fetchShifts();
    } catch (err) {
      showToast('خطأ أثناء الحذف', 'error');
    }
  };

  const openAssignModal = (shift) => {
    setSelectedShift(shift);
    const existingIds = shift.Users ? shift.Users.map(u => u.id) : [];
    setSelectedUserIds(existingIds);
    setModalSearchTerm('');
    setIsModalOpen(true);
  };

  const handleUserToggle = (userId) => {
    setSelectedUserIds(prev => {
      if (prev.includes(userId)) return prev.filter(id => id !== userId);
      return [...prev, userId];
    });
  };

  const handleAssignSubmit = async () => {
    try {
      await api.put(`/shifts/${selectedShift.id}/assign`, { userIds: selectedUserIds });
      showToast('تم تحديث تعيين الموظفين بنجاح');
      setIsModalOpen(false);
      fetchShifts();
    } catch (err) {
      showToast('حدث خطأ أثناء تعيين الموظفين', 'error');
    }
  };

  const handleShiftSearchChange = (shiftId, value) => {
    setShiftSearchTerms(prev => ({ ...prev, [shiftId]: value }));
  };

  // Filter users in the modal
  const filteredModalUsers = allUsers.filter(user => 
    user.fullName.toLowerCase().includes(modalSearchTerm.toLowerCase()) ||
    (user.jobTitle && user.jobTitle.toLowerCase().includes(modalSearchTerm.toLowerCase()))
  );

  return (
    <div className="account-container">
      <header className="page-header">
        <div className="page-title-wrapper">
          <Clock size={28} className="title-icon text-blue" />
          <h1 className="page-title gradient-title">تنظيم الورديات</h1>
        </div>
      </header>

      <div className="account-content" style={{ display: 'flex', flexDirection: 'column', gap: '3rem' }}>
        
        {/* Section: Advanced List of Shifts */}
        <div className="shifts-list-section">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
            <h2 style={{ color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
              <Calendar size={24} className="text-blue" />
              إدارة الورديات وتفاصيل الموظفين
            </h2>
            <button 
              className="btn-save" 
              onClick={() => setIsFormModalOpen(true)}
              style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '0.8rem 1.5rem', background: '#fff', color: '#000', borderRadius: '12px' }}
            >
              <span style={{ fontWeight: 'bold' }}>إضافة وردية جديدة</span>
              <Plus size={20} />
            </button>
          </div>

          {shifts.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)', background: 'var(--bg-card)', borderRadius: '12px', border: '1px dashed rgba(255,255,255,0.1)' }}>
              لا توجد ورديات مُسجلة حالياً. قم بإنشاء أول وردية من النموذج أعلاه.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
              {shifts.map(shift => {
                const searchTerm = shiftSearchTerms[shift.id] || '';
                const shiftUsers = shift.Users || [];
                const filteredShiftUsers = shiftUsers.filter(u => 
                  u.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                  (u.jobTitle && u.jobTitle.toLowerCase().includes(searchTerm.toLowerCase()))
                ).sort((a, b) => {
                  const getRoleScore = (role) => role === 'SuperAdmin' ? 3 : role === 'Admin' ? 2 : 1;
                  // Sort by role descending, then by name alphabetically
                  const roleDiff = getRoleScore(b.role) - getRoleScore(a.role);
                  if (roleDiff !== 0) return roleDiff;
                  return a.fullName.localeCompare(b.fullName, 'ar');
                });

                return (
                  <div key={shift.id} className="account-card" style={{ padding: '0', overflow: 'hidden' }}>
                    {/* Shift Header */}
                    <div style={{ 
                      padding: '1.5rem 2rem', 
                      background: 'rgba(59, 130, 246, 0.05)', 
                      borderBottom: '1px solid rgba(255,255,255,0.05)',
                      display: 'flex',
                      flexWrap: 'wrap',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: '1rem'
                    }}>
                      <div>
                        <h3 style={{ fontSize: '1.4rem', color: 'var(--text-primary)', margin: '0 0 0.5rem 0' }}>{shift.name}</h3>
                        <div style={{ display: 'flex', gap: '1.5rem', color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                            <Clock size={16} className="text-blue" /> 
                            {shift.startTime} - {shift.endTime}
                          </span>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                            <Calendar size={16} className="text-blue" /> 
                            {shift.workingDays.map(dId => DAYS_OF_WEEK.find(d => d.id === dId)?.label).join('، ')}
                          </span>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                            <Users size={16} className="text-blue" /> 
                            {shiftUsers.length} موظف
                          </span>
                        </div>
                        <div style={{ display: 'flex', gap: '1.5rem', color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.5rem' }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'rgba(255,255,255,0.05)', padding: '0.2rem 0.6rem', borderRadius: '4px' }}>
                            <strong>نظام الإجازات:</strong> 
                            {shift.dayOffType === 'Fixed' ? 'ثابت' : 'متغير'}
                          </span>
                          {shift.dayOffType === 'Fixed' ? (
                            <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'rgba(255,255,255,0.05)', padding: '0.2rem 0.6rem', borderRadius: '4px' }}>
                              <strong>أيام الإجازة:</strong> 
                              {(shift.fixedDaysOff || []).map(dId => DAYS_OF_WEEK.find(d => d.id === dId)?.label).join('، ') || 'لا يوجد'}
                            </span>
                          ) : (
                            <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'rgba(255,255,255,0.05)', padding: '0.2rem 0.6rem', borderRadius: '4px' }}>
                              <strong>الأيام المسموحة شهرياً:</strong> 
                              {shift.variableDaysOffCount || 0} أيام
                            </span>
                          )}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '0.8rem' }}>
                        <button 
                          onClick={() => handleEditShift(shift)}
                          style={{ 
                            background: 'rgba(59, 130, 246, 0.1)', color: 'var(--accent-blue)', 
                            border: '1px solid rgba(59, 130, 246, 0.2)', 
                            padding: '0.6rem 1rem', borderRadius: '8px', cursor: 'pointer',
                            display: 'flex', alignItems: 'center', gap: '0.5rem',
                            transition: 'all 0.2s'
                          }}
                          onMouseOver={e => e.currentTarget.style.background = 'rgba(59, 130, 246, 0.2)'}
                          onMouseOut={e => e.currentTarget.style.background = 'rgba(59, 130, 246, 0.1)'}
                        >
                          <Edit size={16} /> تعديل الوردية
                        </button>
                        <button 
                          onClick={() => openAssignModal(shift)}
                          className="btn-save"
                          style={{ padding: '0.6rem 1.2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                        >
                          <Users size={16} /> إدارة الموظفين
                        </button>
                        <button 
                          onClick={() => handleDeleteShift(shift.id)}
                          style={{ 
                            background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', 
                            border: '1px solid rgba(239, 68, 68, 0.2)', 
                            padding: '0.6rem 1rem', borderRadius: '8px', cursor: 'pointer',
                            display: 'flex', alignItems: 'center', gap: '0.5rem',
                            transition: 'all 0.2s'
                          }}
                          onMouseOver={e => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)'}
                          onMouseOut={e => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'}
                        >
                          <Trash2 size={16} /> حذف
                        </button>
                      </div>
                    </div>

                    {/* Shift Employees Area */}
                    <div style={{ padding: '1.5rem 2rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
                        <h4 style={{ color: 'var(--text-secondary)', fontSize: '1.1rem', margin: 0 }}>موظفو الوردية</h4>
                        
                        <div className="search-box" style={{ width: '300px', maxWidth: '100%', position: 'relative' }}>
                          <Search size={18} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)', pointerEvents: 'none' }} />
                          <input
                            type="text"
                            placeholder="ابحث عن موظف في هذه الوردية..."
                            value={searchTerm}
                            onChange={(e) => handleShiftSearchChange(shift.id, e.target.value)}
                            style={{ 
                              width: '100%', 
                              padding: '0.7rem 2.5rem 0.7rem 1rem', 
                              borderRadius: '8px', 
                              border: '1px solid rgba(255,255,255,0.1)', 
                              background: 'rgba(0,0,0,0.2)', 
                              color: 'var(--text-primary)',
                              outline: 'none',
                              transition: 'border-color 0.2s'
                            }}
                            onFocus={e => e.target.style.borderColor = 'var(--accent-blue)'}
                            onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
                          />
                        </div>
                      </div>

                      {filteredShiftUsers.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)', background: 'rgba(255,255,255,0.02)', borderRadius: '8px' }}>
                          {searchTerm ? 'لا توجد نتائج مطابقة للبحث.' : 'لا يوجد موظفين معينين لهذه الوردية حتى الآن.'}
                        </div>
                      ) : (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
                          {filteredShiftUsers.map(user => {
                            const isAdmin = user.role === 'Admin' || user.role === 'SuperAdmin';
                            const isSuperAdmin = user.role === 'SuperAdmin';
                            
                            return (
                              <div key={user.id} style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '1rem',
                                padding: '1rem',
                                background: isAdmin ? 'rgba(59, 130, 246, 0.08)' : 'rgba(255,255,255,0.02)',
                                border: `1px solid ${isAdmin ? 'rgba(59, 130, 246, 0.3)' : 'rgba(255,255,255,0.05)'}`,
                                borderRadius: '8px',
                                transition: 'transform 0.2s',
                                cursor: 'default',
                                gridColumn: isAdmin ? '1 / -1' : 'auto',
                              }}
                              onMouseOver={e => e.currentTarget.style.borderColor = isAdmin ? 'rgba(59, 130, 246, 0.5)' : 'rgba(255,255,255,0.1)'}
                              onMouseOut={e => e.currentTarget.style.borderColor = isAdmin ? 'rgba(59, 130, 246, 0.3)' : 'rgba(255,255,255,0.05)'}
                              >
                                <div style={{ 
                                  width: '45px', 
                                  height: '45px', 
                                  borderRadius: '50%', 
                                  background: isSuperAdmin ? 'linear-gradient(135deg, #f59e0b, #d97706)' : isAdmin ? 'linear-gradient(135deg, #3b82f6, #2563eb)' : 'rgba(249, 115, 22, 0.1)', 
                                  display: 'flex', 
                                  alignItems: 'center', 
                                  justifyContent: 'center', 
                                  color: isAdmin ? '#fff' : 'var(--primary-color)',
                                  boxShadow: isAdmin ? '0 4px 10px rgba(0,0,0,0.2)' : 'none',
                                  border: isAdmin ? 'none' : '2px solid rgba(249, 115, 22, 0.3)'
                                }}>
                                  <AvatarIcon name={user.avatar} size={22} />
                                </div>
                                <div style={{ flex: 1 }}>
                                  <div style={{ fontWeight: 'bold', color: isAdmin ? '#60a5fa' : 'var(--text-primary)', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    {user.fullName}
                                    {isAdmin && <span style={{ fontSize: '0.7rem', padding: '0.2rem 0.5rem', background: 'rgba(255,255,255,0.1)', borderRadius: '4px', color: '#fff' }}>{user.role}</span>}
                                  </div>
                                  <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>{user.jobTitle || 'موظف'}</div>
                                </div>
                                
                                <Link 
                                  to={`/personal-followup/${user.id}`}
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.4rem',
                                    padding: '0.5rem 0.8rem',
                                    background: 'rgba(59, 130, 246, 0.15)',
                                    color: '#60a5fa',
                                    borderRadius: '6px',
                                    textDecoration: 'none',
                                    fontSize: '0.85rem',
                                    fontWeight: 'bold',
                                    transition: 'background 0.2s',
                                  }}
                                  onMouseOver={e => e.currentTarget.style.background = 'rgba(59, 130, 246, 0.25)'}
                                  onMouseOut={e => e.currentTarget.style.background = 'rgba(59, 130, 246, 0.15)'}
                                  title="عرض إحصائيات الموظف"
                                >
                                  <Activity size={16} />
                                  متابعة
                                </Link>
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

      </div>

      {/* Create/Edit Shift Modal */}
      {isFormModalOpen && (
        <div className="modal-overlay" onClick={() => resetForm()}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '650px', width: '90%' }}>
            <div className="modal-header" style={{ paddingBottom: '1rem', marginBottom: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
              <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0, fontSize: '1.4rem' }}>
                <Plus size={24} />
                {editingShiftId ? 'تعديل الوردية' : 'إضافة وردية جديدة'}
              </h2>
              <button className="close-btn" type="button" onClick={() => resetForm()}>&times;</button>
            </div>
            <div className="modal-body">
              <form onSubmit={handleSubmitShift}>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.5rem' }}>
                  <div className="form-group" style={{ flex: '1 1 100%' }}>
                    <label style={{ color: 'var(--text-secondary)' }}>اسم الوردية</label>
                    <input
                      type="text"
                      value={shiftForm.name}
                      onChange={(e) => setShiftForm({...shiftForm, name: e.target.value})}
                      placeholder="مثال: الوردية الصباحية"
                      required
                      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', padding: '1rem', borderRadius: '8px' }}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.5rem', marginTop: '1rem' }}>
                  <div className="form-group" style={{ flex: '1 1 200px' }}>
                    <label style={{ color: 'var(--text-secondary)' }}>وقت البدء (من)</label>
                    <div style={{ position: 'relative' }}>
                      <Clock size={18} style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)', pointerEvents: 'none' }} />
                      <input
                        type="time"
                        value={shiftForm.startTime}
                        onChange={(e) => setShiftForm({...shiftForm, startTime: e.target.value})}
                        required
                        style={{ width: '100%', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', padding: '1rem 3rem 1rem 1rem', borderRadius: '8px' }}
                      />
                    </div>
                  </div>
                  <div className="form-group" style={{ flex: '1 1 200px' }}>
                    <label style={{ color: 'var(--text-secondary)' }}>وقت الانتهاء (إلى)</label>
                    <div style={{ position: 'relative' }}>
                      <Clock size={18} style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)', pointerEvents: 'none' }} />
                      <input
                        type="time"
                        value={shiftForm.endTime}
                        onChange={(e) => setShiftForm({...shiftForm, endTime: e.target.value})}
                        required
                        style={{ width: '100%', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', padding: '1rem 3rem 1rem 1rem', borderRadius: '8px' }}
                      />
                    </div>
                  </div>
                </div>

                <div className="form-group" style={{ marginTop: '1.5rem' }}>
                  <label style={{ color: 'var(--text-secondary)', marginBottom: '0.8rem' }}>أيام العمل الخاصة بالوردية</label>
                  <div style={{ display: 'flex', gap: '0.8rem', flexWrap: 'wrap', justifyContent: 'flex-start' }}>
                    {DAYS_OF_WEEK.map(day => {
                      const isSelected = shiftForm.workingDays.includes(day.id);
                      return (
                        <button
                          key={day.id}
                          type="button"
                          onClick={() => handleDayToggle(day.id)}
                          style={{
                            background: isSelected ? 'rgba(255,255,255,0.08)' : 'transparent',
                            color: isSelected ? '#fff' : 'var(--text-secondary)',
                            border: `1px solid rgba(255,255,255,0.1)`,
                            padding: '0.8rem 1.2rem',
                            borderRadius: '12px',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            minWidth: '70px'
                          }}
                        >
                          {day.label}
                        </button>
                      )
                    })}
                  </div>
                </div>

                <div className="form-group" style={{ marginTop: '2rem', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '1.5rem' }}>
                  <label style={{ color: 'var(--text-secondary)', marginBottom: '1rem', fontSize: '1.1rem', fontWeight: 'bold' }}>نظام الإجازات الخاص بالوردية</label>
                  <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      onClick={() => setShiftForm({...shiftForm, dayOffType: 'Fixed'})}
                      style={{
                        flex: 1,
                        padding: '1rem',
                        background: shiftForm.dayOffType === 'Fixed' ? 'rgba(59, 130, 246, 0.15)' : 'rgba(255, 255, 255, 0.03)',
                        border: `1px solid ${shiftForm.dayOffType === 'Fixed' ? '#3b82f6' : 'rgba(255,255,255,0.1)'}`,
                        borderRadius: '12px',
                        color: shiftForm.dayOffType === 'Fixed' ? '#60a5fa' : 'var(--text-secondary)',
                        cursor: 'pointer',
                        transition: 'all 0.3s',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.8rem',
                        fontWeight: 'bold',
                        fontSize: '1.05rem'
                      }}
                    >
                      <div style={{ 
                        width: '20px', 
                        height: '20px', 
                        borderRadius: '50%', 
                        border: `2px solid ${shiftForm.dayOffType === 'Fixed' ? '#3b82f6' : 'rgba(255,255,255,0.3)'}`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        {shiftForm.dayOffType === 'Fixed' && <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#3b82f6' }}></div>}
                      </div>
                      أيام ثابتة
                    </button>
                    <button
                      type="button"
                      onClick={() => setShiftForm({...shiftForm, dayOffType: 'Variable'})}
                      style={{
                        flex: 1,
                        padding: '1rem',
                        background: shiftForm.dayOffType === 'Variable' ? 'rgba(59, 130, 246, 0.15)' : 'rgba(255, 255, 255, 0.03)',
                        border: `1px solid ${shiftForm.dayOffType === 'Variable' ? '#3b82f6' : 'rgba(255,255,255,0.1)'}`,
                        borderRadius: '12px',
                        color: shiftForm.dayOffType === 'Variable' ? '#60a5fa' : 'var(--text-secondary)',
                        cursor: 'pointer',
                        transition: 'all 0.3s',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.8rem',
                        fontWeight: 'bold',
                        fontSize: '1.05rem'
                      }}
                    >
                      <div style={{ 
                        width: '20px', 
                        height: '20px', 
                        borderRadius: '50%', 
                        border: `2px solid ${shiftForm.dayOffType === 'Variable' ? '#3b82f6' : 'rgba(255,255,255,0.3)'}`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        {shiftForm.dayOffType === 'Variable' && <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#3b82f6' }}></div>}
                      </div>
                      متغيرة (أيام شهرياً)
                    </button>
                  </div>

                  {shiftForm.dayOffType === 'Fixed' && (
                    <div style={{ background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                      <label style={{ color: 'var(--text-secondary)', marginBottom: '0.8rem', display: 'block' }}>اختر أيام الإجازة الثابتة</label>
                      <div style={{ display: 'flex', gap: '0.8rem', flexWrap: 'wrap', justifyContent: 'flex-start' }}>
                        {DAYS_OF_WEEK.map(day => {
                          const isSelected = shiftForm.fixedDaysOff.includes(day.id);
                          return (
                            <button
                              key={`fixed-${day.id}`}
                              type="button"
                              onClick={() => handleFixedDayOffToggle(day.id)}
                              style={{
                                background: isSelected ? 'rgba(239, 68, 68, 0.15)' : 'transparent',
                                color: isSelected ? '#ef4444' : 'var(--text-secondary)',
                                border: `1px solid ${isSelected ? '#ef4444' : 'rgba(255,255,255,0.1)'}`,
                                padding: '0.6rem 1rem',
                                borderRadius: '8px',
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                                minWidth: '70px'
                              }}
                            >
                              {day.label}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {shiftForm.dayOffType === 'Variable' && (
                    <div style={{ background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                      <label style={{ color: 'var(--text-secondary)', marginBottom: '0.8rem', display: 'block' }}>عدد الأيام المسموح بها في الشهر</label>
                      <input
                        type="number"
                        min="0"
                        max="31"
                        value={shiftForm.variableDaysOffCount}
                        onChange={(e) => setShiftForm({...shiftForm, variableDaysOffCount: parseInt(e.target.value) || 0})}
                        style={{ 
                          width: '100px', 
                          background: 'rgba(255,255,255,0.03)', 
                          border: '1px solid rgba(255,255,255,0.1)', 
                          padding: '0.8rem', 
                          borderRadius: '8px',
                          color: '#fff',
                          fontSize: '1.1rem',
                          textAlign: 'center'
                        }}
                      />
                    </div>
                  )}
                </div>

                <div className="form-actions" style={{ justifyContent: 'flex-end', marginTop: '2.5rem', gap: '1rem', display: 'flex' }}>
                  <button type="submit" className="btn-save" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '0.8rem 2rem', background: '#fff', color: '#000', borderRadius: '12px' }}>
                    <span style={{ fontWeight: 'bold' }}>{editingShiftId ? 'حفظ التعديلات' : 'إنشاء الوردية'}</span>
                    <Save size={18} />
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Assign Users Modal */}
      {isModalOpen && selectedShift && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '600px', width: '90%' }}>
            <div className="modal-header">
              <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Users size={24} className="text-blue" />
                تعيين موظفين لـ "{selectedShift.name}"
              </h2>
              <button className="close-btn" onClick={() => setIsModalOpen(false)}>&times;</button>
            </div>
            <div className="modal-body">
              <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem', fontSize: '0.9rem' }}>
                اختر الموظفين الذين تود ربطهم بهذه الوردية. يمكن للموظف الواحد الانتماء لعدة ورديات لتغطية أيام مختلفة.
              </p>
              
              <div className="search-box" style={{ marginBottom: '1.5rem', position: 'relative' }}>
                <Search size={18} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)', pointerEvents: 'none' }} />
                <input
                  type="text"
                  placeholder="ابحث عن موظف لتعيينه..."
                  value={modalSearchTerm}
                  onChange={(e) => setModalSearchTerm(e.target.value)}
                  style={{ 
                    width: '100%', 
                    padding: '0.8rem 2.5rem 0.8rem 1rem', 
                    borderRadius: '8px', 
                    border: '1px solid rgba(255,255,255,0.1)', 
                    background: 'rgba(0,0,0,0.2)', 
                    color: 'var(--text-primary)',
                    outline: 'none',
                    transition: 'border-color 0.2s'
                  }}
                  onFocus={e => e.target.style.borderColor = 'var(--accent-blue)'}
                  onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
                />
              </div>

              <div style={{ maxHeight: '350px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem', paddingRight: '0.5rem' }}>
                {filteredModalUsers.map(user => {
                  const isAssigned = selectedUserIds.includes(user.id);
                  return (
                    <div 
                      key={user.id} 
                      onClick={() => handleUserToggle(user.id)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '0.8rem 1rem',
                        background: isAssigned ? 'rgba(59, 130, 246, 0.1)' : 'rgba(255,255,255,0.03)',
                        border: `1px solid ${isAssigned ? 'rgba(59, 130, 246, 0.3)' : 'rgba(255,255,255,0.05)'}`,
                        borderRadius: '8px',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>
                          {React.createElement(avatarMap[user.avatar] || UserIcon, { size: 18 })}
                        </div>
                        <div>
                          <div style={{ fontWeight: 'bold', color: isAssigned ? 'var(--text-primary)' : 'var(--text-secondary)' }}>{user.fullName}</div>
                          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{user.jobTitle || 'موظف'}</div>
                        </div>
                      </div>
                      <div style={{ 
                        width: '22px', 
                        height: '22px', 
                        borderRadius: '6px', 
                        border: `2px solid ${isAssigned ? 'var(--accent-blue)' : 'rgba(255,255,255,0.3)'}`,
                        background: isAssigned ? 'var(--accent-blue)' : 'transparent',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'all 0.2s'
                      }}>
                        {isAssigned && <Check size={14} color="#fff" strokeWidth={3} />}
                      </div>
                    </div>
                  )
                })}
                {filteredModalUsers.length === 0 && (
                  <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
                    {modalSearchTerm ? 'لا توجد نتائج مطابقة.' : 'لا يوجد موظفين متاحين.'}
                  </div>
                )}
              </div>

              <div className="modal-actions" style={{ marginTop: '2rem', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                <button type="button" onClick={() => setIsModalOpen(false)} style={{ flex: '1 1 120px', padding: '0.8rem', borderRadius: '8px', background: 'transparent', border: '1px solid rgba(255,255,255,0.2)', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                  إلغاء
                </button>
                <button type="button" className="btn-save" style={{ flex: '2 1 200px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }} onClick={handleAssignSubmit}>
                  <Save size={18} />
                  حفظ التعيينات ({selectedUserIds.length})
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toast.show && (
        <div className={`toast-notification ${toast.type === 'error' ? 'toast-error' : 'toast-success'}`} style={{ backgroundColor: toast.type === 'error' ? '#ef4444' : undefined }}>
          {toast.type === 'error' ? <TriangleAlert size={20} /> : <Check size={20} />}
          <span>{toast.message}</span>
        </div>
      )}
    </div>
  );
};

export default ShiftManagement;
