import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Loader, ShieldAlert, CheckCircle, XCircle, Clock, CalendarRange, HelpCircle, Activity, Edit2, Shield, Cat, Crown, Star, Smile, Briefcase, Flame, Zap, Heart, Moon, User, RefreshCw, LogIn, LogOut, UserX, CalendarOff, AlertTriangle, Plane, Info } from 'lucide-react';
import api from '../services/api';
import AvatarIcon from '../components/AvatarIcon';
import "./TodayFollowup.scss";
import { useToast } from '../contexts/ToastContext';
import { useAuth } from '../context/AuthContext';

const TodayFollowup = () => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [employees, setEmployees] = useState([]);
  const [adminShifts, setAdminShifts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('All'); // All, Present, Absent, DayOff, Pending
  const [shiftFilter, setShiftFilter] = useState('All'); // 'All' or shift name

  // Modal states
  const [selectedEmp, setSelectedEmp] = useState(null);
  const [action, setAction] = useState('CheckIn');
  const [notes, setNotes] = useState('');
  const [isEarlyCheckout, setIsEarlyCheckout] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [expandedRowId, setExpandedRowId] = useState(null);

  useEffect(() => {
    document.title = "متابعة اليوم | مخصوص";
    fetchTodayStatus();

    // Refresh every 2 minutes
    const interval = setInterval(() => {
      fetchTodayStatus();
    }, 2 * 60 * 1000);

    return () => clearInterval(interval);
  }, []);

  const fetchTodayStatus = async () => {
    try {
      setLoading(true);
      const response = await api.get('/attendance/today-status');
      setEmployees(response.data.users || []);
      setAdminShifts(response.data.adminShifts || []);
    } catch (err) {
      console.error('Error fetching today status:', err);
      setError('حدث خطأ أثناء جلب حالة الموظفين اليوم. قد لا توجد ورديات مرتبطة بحسابك.');
    } finally {
      setLoading(false);
    }
  };

  const [manualCheckIn, setManualCheckIn] = useState('');
  const [manualCheckOut, setManualCheckOut] = useState('');

  const openModal = (emp) => {
    setSelectedEmp(emp);
    setAction(emp.todayStatus === 'Present' || emp.todayStatus === 'Late' ? 'EditTimes' : 'CheckIn');
    setNotes('');
    setIsEarlyCheckout(false);

    if (emp.checkInTime) {
      const ci = new Date(emp.checkInTime);
      setManualCheckIn(`${ci.getHours().toString().padStart(2, '0')}:${ci.getMinutes().toString().padStart(2, '0')}`);
    } else {
      setManualCheckIn('');
    }

    if (emp.checkOutTime) {
      const co = new Date(emp.checkOutTime);
      setManualCheckOut(`${co.getHours().toString().padStart(2, '0')}:${co.getMinutes().toString().padStart(2, '0')}`);
    } else {
      setManualCheckOut('');
    }
  };

  const closeModal = () => {
    setSelectedEmp(null);
  };

  // Check if it's early checkout when action changes
  useEffect(() => {
    if (action === 'CheckOut' && selectedEmp) {
      const activeShiftName = selectedEmp.shifts[0];
      const shiftObj = adminShifts.find(s => s.name === activeShiftName);
      if (shiftObj && shiftObj.endTime) {
        const now = new Date();
        const currentTime = now.getHours().toString().padStart(2, '0') + ':' + now.getMinutes().toString().padStart(2, '0');
        if (currentTime < shiftObj.endTime) {
          setIsEarlyCheckout(true);
        } else {
          setIsEarlyCheckout(false);
        }
      }
    } else {
      setIsEarlyCheckout(false);
    }
  }, [action, selectedEmp, adminShifts]);

  const handleUpdateStatus = async (e) => {
    e.preventDefault();
    if (isEarlyCheckout && action === 'CheckOut' && !notes.trim()) {
      showToast('يجب كتابة ملاحظة لتوثيق سبب الانصراف المبكر.', 'error');
      return;
    }

    try {
      setUpdating(true);
      
      const createIso = (timeStr) => {
        if (!timeStr) return null;
        const [hours, minutes] = timeStr.split(':').map(Number);
        const d = new Date();
        d.setHours(hours, minutes, 0, 0);
        return d.toISOString();
      };

      await api.post('/attendance/admin/update-status', {
        userId: selectedEmp.id,
        action,
        notes,
        manualCheckInTime: createIso(manualCheckIn),
        manualCheckOutTime: createIso(manualCheckOut)
      });
      showToast('تم تحديث حالة الموظف بنجاح', 'success');
      closeModal();
      fetchTodayStatus();
    } catch (err) {
      console.error('Error updating status:', err);
      showToast(err.response?.data?.error || 'حدث خطأ أثناء التحديث', 'error');
    } finally {
      setUpdating(false);
    }
  };

  const getStatusDetails = (status, shifts = []) => {
    if (shifts.length === 0) {
      return { label: 'بدون وردية', icon: <XCircle size={16} />, className: 'status-absent' };
    }

    switch (status) {
      case 'Present':
      case 'Late': // Treating Late visually as Present/Active in this overview, or we can separate
        return { label: 'نشط', icon: <CheckCircle size={16} />, className: 'status-active' };
      case 'DayOffWork':
        return { label: 'عمل إضافي', icon: <CheckCircle size={16} />, className: 'status-active' };
      case 'Absent':
        return { label: 'غياب', icon: <XCircle size={16} />, className: 'status-absent' };
      case 'BusinessTrip':
        return { label: 'سفر عمل', icon: <Plane size={16} />, className: 'status-businesstrip' };
      case 'DayOff':
        return { label: 'إجازة', icon: <CalendarRange size={16} />, className: 'status-dayoff' };
      case 'بريك صلاة':
        return { label: 'في صلاة', icon: <span className="todayfollowup-style-1">🕋</span>, className: 'status-break-prayer' };
      case 'بريك غداء':
        return { label: 'في غداء', icon: <span className="todayfollowup-style-2">🍔</span>, className: 'status-break-lunch' };
      case 'تدريب':
        return { label: 'في تدريب', icon: <span className="todayfollowup-style-3">📝</span>, className: 'status-break-training' };
      case 'انصراف':
      case 'CheckedOut':
        return { label: 'انصراف', icon: <LogOut size={16} />, className: 'status-checkedout' };
      case 'Pending':
      default:
        return { label: 'خارج الوردية', icon: <Clock size={16} />, className: 'status-pending' };
    }
  };

  const filteredByShift = shiftFilter === 'All'
    ? employees
    : shiftFilter === 'غير مجدول'
      ? employees.filter(emp => !emp.shifts || emp.shifts.length === 0)
      : employees.filter(emp => emp.shifts && emp.shifts.includes(shiftFilter));

  const filteredEmployees = filteredByShift.filter(emp => {
    if (filter === 'All') return emp.role === 'Supervisor';
    if (filter === 'Admins') return emp.role === 'Admin' || emp.role === 'SuperAdmin';

    if (!emp.shifts || emp.shifts.length === 0) return false;

    if (filter === 'Present') return ['Present', 'Late', 'بريك غداء', 'بريك صلاة', 'تدريب', 'CheckedOut', 'انصراف', 'DayOffWork'].includes(emp.todayStatus);
    if (filter === 'CheckedOut') return ['CheckedOut', 'انصراف'].includes(emp.todayStatus);
    return emp.todayStatus === filter;
  });

  const sortedEmployees = [...filteredEmployees].sort((a, b) => {
    const isAAdmin = a.role === 'Admin' || a.role === 'SuperAdmin';
    const isBAdmin = b.role === 'Admin' || b.role === 'SuperAdmin';
    if (isAAdmin && !isBAdmin) return -1;
    if (!isAAdmin && isBAdmin) return 1;
    return 0;
  });

  const stats = {
    total: filteredByShift.filter(e => e.role === 'Supervisor').length,
    active: filteredByShift.filter(e => e.shifts && e.shifts.length > 0 && ['Present', 'Late', 'بريك غداء', 'بريك صلاة', 'تدريب', 'CheckedOut', 'انصراف', 'DayOffWork'].includes(e.todayStatus)).length,
    absent: filteredByShift.filter(e => e.shifts && e.shifts.length > 0 && e.todayStatus === 'Absent').length,
    businesstrip: filteredByShift.filter(e => e.shifts && e.shifts.length > 0 && e.todayStatus === 'BusinessTrip').length,
    dayoff: filteredByShift.filter(e => e.shifts && e.shifts.length > 0 && e.todayStatus === 'DayOff').length,
    pending: filteredByShift.filter(e => e.shifts && e.shifts.length > 0 && e.todayStatus === 'Pending').length,
    checkedout: filteredByShift.filter(e => e.shifts && e.shifts.length > 0 && ['CheckedOut', 'انصراف'].includes(e.todayStatus)).length,
    admins: filteredByShift.filter(e => e.role === 'Admin' || e.role === 'SuperAdmin').length
  };

  if (loading) {
    return (
      <div className="tf-loading">
        <Loader className="spinner" size={40} />
        <p>جاري تحميل بيانات اليوم...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="tf-error">
        <ShieldAlert size={50} />
        <p>{error}</p>
        <button onClick={fetchTodayStatus} className="tf-retry-btn">إعادة المحاولة</button>
      </div>
    );
  }

  return (
    <div className="tf-container fade-in">
      <div className="tf-header">
        <div>
          <div className="todayfollowup-style-4">
            <h1 className="tf-title todayfollowup-style-5" >
              <Activity size={32} className="tf-title-icon" />
              متابعة اليوم
            </h1>
            <button
              onClick={fetchTodayStatus}
              disabled={loading}
              style={{
                background: 'rgba(249, 115, 22, 0.1)',
                color: 'var(--primary-color)',
                border: '1px solid rgba(249, 115, 22, 0.3)',
                borderRadius: '8px',
                padding: '0.4rem 0.8rem',
                cursor: loading ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                transition: 'all 0.3s ease'
              }}
              title="تحديث البيانات"
            >
              <RefreshCw size={18} className={loading ? 'spinner' : ''} />
              <span className="todayfollowup-style-6">تحديث</span>
            </button>
          </div>
          <p className="tf-subtitle todayfollowup-style-7" >متابعة حالة الموظفين التابعين لك لليوم الحالي</p>
          {adminShifts.length > 0 && (
            <div className="tf-shifts-info todayfollowup-style-8" >
              <span
                onClick={() => setShiftFilter('All')}
                style={{
                  background: shiftFilter === 'All' ? 'var(--theme-glow)' : 'rgba(249, 115, 22, 0.1)',
                  color: shiftFilter === 'All' ? '#fff' : 'var(--theme-glow)',
                  padding: '0.4rem 1rem',
                  borderRadius: '20px',
                  fontSize: '0.9rem',
                  border: '1px solid rgba(249, 115, 22, 0.3)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease'
                }}
              >
                جميع الورديات
              </span>
              <span
                onClick={() => setShiftFilter('غير مجدول')}
                style={{
                  background: shiftFilter === 'غير مجدول' ? 'var(--primary-color)' : 'rgba(249, 115, 22, 0.1)',
                  color: shiftFilter === 'غير مجدول' ? '#fff' : 'var(--primary-color)',
                  padding: '0.4rem 1rem',
                  borderRadius: '20px',
                  fontSize: '0.9rem',
                  border: '1px solid rgba(249, 115, 22, 0.3)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease'
                }}
              >
                غير مجدول
              </span>
              {adminShifts.map((shift, idx) => (
                <span
                  key={idx}
                  onClick={() => setShiftFilter(shift.name)}
                  style={{
                    background: shiftFilter === shift.name ? 'var(--primary-color)' : 'rgba(249, 115, 22, 0.1)',
                    color: shiftFilter === shift.name ? '#fff' : 'var(--primary-color)',
                    padding: '0.4rem 1rem',
                    borderRadius: '20px',
                    fontSize: '0.9rem',
                    border: '1px solid rgba(249, 115, 22, 0.3)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease'
                  }}
                >
                  <Clock size={14} />
                  {shift.name} ({shift.startTime} - {shift.endTime})
                </span>
              ))}

            </div>
          )}
        </div>
      </div>

      <div className="tf-stats-grid">
        <div className={`tf-stat-card ${filter === 'All' ? 'active' : ''}`} onClick={() => setFilter('All')}>
          <div className="tf-stat-icon bg-gray"><Users size={24} /></div>
          <div className="tf-stat-info">
            <h3>إجمالي الموظفين</h3>
            <p>{stats.total}</p>
          </div>
        </div>
        <div className={`tf-stat-card ${filter === 'Present' ? 'active green' : ''}`} onClick={() => setFilter('Present')}>
          <div className="tf-stat-icon bg-green"><CheckCircle size={24} /></div>
          <div className="tf-stat-info">
            <h3>نشط (حضور)</h3>
            <p>{stats.active}</p>
          </div>
        </div>
        <div className={`tf-stat-card ${filter === 'Absent' ? 'active red' : ''}`} onClick={() => setFilter('Absent')}>
          <div className="tf-stat-icon bg-red"><XCircle size={24} /></div>
          <div className="tf-stat-info">
            <h3>غياب</h3>
            <p>{stats.absent}</p>
          </div>
        </div>
        <div className={`tf-stat-card ${filter === 'BusinessTrip' ? 'active blue' : ''}`} onClick={() => setFilter('BusinessTrip')}>
          <div className="tf-stat-icon bg-blue"><Plane size={24} /></div>
          <div className="tf-stat-info">
            <h3>سفر عمل</h3>
            <p>{stats.businesstrip}</p>
          </div>
        </div>
        <div className={`tf-stat-card ${filter === 'DayOff' ? 'active orange' : ''}`} onClick={() => setFilter('DayOff')}>
          <div className="tf-stat-icon bg-orange"><CalendarRange size={24} /></div>
          <div className="tf-stat-info">
            <h3>إجازة</h3>
            <p>{stats.dayoff}</p>
          </div>
        </div>
        <div className={`tf-stat-card ${filter === 'Pending' ? 'active gray' : ''}`} onClick={() => setFilter('Pending')}>
          <div className="tf-stat-icon bg-dark"><Clock size={24} /></div>
          <div className="tf-stat-info">
            <h3>لم يحضر بعد</h3>
            <p>{stats.pending}</p>
          </div>
        </div>
        <div className={`tf-stat-card ${filter === 'CheckedOut' ? 'active red' : ''}`} onClick={() => setFilter('CheckedOut')}>
          <div className="tf-stat-icon bg-red"><LogOut size={24} /></div>
          <div className="tf-stat-info">
            <h3>انصراف</h3>
            <p>{stats.checkedout}</p>
          </div>
        </div>
        {(user?.role === 'Admin' || user?.role === 'SuperAdmin') && (
          <div className={`tf-stat-card ${filter === 'Admins' ? 'active' : ''}`} onClick={() => setFilter('Admins')} style={{ borderColor: filter === 'Admins' ? 'var(--primary-color)' : '' }}>
            <div className="tf-stat-icon todayfollowup-style-9" ><ShieldAlert size={24} /></div>
            <div className="tf-stat-info">
              <h3>المديرين</h3>
              <p>{stats.admins}</p>
            </div>
          </div>
        )}
      </div>

      {shiftFilter !== 'All' && (user?.role === 'Admin' || user?.role === 'SuperAdmin') && (
        <div className="todayfollowup-style-10">
          <ShieldAlert size={22} />
          <span>
            <strong>مسؤول وردية ({shiftFilter}): </strong>
            {adminShifts.find(s => s.name === shiftFilter)?.admins || 'لا يوجد مسؤول محدد'}
          </span>
        </div>
      )}

      <div className="tf-content">
        {filteredEmployees.length === 0 ? (
          <div className="tf-empty">لا يوجد موظفين في هذه القائمة حالياً.</div>
        ) : (
          <div className="tf-table-wrapper">
            <table className="tf-table">
              <thead>
                <tr>
                  <th>الموظف</th>
                  <th>المسمى الوظيفي</th>
                  <th>الوردية</th>
                  <th>الحالة اليوم</th>
                  <th>الاستراحات</th>
                  <th>إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {sortedEmployees.map(emp => {
                  const status = getStatusDetails(emp.todayStatus, emp.shifts);
                  const userAvatar = emp.avatar || 'User';
                  const isAdmin = emp.role === 'Admin' || emp.role === 'SuperAdmin';
                  return (
                    <React.Fragment key={emp.id}>
                      <tr 
                        className={isAdmin ? 'tf-admin-row' : ''}
                        onClick={() => {
                          if (emp.notes) setExpandedRowId(expandedRowId === emp.id ? null : emp.id);
                        }}
                        style={{ cursor: emp.notes ? 'pointer' : 'default' }}
                      >
                        <td>
                        <div className="tf-user-info-table">
                          <div className="tf-avatar">
                            <AvatarIcon name={userAvatar} size={24} className="tf-avatar-icon" />
                          </div>
                          <div>
                            <h4>{emp.fullName}</h4>
                            <span>{emp.username}</span>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className="todayfollowup-style-11">
                          <span className="todayfollowup-style-12">{emp.jobTitle || 'موظف'}</span>
                          <span style={{ fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.2rem', color: emp.hasSummary ? '#10b981' : '#ef4444' }}>
                            {emp.hasSummary ? <CheckCircle size={12} /> : <XCircle size={12} />}
                            {emp.hasSummary ? 'سجل الملخص' : 'لم يسجل الملخص'}
                          </span>
                        </div>
                      </td>
                      <td>
                        <div className="todayfollowup-style-13">
                          {emp.shifts && emp.shifts.length > 0
                            ? emp.shifts.join('، ')
                            : <span className="text-secondary">غير محدد</span>}
                          {emp.lateMinutes > 0 && (
                            <div className="todayfollowup-style-14">
                              <AlertTriangle size={14} />
                              تأخير: {(() => {
                                const mins = emp.lateMinutes;
                                if (mins < 60) return `${mins} دقيقة`;
                                const h = Math.floor(mins / 60);
                                const m = mins % 60;
                                return m === 0 ? `${h} ساعة` : `${h} س و ${m} د`;
                              })()}
                            </div>
                          )}
                        </div>
                      </td>
                      <td>
                        <div className="todayfollowup-style-15">
                          <span className={`tf-status-badge ${status.className}`}>
                            {status.icon}
                            {status.label}
                          </span>
                          {(emp.checkInTime || emp.checkOutTime) && (
                            <div className="todayfollowup-style-16">
                              {emp.checkInTime && <div><span className="todayfollowup-style-17">↑</span> حضور: {new Date(emp.checkInTime).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}</div>}
                              {emp.checkOutTime && <div><span className="todayfollowup-style-18">↓</span> إنصراف: {new Date(emp.checkOutTime).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}</div>}
                            </div>
                          )}
                          {emp.notes && (
                            <div className="todayfollowup-style-19">
                              <Info size={12} /> اضغط لعرض السبب
                            </div>
                          )}
                        </div>
                      </td>
                      <td>
                        <div className="todayfollowup-style-20">
                          {emp.breakDetails && emp.breakDetails['بريك صلاة'] > 0 && (
                            <div className="todayfollowup-style-21"><span className="todayfollowup-style-22">🕋</span>صلاة: {(() => {
                              const totalMins = Math.floor(emp.breakDetails['بريك صلاة'] / 60000);
                              const hours = Math.floor(totalMins / 60);
                              const mins = totalMins % 60;
                              return hours > 0 ? `${hours} س ${mins} د` : `${mins} دقيقة`;
                            })()}</div>
                          )}
                          {emp.breakDetails && emp.breakDetails['بريك غداء'] > 0 && (
                            <div className="todayfollowup-style-23"><span className="todayfollowup-style-24">🍔</span>غداء: {(() => {
                              const totalMins = Math.floor(emp.breakDetails['بريك غداء'] / 60000);
                              const hours = Math.floor(totalMins / 60);
                              const mins = totalMins % 60;
                              return hours > 0 ? `${hours} س ${mins} د` : `${mins} دقيقة`;
                            })()}</div>
                          )}
                          {(!emp.breakDetails || (emp.breakDetails['بريك صلاة'] === 0 && emp.breakDetails['بريك غداء'] === 0)) && (
                            <span className="todayfollowup-style-25">لا يوجد</span>
                          )}
                        </div>
                      </td>
                      <td>
                        <div className="todayfollowup-style-26">
                          <button
                            className="tf-edit-btn todayfollowup-style-27"
                            onClick={(e) => { e.stopPropagation(); openModal(emp); }}
                            title="تعديل الحالة"
                            
                          >
                            <Edit2 size={16} />
                            تعديل
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); navigate(`/personal-followup/${emp.id}`); }}
                            title="ملف الموظف"
                            className="todayfollowup-style-28"
                          >
                            <User size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                    {expandedRowId === emp.id && emp.notes && (
                      <tr className="tf-expanded-row">
                        <td colSpan="6" className="todayfollowup-style-29">
                          <div className="todayfollowup-style-30">
                            <strong className="todayfollowup-style-31">
                              <Info size={16} className="todayfollowup-style-32" />
                              السبب المرفق:
                            </strong>
                            <div className="todayfollowup-style-33">{emp.notes}</div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Status Update Modal */}
      {selectedEmp && (
        <div className="tf-modal-overlay fade-in" onClick={closeModal}>
          <div className="tf-modal-content" onClick={e => e.stopPropagation()}>
            <div className="tf-modal-header">
              <h2>تحديث حالة الموظف</h2>
              <button className="tf-close-btn" onClick={closeModal}><XCircle size={24} /></button>
            </div>

            <div className="tf-modal-body">
              <div className="tf-emp-summary">
                <div className="tf-avatar-modal">
                  <AvatarIcon name={selectedEmp.avatar} size={30} />
                </div>
                <div>
                  <h4>{selectedEmp.fullName}</h4>
                  <span>{selectedEmp.shifts.join('، ')}</span>
                </div>
              </div>

              <form onSubmit={handleUpdateStatus} className="tf-form">
                <div className="tf-form-group">
                  <label className="tf-section-label">الإجراء المطلوب:</label>
                  <div className="tf-adv-radio-group">
                    <label className={`tf-adv-radio-label ${action === 'CheckIn' ? 'active checkin' : ''}`}>
                      <input type="radio" value="CheckIn" checked={action === 'CheckIn'} onChange={(e) => setAction(e.target.value)} />
                      <LogIn size={20} className="radio-icon" />
                      <span>تسجيل حضور</span>
                    </label>
                    <label className={`tf-adv-radio-label ${action === 'CheckOut' ? 'active checkout' : ''}`}>
                      <input type="radio" value="CheckOut" checked={action === 'CheckOut'} onChange={(e) => setAction(e.target.value)} />
                      <LogOut size={20} className="radio-icon" />
                      <span>تسجيل إنصراف</span>
                    </label>
                    <label className={`tf-adv-radio-label ${action === 'EditTimes' ? 'active edittimes' : ''}`}>
                      <input type="radio" value="EditTimes" checked={action === 'EditTimes'} onChange={(e) => setAction(e.target.value)} />
                      <Clock size={20} className="radio-icon" />
                      <span>تعديل الأوقات</span>
                    </label>
                    <label className={`tf-adv-radio-label ${action === 'Absent' ? 'active absent' : ''}`}>
                      <input type="radio" value="Absent" checked={action === 'Absent'} onChange={(e) => setAction(e.target.value)} />
                      <UserX size={20} className="radio-icon" />
                      <span>تسجيل غياب</span>
                    </label>
                    <label className={`tf-adv-radio-label ${action === 'BusinessTrip' ? 'active businesstrip' : ''}`}>
                      <input type="radio" value="BusinessTrip" checked={action === 'BusinessTrip'} onChange={(e) => setAction(e.target.value)} />
                      <Plane size={20} className="radio-icon" />
                      <span>سفر عمل</span>
                    </label>
                    <label className={`tf-adv-radio-label ${action === 'DayOff' ? 'active dayoff' : ''}`}>
                      <input type="radio" value="DayOff" checked={action === 'DayOff'} onChange={(e) => setAction(e.target.value)} />
                      <CalendarOff size={20} className="radio-icon" />
                      <span>تسجيل إجازة</span>
                    </label>
                    <label className={`tf-adv-radio-label ${action === 'DayOffWork' ? 'active checkin' : ''}`}>
                      <input type="radio" value="DayOffWork" checked={action === 'DayOffWork'} onChange={(e) => setAction(e.target.value)} />
                      <CheckCircle size={20} className="radio-icon" />
                      <span>عمل في الإجازة</span>
                    </label>
                    <label className={`tf-adv-radio-label ${action === 'ResetCheckout' ? 'active checkin' : ''}`}>
                      <input type="radio" value="ResetCheckout" checked={action === 'ResetCheckout'} onChange={(e) => setAction(e.target.value)} />
                      <RefreshCw size={20} className="radio-icon" />
                      <span>إلغاء الانصراف</span>
                    </label>
                  </div>
                </div>

                {(action === 'CheckIn' || action === 'CheckOut' || action === 'EditTimes') && (
                  <div className="tf-form-group tf-time-inputs-container fade-in">
                    <div className="tf-time-input-wrapper">
                      <label>
                        <LogIn size={16} /> وقت الحضور:
                      </label>
                      <input type="time" value={manualCheckIn} onChange={(e) => setManualCheckIn(e.target.value)} className="tf-adv-input" />
                    </div>
                    <div className="tf-time-input-wrapper">
                      <label>
                        <LogOut size={16} /> وقت الانصراف:
                      </label>
                      <input type="time" value={manualCheckOut} onChange={(e) => setManualCheckOut(e.target.value)} className="tf-adv-input" />
                    </div>
                  </div>
                )}

                {isEarlyCheckout && action === 'CheckOut' && (
                  <div className="tf-alert warning">
                    <ShieldAlert size={18} />
                    <span>تنبيه: يتم تسجيل الانصراف قبل موعد انتهاء الوردية. يرجى تدوين ملاحظة.</span>
                  </div>
                )}

                {action !== 'ResetCheckout' && (
                  <div className="tf-form-group">
                    <label>
                      ملاحظة
                      {isEarlyCheckout && action === 'CheckOut' && <span className="required-asterisk">*</span>}
                    </label>
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className="tf-textarea"
                      placeholder="اكتب ملاحظة (سبب التأخير، سبب الخروج المبكر، إلخ)"
                      rows="3"
                      required={isEarlyCheckout && action === 'CheckOut'}
                    ></textarea>
                  </div>
                )}

                <div className="tf-modal-actions">
                  <button type="button" className="tf-btn-secondary" onClick={closeModal}>إلغاء</button>
                  <button type="submit" className="tf-btn-primary" disabled={updating}>
                    {updating ? 'جاري الحفظ...' : 'حفظ التحديث'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TodayFollowup;
