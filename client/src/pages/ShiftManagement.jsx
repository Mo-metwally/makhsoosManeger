import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Clock, Plus, Users, Trash2, Calendar, Check, Save, TriangleAlert, Search, User as UserIcon, Edit, ShieldCheck, Crown, Shield, Cat, Star, Smile, Briefcase, Flame, Zap, Heart, Moon, Activity, DollarSign } from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import "./Account.scss"; // Reuse form styles

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
  const { user: currentUser } = useAuth();
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
    variableDaysOffCount: 0,
    baseSalary: ''
  });
  const [editingShiftId, setEditingShiftId] = useState(null);

  // Modal State
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedShift, setSelectedShift] = useState(null);
  const [selectedUserIds, setSelectedUserIds] = useState([]);
  const [observerUserIds, setObserverUserIds] = useState([]);
  const [modalSearchTerm, setModalSearchTerm] = useState('');

  // Salary Modal State
  const [salaryModal, setSalaryModal] = useState({ show: false, userId: null, userName: '', baseSalary: '' });
  const [selectedSalary, setSelectedSalary] = useState('');
  const [modalScheduleFilter, setModalScheduleFilter] = useState('All');

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

  const handleSalarySubmit = async (e) => {
    e.preventDefault();
    try {
      await api.put(`/admin/users/${salaryModal.userId}`, {
        baseSalary: selectedSalary
      });
      fetchShifts();
      fetchAllUsers();
      setSalaryModal({ show: false, userId: null, userName: '', baseSalary: '' });
      setSelectedSalary('');
    } catch (err) {
      console.error('Error updating salary:', err);
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
      variableDaysOffCount: 0,
      baseSalary: ''
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
      variableDaysOffCount: shift.variableDaysOffCount || 0,
      baseSalary: shift.baseSalary || ''
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
    const existingObservers = shift.Users ? shift.Users.filter(u => u.UserShift && u.UserShift.isObserver).map(u => u.id) : [];
    setSelectedUserIds(existingIds);
    setObserverUserIds(existingObservers);
    setModalSearchTerm('');
    setIsModalOpen(true);
  };

  const handleUserToggle = (userId) => {
    setSelectedUserIds(prev => {
      if (prev.includes(userId)) return prev.filter(id => id !== userId);
      return [...prev, userId];
    });
  };

  const handleObserverToggle = (e, userId) => {
    e.stopPropagation();
    setObserverUserIds(prev => {
      if (prev.includes(userId)) return prev.filter(id => id !== userId);
      return [...prev, userId];
    });
  };

  const handleAssignSubmit = async () => {
    try {
      const usersData = selectedUserIds.map(id => ({
        id,
        isObserver: observerUserIds.includes(id)
      }));
      await api.put(`/shifts/${selectedShift.id}/assign`, { usersData, userIds: selectedUserIds });
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
  const filteredModalUsers = allUsers.filter(user => {
    const matchesSearch = user.fullName.toLowerCase().includes(modalSearchTerm.toLowerCase()) ||
      (user.jobTitle && user.jobTitle.toLowerCase().includes(modalSearchTerm.toLowerCase()));

    let matchesSchedule = true;
    if (modalScheduleFilter === 'Scheduled') {
      matchesSchedule = user.Shifts && user.Shifts.length > 0;
    } else if (modalScheduleFilter === 'Unscheduled') {
      matchesSchedule = !user.Shifts || user.Shifts.length === 0;
    }

    return matchesSearch && matchesSchedule;
  });

  return (
    <div className="account-container">
      <header className="page-header">
        <div className="page-title-wrapper">
          <Clock size={28} className="title-icon text-blue" />
          <h1 className="page-title gradient-title">تنظيم الورديات</h1>
        </div>
      </header>

      <div className="account-content shiftmanagement-style-1" >

        {/* Section: Advanced List of Shifts */}
        <div className="shifts-list-section">
          <div className="shiftmanagement-style-2">
            <h2 className="shiftmanagement-style-3">
              <Calendar size={24} className="text-blue" />
              إدارة الورديات وتفاصيل الموظفين
            </h2>
            <button
              className="btn-save shiftmanagement-style-4"
              onClick={() => setIsFormModalOpen(true)}
              
            >
              <span className="shiftmanagement-style-5">إضافة وردية جديدة</span>
              <Plus size={20} />
            </button>
          </div>

          {shifts.length === 0 ? (
            <div className="shiftmanagement-style-6">
              لا توجد ورديات مُسجلة حالياً. قم بإنشاء أول وردية من النموذج أعلاه.
            </div>
          ) : (
            <div className="shiftmanagement-style-7">
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

                // Calculate salary stats for SuperAdmin
                const baseShiftSalary = shift.baseSalary || 0;
                const actualSalaries = shiftUsers.map(u => Number(u.baseSalary) > 0 ? Number(u.baseSalary) : Number(baseShiftSalary));
                const allSalaries = actualSalaries.length > 0 ? actualSalaries : [Number(baseShiftSalary)];
                const minSalary = Math.min(...allSalaries);
                const maxSalary = Math.max(...allSalaries);
                const hasVariableSalaries = minSalary !== maxSalary;

                return (
                  <div key={shift.id} className="account-card shiftmanagement-style-8" >
                    {/* Shift Header */}
                    <div className="shiftmanagement-style-9">
                      <div>
                        <h3 className="shiftmanagement-style-10">{shift.name}</h3>
                        <div className="shiftmanagement-style-11">
                          <span className="shiftmanagement-style-12">
                            <Clock size={16} className="text-blue" />
                            {shift.startTime} - {shift.endTime}
                          </span>
                          <span className="shiftmanagement-style-13">
                            <Calendar size={16} className="text-blue" />
                            {shift.workingDays.map(dId => DAYS_OF_WEEK.find(d => d.id === dId)?.label).join('، ')}
                          </span>
                          <span className="shiftmanagement-style-14">
                            <Users size={16} className="text-blue" />
                            {shiftUsers.length} موظف
                          </span>
                        </div>
                        <div className="shiftmanagement-style-15">
                          <span className="shiftmanagement-style-16">
                            <strong>نظام الإجازات:</strong>
                            {shift.dayOffType === 'Fixed' ? 'ثابت' : 'متغير'}
                          </span>
                          {shift.dayOffType === 'Fixed' ? (
                            <span className="shiftmanagement-style-17">
                              <strong>أيام الإجازة:</strong>
                              {(shift.fixedDaysOff || []).map(dId => DAYS_OF_WEEK.find(d => d.id === dId)?.label).join('، ') || 'لا يوجد'}
                            </span>
                          ) : (
                            <span className="shiftmanagement-style-18">
                              <strong>الأيام المسموحة شهرياً:</strong>
                              {shift.variableDaysOffCount || 0} أيام
                            </span>
                          )}
                        </div>
                        {currentUser?.role === 'SuperAdmin' && (
                          <div className="shiftmanagement-style-19">
                            <h4 className="shiftmanagement-style-20">
                              <DollarSign size={16} /> بيانات الراتب
                            </h4>
                            {hasVariableSalaries ? (
                              <div className="shiftmanagement-style-21">
                                <span className="shiftmanagement-style-22"><strong>أقل راتب:</strong> {minSalary}</span>
                                <span className="shiftmanagement-style-23"><strong>أعلى راتب:</strong> {maxSalary}</span>
                              </div>
                            ) : (
                              <div className="shiftmanagement-style-24">
                                <span className="shiftmanagement-style-25"><strong>الراتب الموحد:</strong> {baseShiftSalary}</span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                      <div className="shiftmanagement-style-26">
                        <button
                          onClick={() => handleEditShift(shift)}
                          className="shiftmanagement-style-27"
                          onMouseOver={e => e.currentTarget.style.background = 'rgba(59, 130, 246, 0.2)'}
                          onMouseOut={e => e.currentTarget.style.background = 'rgba(59, 130, 246, 0.1)'}
                        >
                          <Edit size={16} /> تعديل الوردية
                        </button>
                        <button
                          onClick={() => openAssignModal(shift)}
                          className="btn-save shiftmanagement-style-28"
                          
                        >
                          <Users size={16} /> إدارة الموظفين
                        </button>
                        <button
                          onClick={() => handleDeleteShift(shift.id)}
                          className="shiftmanagement-style-29"
                          onMouseOver={e => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)'}
                          onMouseOut={e => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'}
                        >
                          <Trash2 size={16} /> حذف
                        </button>
                      </div>
                    </div>

                    {/* Shift Employees Area */}
                    <div className="shiftmanagement-style-30">
                      <div className="shiftmanagement-style-31">
                        <h4 className="shiftmanagement-style-32">موظفو الوردية</h4>

                        <div className="search-box shiftmanagement-style-33" >
                          <Search size={18} className="shiftmanagement-style-34" />
                          <input
                            type="text"
                            placeholder="ابحث عن موظف في هذه الوردية..."
                            value={searchTerm}
                            onChange={(e) => handleShiftSearchChange(shift.id, e.target.value)}
                            className="shiftmanagement-style-35"
                            onFocus={e => e.target.style.borderColor = 'var(--accent-blue)'}
                            onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
                          />
                        </div>
                      </div>

                      {filteredShiftUsers.length === 0 ? (
                        <div className="shiftmanagement-style-36">
                          {searchTerm ? 'لا توجد نتائج مطابقة للبحث.' : 'لا يوجد موظفين معينين لهذه الوردية حتى الآن.'}
                        </div>
                      ) : (
                        <div className="shiftmanagement-style-37">
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
                                <div className="shiftmanagement-style-38">
                                  <div style={{ fontWeight: 'bold', color: isAdmin ? '#60a5fa' : 'var(--text-primary)', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    {user.fullName}
                                    {isAdmin && <span className="shiftmanagement-style-39">{user.role}</span>}
                                  </div>
                                  <div className="shiftmanagement-style-40" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span>{user.jobTitle || 'موظف'}</span>
                                    {isAdmin && (
                                      user.UserShift?.isObserver ? (
                                        <span style={{ fontSize: '0.75rem', backgroundColor: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold' }}>
                                          مراقب فقط (بدون حضور)
                                        </span>
                                      ) : (
                                        <span style={{ fontSize: '0.75rem', backgroundColor: 'rgba(16, 185, 129, 0.1)', color: '#10b981', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold' }}>
                                          مطلوب تسجيل حضور
                                        </span>
                                      )
                                    )}
                                  </div>
                                </div>

                                <div className="shiftmanagement-style-41">
                                  {currentUser?.role === 'SuperAdmin' && (
                                    <button
                                      onClick={() => {
                                        setSalaryModal({ show: true, userId: user.id, userName: user.fullName, baseSalary: user.baseSalary || shift.baseSalary || '' });
                                        setSelectedSalary(user.baseSalary || shift.baseSalary || '');
                                      }}
                                      className="shiftmanagement-style-42"
                                      onMouseOver={e => e.currentTarget.style.background = 'rgba(34, 197, 94, 0.2)'}
                                      onMouseOut={e => e.currentTarget.style.background = 'rgba(34, 197, 94, 0.1)'}
                                      title="تعديل الراتب الخاص"
                                    >
                                      <DollarSign size={16} />
                                      تعديل الراتب
                                    </button>
                                  )}
                                  <Link
                                    to={`/personal-followup/${user.id}`}
                                    className="shiftmanagement-style-43"
                                    onMouseOver={e => e.currentTarget.style.background = 'rgba(59, 130, 246, 0.25)'}
                                    onMouseOut={e => e.currentTarget.style.background = 'rgba(59, 130, 246, 0.15)'}
                                    title="عرض إحصائيات الموظف"
                                  >
                                    <Activity size={16} />
                                    متابعة
                                  </Link>
                                </div>
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

      {/* Salary Edit Modal */}
      {salaryModal.show && (
        <div className="modal-overlay active" onClick={() => setSalaryModal({ show: false, userId: null, userName: '', baseSalary: '' })}>
          <div className="modal-content shiftmanagement-style-44" onClick={e => e.stopPropagation()} >
            <div className="modal-header shiftmanagement-style-45" >
              <h2 className="shiftmanagement-style-46">
                <DollarSign size={20} />
                تعديل الراتب
              </h2>
              <button className="close-btn" type="button" onClick={() => setSalaryModal({ show: false, userId: null, userName: '', baseSalary: '' })}>&times;</button>
            </div>
            <div className="modal-body">
              <p className="shiftmanagement-style-47">
                تعديل الراتب الخاص للموظف: <strong>{salaryModal.userName}</strong>
              </p>
              <form onSubmit={handleSalarySubmit}>
                <div className="form-group shiftmanagement-style-48" >
                  <label className="shiftmanagement-style-49">الراتب الشهري</label>
                  <input
                    type="number"
                    min="0"
                    value={selectedSalary}
                    onChange={(e) => setSelectedSalary(e.target.value)}
                    required
                    className="shiftmanagement-style-50"
                  />
                </div>
                <div className="shiftmanagement-style-51">
                  <button type="button" onClick={() => setSalaryModal({ show: false, userId: null, userName: '', baseSalary: '' })} className="shiftmanagement-style-52">
                    إلغاء
                  </button>
                  <button type="submit" className="shiftmanagement-style-53">
                    حفظ الراتب
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Create/Edit Shift Modal */}
      {isFormModalOpen && (
        <div className="modal-overlay active" onClick={() => resetForm()}>
          <div className="modal-content shiftmanagement-style-54" onClick={e => e.stopPropagation()} >
            <div className="modal-header shiftmanagement-style-55" >
              <h2 className="shiftmanagement-style-56">
                <Plus size={24} />
                {editingShiftId ? 'تعديل الوردية' : 'إضافة وردية جديدة'}
              </h2>
              <button className="close-btn" type="button" onClick={() => resetForm()}>&times;</button>
            </div>
            <div className="modal-body">
              <form onSubmit={handleSubmitShift}>
                <div className="shiftmanagement-style-57">
                  <div className="form-group shiftmanagement-style-58" >
                    <label className="shiftmanagement-style-59">اسم الوردية</label>
                    <input
                      type="text"
                      value={shiftForm.name}
                      onChange={(e) => setShiftForm({ ...shiftForm, name: e.target.value })}
                      placeholder="مثال: الوردية الصباحية"
                      required
                      className="shiftmanagement-style-60"
                    />
                  </div>

                  <div className="form-group shiftmanagement-style-61" >
                    <label className="shiftmanagement-style-62">الراتب الشهري (لكل موظف في الوردية)</label>
                    <input
                      type="number"
                      min="0"
                      value={shiftForm.baseSalary}
                      onChange={(e) => setShiftForm({ ...shiftForm, baseSalary: e.target.value })}
                      placeholder="مثال: 5000"
                      className="shiftmanagement-style-63"
                    />
                  </div>
                </div>

                <div className="shiftmanagement-style-64">
                  <div className="form-group shiftmanagement-style-65" >
                    <label className="shiftmanagement-style-66">وقت البدء (من)</label>
                    <div className="shiftmanagement-style-67">
                      <Clock size={18} className="shiftmanagement-style-68" />
                      <input
                        type="time"
                        value={shiftForm.startTime}
                        onChange={(e) => setShiftForm({ ...shiftForm, startTime: e.target.value })}
                        required
                        className="shiftmanagement-style-69"
                      />
                    </div>
                  </div>
                  <div className="form-group shiftmanagement-style-70" >
                    <label className="shiftmanagement-style-71">وقت الانتهاء (إلى)</label>
                    <div className="shiftmanagement-style-72">
                      <Clock size={18} className="shiftmanagement-style-73" />
                      <input
                        type="time"
                        value={shiftForm.endTime}
                        onChange={(e) => setShiftForm({ ...shiftForm, endTime: e.target.value })}
                        required
                        className="shiftmanagement-style-74"
                      />
                    </div>
                  </div>
                </div>

                <div className="form-group shiftmanagement-style-75" >
                  <label className="shiftmanagement-style-76">أيام العمل الخاصة بالوردية</label>
                  <div className="shiftmanagement-style-77">
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

                <div className="form-group shiftmanagement-style-78" >
                  <label className="shiftmanagement-style-79">نظام الإجازات الخاص بالوردية</label>
                  <div className="shiftmanagement-style-80">
                    <button
                      type="button"
                      onClick={() => setShiftForm({ ...shiftForm, dayOffType: 'Fixed' })}
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
                        {shiftForm.dayOffType === 'Fixed' && <div className="shiftmanagement-style-81"></div>}
                      </div>
                      أيام ثابتة
                    </button>
                    <button
                      type="button"
                      onClick={() => setShiftForm({ ...shiftForm, dayOffType: 'Variable' })}
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
                        {shiftForm.dayOffType === 'Variable' && <div className="shiftmanagement-style-82"></div>}
                      </div>
                      متغيرة (أيام شهرياً)
                    </button>
                  </div>

                  {shiftForm.dayOffType === 'Fixed' && (
                    <div className="shiftmanagement-style-83">
                      <label className="shiftmanagement-style-84">اختر أيام الإجازة الثابتة</label>
                      <div className="shiftmanagement-style-85">
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
                    <div className="shiftmanagement-style-86">
                      <label className="shiftmanagement-style-87">عدد الأيام المسموح بها في الشهر</label>
                      <input
                        type="number"
                        min="0"
                        max="31"
                        value={shiftForm.variableDaysOffCount}
                        onChange={(e) => setShiftForm({ ...shiftForm, variableDaysOffCount: parseInt(e.target.value) || 0 })}
                        className="shiftmanagement-style-88"
                      />
                    </div>
                  )}
                </div>

                <div className="form-actions shiftmanagement-style-89" >
                  <button type="submit" className="btn-save shiftmanagement-style-90" >
                    <span className="shiftmanagement-style-91">{editingShiftId ? 'حفظ التعديلات' : 'إنشاء الوردية'}</span>
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
        <div className="modal-overlay active" onClick={() => setIsModalOpen(false)}>
          <div className="modal-content shiftmanagement-style-92" onClick={e => e.stopPropagation()} >
            <div className="modal-header">
              <h2 className="shiftmanagement-style-93">
                <Users size={24} className="text-blue" />
                تعيين موظفين لـ "{selectedShift.name}"
              </h2>
              <button className="close-btn" onClick={() => setIsModalOpen(false)}>&times;</button>
            </div>
            <div className="modal-body">
              <p className="shiftmanagement-style-94">
                اختر الموظفين الذين تود ربطهم بهذه الوردية. يمكن للموظف الواحد الانتماء لعدة ورديات لتغطية أيام مختلفة.
              </p>

              <div className="shiftmanagement-style-95">
                {['All', 'Scheduled', 'Unscheduled'].map((val) => {
                  const labelMap = { All: 'الكل', Scheduled: 'مجدول', Unscheduled: 'غير مجدول' };
                  const isChecked = modalScheduleFilter === val;
                  return (
                    <label
                      key={val}
                      style={{
                        flex: 1,
                        textAlign: 'center',
                        padding: '0.6rem',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        fontSize: '0.9rem',
                        fontWeight: 'bold',
                        transition: 'all 0.3s ease',
                        background: isChecked ? 'var(--theme-glow)' : 'transparent',
                        color: isChecked ? '#fff' : 'var(--text-secondary)',
                        boxShadow: isChecked ? '0 4px 12px rgba(59, 130, 246, 0.4)' : 'none'
                      }}
                    >
                      <input
                        type="radio"
                        name="modalScheduleFilter"
                        value={val}
                        checked={isChecked}
                        onChange={() => setModalScheduleFilter(val)}
                        className="shiftmanagement-style-96"
                      />
                      {labelMap[val]}
                    </label>
                  );
                })}
              </div>

              <div className="search-box shiftmanagement-style-97" >
                <Search size={18} className="shiftmanagement-style-98" />
                <input
                  type="text"
                  placeholder="ابحث عن موظف لتعيينه..."
                  value={modalSearchTerm}
                  onChange={(e) => setModalSearchTerm(e.target.value)}
                  className="shiftmanagement-style-99"
                  onFocus={e => e.target.style.borderColor = 'var(--accent-blue)'}
                  onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
                />
              </div>

              <div className="shiftmanagement-style-100">
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
                      <div className="shiftmanagement-style-101">
                        <div className="shiftmanagement-style-102">
                          <AvatarIcon name={user.avatar || 'User'} size={18} />
                        </div>
                        <div>
                          <div style={{ fontWeight: 'bold', color: isAssigned ? 'var(--text-primary)' : 'var(--text-secondary)' }}>{user.fullName}</div>
                          <div className="shiftmanagement-style-103">
                            {user.Shifts && user.Shifts.length > 0
                              ? user.Shifts.map(s => `${s.name} (${s.startTime} - ${s.endTime})`).join('، ')
                              : 'غير مجدول'}
                          </div>
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        {isAssigned && (user.role === 'Admin' || user.role === 'SuperAdmin') && (
                          <div 
                            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                            onClick={(e) => handleObserverToggle(e, user.id)}
                          >
                            <div style={{
                              width: '18px',
                              height: '18px',
                              borderRadius: '4px',
                              border: `2px solid ${observerUserIds.includes(user.id) ? '#f59e0b' : 'rgba(255,255,255,0.3)'}`,
                              background: observerUserIds.includes(user.id) ? '#f59e0b' : 'transparent',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              transition: 'all 0.2s'
                            }}>
                              {observerUserIds.includes(user.id) && <Check size={12} color="#fff" strokeWidth={3} />}
                            </div>
                            <span style={{ fontSize: '0.8rem', color: observerUserIds.includes(user.id) ? '#f59e0b' : 'var(--text-secondary)' }}>
                              مشرف (بدون حضور)
                            </span>
                          </div>
                        )}
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
                    </div>
                  )
                })}
                {filteredModalUsers.length === 0 && (
                  <div className="shiftmanagement-style-104">
                    {modalSearchTerm ? 'لا توجد نتائج مطابقة.' : 'لا يوجد موظفين متاحين.'}
                  </div>
                )}
              </div>

              <div className="modal-actions shiftmanagement-style-105" >
                <button type="button" onClick={() => setIsModalOpen(false)} className="shiftmanagement-style-106">
                  إلغاء
                </button>
                <button type="button" className="btn-save shiftmanagement-style-107"  onClick={handleAssignSubmit}>
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
