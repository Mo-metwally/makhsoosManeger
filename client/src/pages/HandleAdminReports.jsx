import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Activity, Search, Trash2, ChevronRight, ChevronLeft, Users, LogIn, LogOut, CheckCircle, Calendar, Edit2, X, Save, Clock, XCircle, Briefcase, Plane, Info } from 'lucide-react';
import AdminGuard from '../components/AdminGuard';
import CustomSelect from '../components/CustomSelect';
import { getLogicalDateString } from '../utils/dateHelpers';
import api from '../services/api';
import "./Monitoring.scss";
import { useToast } from '../contexts/ToastContext';

const HandleAdminReports = () => {
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const initialEmployeeName = searchParams.get('employeeName');

  const [attendanceLogs, setAttendanceLogs] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [timeFilter, setTimeFilter] = useState('all');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [employeeFilter, setEmployeeFilter] = useState(initialEmployeeName || 'all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('date_desc');
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 8; // Adjust if needed

  const [editModal, setEditModal] = useState({ isOpen: false, log: null, checkInTime: '', checkOutTime: '', status: '', notes: '' });
  const [expandedRowId, setExpandedRowId] = useState(null);
  const [showCheckoutMenu, setShowCheckoutMenu] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    document.title = "تقارير الحضور المجمعة | مخصوص";
    fetchAttendanceLogs();
  }, []);

  const fetchAttendanceLogs = async () => {
    try {
      const res = await api.get('/attendance/all-logs');
      setAttendanceLogs(res.data);
    } catch (err) {
      console.error('Error fetching attendance logs', err);
      showToast('خطأ في جلب البيانات', 'error');
    }
  };

  const handleEditTime = async () => {
    if (!editModal.log) return;
    try {
      const createIso = (timeStr) => {
        if (!timeStr) return null;
        if (timeStr.includes('T')) return timeStr; // Already ISO
        const [hours, minutes] = timeStr.split(':').map(Number);
        const d = new Date();
        d.setHours(hours, minutes, 0, 0);
        return d.toISOString();
      };

      const res = await api.put(`/attendance/admin/log/${editModal.log.id}`, {
        checkInTime: editModal.checkInTime ? createIso(editModal.checkInTime) : undefined,
        checkOutTime: editModal.checkOutTime ? createIso(editModal.checkOutTime) : undefined,
        status: editModal.status || undefined,
        notes: editModal.notes
      });
      showToast('تم تحديث السجل بنجاح', 'success');
      setEditModal({ isOpen: false, log: null, checkInTime: '', checkOutTime: '', status: '', notes: '' });
      fetchAttendanceLogs();
    } catch (err) {
      console.error('Error updating log time:', err);
      showToast(err.response?.data?.error || 'حدث خطأ أثناء التحديث', 'error');
    }
  };

  const formatTime = (dateStr) => {
    if (!dateStr) return '---';
    return new Date(dateStr).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });
  };

  const calculateDelay = (checkInDateStr, shiftStartTimeStr) => {
    if (!checkInDateStr || !shiftStartTimeStr) return '---';

    const checkInDate = new Date(checkInDateStr);
    const [shiftHours, shiftMinutes] = shiftStartTimeStr.split(':').map(Number);

    const shiftStartDate = new Date(checkInDate);
    shiftStartDate.setHours(shiftHours, shiftMinutes, 0, 0);

    const diffMs = checkInDate - shiftStartDate;
    if (diffMs <= 0) return 'لا يوجد';

    const diffMins = Math.floor(diffMs / 60000);
    const allowedDelay = Number(localStorage.getItem('allowedDelayMinutes') || '15');
    const actualDelayMins = diffMins > allowedDelay ? diffMins : 0;

    if (actualDelayMins <= 0) return 'لا يوجد';

    const hours = Math.floor(actualDelayMins / 60);
    const mins = actualDelayMins % 60;

    if (hours > 0) return `${hours} س ${mins > 0 ? `و ${mins} د` : ''}`;
    return `${mins} دقيقة`;
  };

  const calculateEarlyDeparture = (checkOutDateStr, shiftStr) => {
    if (!checkOutDateStr || !shiftStr || !shiftStr.endTime || !shiftStr.startTime) return '---';

    const checkOutDate = new Date(checkOutDateStr);
    const [startH] = shiftStr.startTime.split(':').map(Number);
    const [endH, endM] = shiftStr.endTime.split(':').map(Number);
    
    const shiftEndDate = new Date(checkOutDate);
    shiftEndDate.setHours(endH, endM, 0, 0);
    if (endH < startH && checkOutDate.getHours() >= startH) {
      shiftEndDate.setDate(shiftEndDate.getDate() + 1);
    }

    const diffMs = shiftEndDate - checkOutDate;
    if (diffMs <= 0) return 'لا يوجد';

    const diffMins = Math.floor(diffMs / 60000);
    const allowedEarly = Number(localStorage.getItem('allowedEarlyDepartureMinutes') || '0');
    const actualEarlyMins = diffMins > allowedEarly ? diffMins : 0;

    if (actualEarlyMins <= 0) return 'لا يوجد';

    const hours = Math.floor(actualEarlyMins / 60);
    const mins = actualEarlyMins % 60;

    if (hours > 0) return `${hours} س ${mins > 0 ? `و ${mins} د` : ''}`;
    return `${mins} دقيقة`;
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '---';
    return new Date(dateStr).toLocaleDateString('ar-EG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, timeFilter, employeeFilter, sortBy]);

  const uniqueEmployees = Array.from(new Set(attendanceLogs.map(l => l.User?.fullName?.trim()).filter(Boolean)));

  let filteredLogs = [...attendanceLogs];
  const now = new Date();
  const todayStr = getLogicalDateString(now);

  // Exclude future dates
  filteredLogs = filteredLogs.filter(log => log.date <= todayStr);

  // Time Filter
  if (timeFilter !== 'all') {
    filteredLogs = filteredLogs.filter(log => {
      const logDate = new Date(log.date || log.createdAt);
      if (timeFilter === 'today') {
        return getLogicalDateString(logDate) === getLogicalDateString(now);
      }
      if (timeFilter === 'yesterday') {
        const yesterday = new Date(now);
        yesterday.setDate(yesterday.getDate() - 1);
        return getLogicalDateString(logDate) === getLogicalDateString(yesterday);
      }
      if (timeFilter === 'week') {
        const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        return logDate >= oneWeekAgo;
      }
      if (timeFilter === 'month') {
        return logDate.getMonth() === now.getMonth() && logDate.getFullYear() === now.getFullYear();
      }
      if (timeFilter === 'custom' && customStartDate && customEndDate) {
        const start = new Date(customStartDate);
        start.setHours(0, 0, 0, 0);
        const end = new Date(customEndDate);
        end.setHours(23, 59, 59, 999);
        return logDate >= start && logDate <= end;
      }
      return true;
    });
  }

  if (employeeFilter !== 'all') {
    filteredLogs = filteredLogs.filter(log => log.User?.fullName?.trim() === employeeFilter);
  }

  // Status Filter
  if (statusFilter !== 'all') {
    filteredLogs = filteredLogs.filter(log => {
      if (statusFilter === 'CheckedOut') {
        const earlyRes = calculateEarlyDeparture(log.checkOutTime, log.Shift);
        return log.checkOutTime != null && (earlyRes === 'لا يوجد' || earlyRes === '---');
      }
      if (statusFilter === 'EarlyCheckout') {
        const earlyRes = calculateEarlyDeparture(log.checkOutTime, log.Shift);
        return log.checkOutTime != null && earlyRes !== 'لا يوجد' && earlyRes !== '---';
      }
      if (statusFilter === 'Present') return log.status === 'Present' && log.checkOutTime == null;
      return log.status === statusFilter;
    });
  }

  // Search Filter
  if (searchQuery.trim() !== '') {
    const lowerQ = searchQuery.toLowerCase();
    filteredLogs = filteredLogs.filter(log =>
      (log.User?.fullName || '').toLowerCase().includes(lowerQ) ||
      (log.Shift?.name || '').toLowerCase().includes(lowerQ)
    );
  }

  // Sort
  filteredLogs.sort((a, b) => {
    if (sortBy === 'supervisor_asc') {
      const nameA = a.User?.fullName || '';
      const nameB = b.User?.fullName || '';
      return nameA.localeCompare(nameB, 'ar');
    }
    if (sortBy === 'supervisor_desc') {
      const nameA = a.User?.fullName || '';
      const nameB = b.User?.fullName || '';
      return nameB.localeCompare(nameA, 'ar');
    }
    if (sortBy === 'date_asc') {
      return new Date(a.date) - new Date(b.date);
    }
    // Default is date_desc
    return new Date(b.date) - new Date(a.date);
  });

  const totalPages = Math.ceil(filteredLogs.length / ITEMS_PER_PAGE);
  const currentLogs = filteredLogs.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  return (
    <AdminGuard>
      <div className="monitoring-container">
        <header className="page-header">
          <div className="page-title-wrapper">
            <Users size={28} className="title-icon text-blue" />
            <h1 className="page-title gradient-title">سجل الحضور المجمع (إدارة)</h1>
            <div className="handleadminreports-style-1">
              إجمالي السجلات: <strong>{attendanceLogs.length}</strong>
            </div>
          </div>
        </header>

        <div className="filter-section handleadminreports-style-2" >

          {/* Time Filters */}
          <div className="admin-filter-group">
            {['all', 'today', 'yesterday', 'week', 'month', 'custom'].map(val => (
              <div className="admin-filter-radio" key={val}>
                <label>
                  <input
                    type="radio"
                    name="timeFilter"
                    value={val}
                    checked={timeFilter === val}
                    onChange={(e) => setTimeFilter(e.target.value)}
                  />
                  <span>{val === 'all' ? 'الكل' : val === 'today' ? 'اليوم' : val === 'yesterday' ? 'أمس' : val === 'week' ? 'الأسبوع' : val === 'month' ? 'الشهر' : 'مخصص'}</span>
                  {timeFilter === val && <div className="radio-bg"></div>}
                </label>
              </div>
            ))}
          </div>

          {/* Status Filters */}
          <div className="admin-filter-group handleadminreports-style-3" >
            {[
              { value: 'all', label: 'الكل', icon: Users, color: 'var(--theme-glow)' },
              { value: 'Present', label: 'حضور', icon: CheckCircle, color: '#10b981' },
              { value: 'CheckedOut', label: 'انصراف', icon: LogOut, color: '#ef4444' },
              { value: 'Late', label: 'تأخير', icon: Clock, color: '#f59e0b' },
              { value: 'Absent', label: 'غياب', icon: XCircle, color: '#ef4444' },
              { value: 'BusinessTrip', label: 'سفر', icon: Plane, color: '#0ea5e9' },
              { value: 'DayOff', label: 'إجازة', icon: Calendar, color: '#3b82f6' },
              { value: 'DayOffWork', label: 'عمل إجازة', icon: Briefcase, color: '#8b5cf6' }
            ].map(status => (
              status.value === 'CheckedOut' ? (
                <div 
                  className="admin-filter-radio" 
                  key={status.value}
                  onMouseEnter={() => setShowCheckoutMenu(true)}
                  onMouseLeave={() => setShowCheckoutMenu(false)}
                  style={{ position: 'relative' }}
                >
                  <label className="handleadminreports-style-4">
                    <input
                      type="radio"
                      name="statusFilter"
                      value={status.value}
                      checked={statusFilter === 'CheckedOut' || statusFilter === 'EarlyCheckout'}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      onClick={() => {
                        if (statusFilter === 'EarlyCheckout') setStatusFilter('CheckedOut');
                      }}
                    />
                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: (statusFilter === 'CheckedOut' || statusFilter === 'EarlyCheckout') ? '#fff' : 'var(--text-color)' }}>
                      <status.icon size={16} color={(statusFilter === 'CheckedOut' || statusFilter === 'EarlyCheckout') ? '#fff' : status.color} />
                      {statusFilter === 'EarlyCheckout' ? 'انصراف مبكر' : 'انصراف'}
                    </span>
                    {(statusFilter === 'CheckedOut' || statusFilter === 'EarlyCheckout') && <div className="radio-bg" style={{ background: status.color, boxShadow: `0 4px 15px ${status.color}40` }}></div>}
                  </label>
                  {showCheckoutMenu && (
                    <div className="checkout-dropdown-wrapper" style={{
                      position: 'absolute',
                      top: '100%',
                      right: '0',
                      paddingTop: '8px', /* safe bridge for hover */
                      zIndex: 99999,
                      minWidth: '160px'
                    }}>
                      <div className="checkout-dropdown-content" style={{
                        background: 'var(--theme-bg, #1e1e2d)',
                        border: '1px solid var(--theme-border, #3b3b4f)',
                        borderRadius: '8px',
                        padding: '6px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '4px',
                        boxShadow: '0 10px 25px rgba(0,0,0,0.5)'
                      }}>
                        <div 
                          onClick={(e) => { e.preventDefault(); e.stopPropagation(); setStatusFilter('CheckedOut'); setShowCheckoutMenu(false); }}
                          onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.15)'}
                          onMouseLeave={(e) => e.currentTarget.style.background = statusFilter === 'CheckedOut' ? 'rgba(239, 68, 68, 0.15)' : 'transparent'}
                          style={{ 
                            padding: '10px 12px', cursor: 'pointer', borderRadius: '6px', 
                            background: statusFilter === 'CheckedOut' ? 'rgba(239, 68, 68, 0.15)' : 'transparent', 
                            color: statusFilter === 'CheckedOut' ? '#ef4444' : '#fff', 
                            display: 'flex', alignItems: 'center', gap: '8px', 
                            transition: 'all 0.2s ease',
                            fontSize: '14px', fontWeight: '600'
                          }}
                        >
                          <LogOut size={16} color="#ef4444" />
                          <span>انصراف عادي</span>
                        </div>
                        <div 
                          onClick={(e) => { e.preventDefault(); e.stopPropagation(); setStatusFilter('EarlyCheckout'); setShowCheckoutMenu(false); }}
                          onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.15)'}
                          onMouseLeave={(e) => e.currentTarget.style.background = statusFilter === 'EarlyCheckout' ? 'rgba(239, 68, 68, 0.15)' : 'transparent'}
                          style={{ 
                            padding: '10px 12px', cursor: 'pointer', borderRadius: '6px', 
                            background: statusFilter === 'EarlyCheckout' ? 'rgba(239, 68, 68, 0.15)' : 'transparent', 
                            color: statusFilter === 'EarlyCheckout' ? '#ef4444' : '#fff', 
                            display: 'flex', alignItems: 'center', gap: '8px', 
                            transition: 'all 0.2s ease',
                            fontSize: '14px', fontWeight: '600'
                          }}
                        >
                          <Clock size={16} color="#ef4444" />
                          <span>انصراف مبكر</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="admin-filter-radio" key={status.value}>
                  <label className="handleadminreports-style-4">
                    <input
                      type="radio"
                      name="statusFilter"
                      value={status.value}
                      checked={statusFilter === status.value}
                      onChange={(e) => setStatusFilter(e.target.value)}
                    />
                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: statusFilter === status.value ? '#fff' : 'var(--text-color)' }}>
                      <status.icon size={16} color={statusFilter === status.value ? '#fff' : status.color} />
                      {status.label}
                    </span>
                    {statusFilter === status.value && <div className="radio-bg" style={{ background: status.color, boxShadow: `0 4px 15px ${status.color}40` }}></div>}
                  </label>
                </div>
              )
            ))}
          </div>

          {timeFilter === 'custom' && (
            <div className="handleadminreports-style-5">
              <div className="handleadminreports-style-6">
                <span className="handleadminreports-style-7">من:</span>
                <input type="date" value={customStartDate} onChange={e => setCustomStartDate(e.target.value)} className="search-input handleadminreports-style-8"  />
              </div>
              <div className="handleadminreports-style-9">
                <span className="handleadminreports-style-10">إلى:</span>
                <input type="date" value={customEndDate} onChange={e => setCustomEndDate(e.target.value)} className="search-input handleadminreports-style-11"  />
              </div>
            </div>
          )}

          <div className="handleadminreports-style-12">
            <div className="search-bar handleadminreports-style-13" >
              <Search size={18} className="search-icon" />
              <input
                type="text"
                placeholder="بحث باسم الموظف أو الوردية..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="search-input"
              />
            </div>

            <CustomSelect
              options={[
                { value: 'all', label: 'كل الموظفين (الجميع)' },
                ...uniqueEmployees.map(name => ({ value: name, label: name }))
              ]}
              value={employeeFilter}
              onChange={setEmployeeFilter}
              placeholder="فلتر الموظف..."
            />

            <CustomSelect
              options={[
                { value: 'date_desc', label: 'الأحدث أولاً' },
                { value: 'date_asc', label: 'الأقدم أولاً' },
                { value: 'supervisor_asc', label: 'الموظف (أ - ي)' },
                { value: 'supervisor_desc', label: 'الموظف (ي - أ)' }
              ]}
              value={sortBy}
              onChange={setSortBy}
              placeholder="ترتيب حسب"
            />
          </div>
        </div>

        <div className="table-container">
          {filteredLogs.length === 0 ? (
            <div className="handleadminreports-style-14">
              لا توجد سجلات حضور مسجلة تطابق بحثك حالياً.
            </div>
          ) : (
            <table className="calls-table">
              <thead>
                <tr>
                  <th>الموظف</th>
                  <th>التاريخ</th>
                  <th>الوردية</th>
                  <th>وقت الحضور</th>
                  <th>وقت الانصراف</th>
                  <th>استراحات</th>
                  <th>التأخير</th>
                  <th>الانصراف المبكر</th>
                  <th>الحالة</th>
                  <th>إجراء</th>
                </tr>
              </thead>
              <tbody>
                {currentLogs.map(log => (
                  <React.Fragment key={log.id}>
                    <tr
                      onClick={() => {
                        if (log.notes) setExpandedRowId(expandedRowId === log.id ? null : log.id);
                      }}
                      style={{ cursor: log.notes ? 'pointer' : 'default' }}
                    >
                      <td>
                        <div className="handleadminreports-style-15">{log.User ? log.User.fullName : '---'}</div>
                        <div className="handleadminreports-style-16">{log.User ? log.User.jobTitle : ''}</div>
                        {log.userId && (
                          <Link
                            to={`/personal-followup/${log.userId}`}
                            onClick={(e) => e.stopPropagation()}
                            className="handleadminreports-style-17"
                            onMouseOver={e => e.currentTarget.style.background = 'rgba(59, 130, 246, 0.25)'}
                            onMouseOut={e => e.currentTarget.style.background = 'rgba(59, 130, 246, 0.15)'}
                            title="عرض إحصائيات الموظف"
                          >
                            <Activity size={14} />
                            متابعة الأداء
                          </Link>
                        )}
                      </td>
                      <td>{formatDate(log.date)}</td>
                      <td>{log.Shift ? log.Shift.name : '---'}</td>
                      <td style={{ color: log.checkInTime ? '#10b981' : 'var(--text-secondary)' }}>
                        {log.checkInTime ? <><LogIn size={16} className="handleadminreports-style-18" /> {formatTime(log.checkInTime)}</> : '---'}
                      </td>
                      <td style={{ color: log.checkOutTime ? '#ef4444' : 'var(--text-secondary)' }}>
                        {log.checkOutTime ? <><LogOut size={16} className="handleadminreports-style-19" /> {formatTime(log.checkOutTime)}</> : (log.status === 'Present' ? 'لم ينصرف بعد' : '---')}
                      </td>
                      <td>
                        <div className="handleadminreports-style-20">
                          {log.breakDetails && log.breakDetails['بريك صلاة'] > 0 && (
                            <div className="handleadminreports-style-21"><span className="handleadminreports-style-22">🕋</span>صلاة: {(() => {
                              const totalMins = Math.floor(log.breakDetails['بريك صلاة'] / 60000);
                              const hours = Math.floor(totalMins / 60);
                              const mins = totalMins % 60;
                              return hours > 0 ? `${hours} س ${mins} د` : `${mins} دقيقة`;
                            })()}</div>
                          )}
                          {log.breakDetails && log.breakDetails['بريك غداء'] > 0 && (
                            <div className="handleadminreports-style-23"><span className="handleadminreports-style-24">🍔</span>غداء: {(() => {
                              const totalMins = Math.floor(log.breakDetails['بريك غداء'] / 60000);
                              const hours = Math.floor(totalMins / 60);
                              const mins = totalMins % 60;
                              return hours > 0 ? `${hours} س ${mins} د` : `${mins} دقيقة`;
                            })()}</div>
                          )}
                          {(!log.breakDetails || (log.breakDetails['بريك صلاة'] === 0 && log.breakDetails['بريك غداء'] === 0)) && (
                            <span className="handleadminreports-style-25">لا يوجد</span>
                          )}
                        </div>
                      </td>
                      <td className="handleadminreports-style-26">
                        {calculateDelay(log.checkInTime, log.Shift?.startTime)}
                      </td>
                      <td className="handleadminreports-style-26" style={{ color: calculateEarlyDeparture(log.checkOutTime, log.Shift) !== 'لا يوجد' && calculateEarlyDeparture(log.checkOutTime, log.Shift) !== '---' ? '#ef4444' : 'inherit' }}>
                        {calculateEarlyDeparture(log.checkOutTime, log.Shift)}
                      </td>
                      <td>
                        {log.status === 'Absent' ? (
                          <span className="status-badge handleadminreports-style-27" >
                            <X size={14} /> غياب
                          </span>
                        ) : log.status === 'BusinessTrip' ? (
                          <span className="status-badge handleadminreports-style-28" >
                            <Plane size={14} /> سفر عمل
                          </span>
                        ) : log.status === 'DayOff' ? (
                          <span className="status-badge handleadminreports-style-29" >
                            <Calendar size={14} /> إجازة عادية
                          </span>
                        ) : log.status === 'DayOffWork' ? (
                          <span className="status-badge handleadminreports-style-30" >
                            <Briefcase size={14} /> عمل بإجازة
                          </span>
                        ) : log.status === 'Late' ? (
                          <span className="status-badge handleadminreports-style-31" >
                            <Clock size={14} /> تأخير
                          </span>
                        ) : (
                          <span className="status-badge handleadminreports-style-32" >
                            <CheckCircle size={14} /> حضور
                          </span>
                        )}
                        {log.notes && (
                          <div className="handleadminreports-style-33">
                            <Info size={12} /> اضغط لعرض السبب
                          </div>
                        )}
                      </td>
                      <td>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditModal({
                              isOpen: true,
                              log: log,
                              checkInTime: log.checkInTime ? new Date(new Date(log.checkInTime).getTime() - (new Date(log.checkInTime).getTimezoneOffset() * 60000)).toISOString().slice(11, 16) : '',
                              checkOutTime: log.checkOutTime ? new Date(new Date(log.checkOutTime).getTime() - (new Date(log.checkOutTime).getTimezoneOffset() * 60000)).toISOString().slice(11, 16) : '',
                              status: log.status,
                              notes: log.notes || ''
                            });
                          }}
                          className="handleadminreports-style-34"
                          title="تعديل الوقت"
                          onMouseOver={(e) => e.currentTarget.style.color = 'var(--theme-color)'}
                          onMouseOut={(e) => e.currentTarget.style.color = 'var(--text-secondary)'}
                        >
                          <Edit2 size={18} />
                        </button>
                      </td>
                    </tr>
                    {expandedRowId === log.id && log.notes && (
                      <tr className="tf-expanded-row">
                        <td colSpan="10" className="handleadminreports-style-35">
                          <div className="handleadminreports-style-36">
                            <strong className="handleadminreports-style-37">
                              <Info size={16} className="handleadminreports-style-38" />
                              السبب المرفق:
                            </strong>
                            <div className="handleadminreports-style-39">{log.notes}</div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="pagination-container">
              <button
                className="pagination-btn"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                <ChevronRight size={18} />
                <span>السابق</span>
              </button>

              <div className="pagination-info">
                صفحة <span className="current-page">{currentPage}</span> من <span className="total-pages">{totalPages}</span>
              </div>

              <button
                className="pagination-btn"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
              >
                <span>التالي</span>
                <ChevronLeft size={18} />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Edit Time Modal */}
      {editModal.isOpen && (
        <div className="handleadminreports-style-40">
          <div className="handleadminreports-style-41">
            <h3 className="handleadminreports-style-42">
              <Edit2 size={24} className="text-blue" />
              تعديل أوقات السجل
            </h3>
            <p className="handleadminreports-style-43">
              موظف: <strong>{editModal.log?.User?.fullName}</strong><br />
              تاريخ: {formatDate(editModal.log?.date)}
            </p>

            <div className="handleadminreports-style-44">
              <div>
                <label className="handleadminreports-style-45">وقت الحضور</label>
                <input
                  type="time"
                  value={editModal.checkInTime}
                  onChange={(e) => setEditModal({ ...editModal, checkInTime: e.target.value })}
                  className="handleadminreports-style-46"
                />
              </div>
              <div>
                <label className="handleadminreports-style-47">وقت الانصراف</label>
                <input
                  type="time"
                  value={editModal.checkOutTime}
                  onChange={(e) => setEditModal({ ...editModal, checkOutTime: e.target.value })}
                  className="handleadminreports-style-48"
                />
              </div>
            </div>

            <div className="handleadminreports-style-49">
              <label className="handleadminreports-style-50">حالة الحضور</label>
              <div className="handleadminreports-style-51">
                <div
                  onClick={() => setEditModal({ ...editModal, status: 'Present' })}
                  style={{
                    padding: '0.75rem', borderRadius: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem',
                    border: editModal.status === 'Present' ? '2px solid #10b981' : '1px solid rgba(255,255,255,0.1)',
                    background: editModal.status === 'Present' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255,255,255,0.02)',
                    transition: 'all 0.2s ease'
                  }}>
                  <CheckCircle size={20} color={editModal.status === 'Present' ? '#10b981' : 'var(--text-secondary)'} />
                  <span style={{ color: editModal.status === 'Present' ? '#10b981' : 'var(--text-primary)', fontWeight: editModal.status === 'Present' ? 'bold' : 'normal' }}>حضور</span>
                </div>

                <div
                  onClick={() => setEditModal({ ...editModal, status: 'Absent' })}
                  style={{
                    padding: '0.75rem', borderRadius: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem',
                    border: editModal.status === 'Absent' ? '2px solid #ef4444' : '1px solid rgba(255,255,255,0.1)',
                    background: editModal.status === 'Absent' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(255,255,255,0.02)',
                    transition: 'all 0.2s ease'
                  }}>
                  <XCircle size={20} color={editModal.status === 'Absent' ? '#ef4444' : 'var(--text-secondary)'} />
                  <span style={{ color: editModal.status === 'Absent' ? '#ef4444' : 'var(--text-primary)', fontWeight: editModal.status === 'Absent' ? 'bold' : 'normal' }}>غياب</span>
                </div>

                <div
                  onClick={() => setEditModal({ ...editModal, status: 'BusinessTrip' })}
                  style={{
                    padding: '0.75rem', borderRadius: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem',
                    border: editModal.status === 'BusinessTrip' ? '2px solid #0ea5e9' : '1px solid rgba(255,255,255,0.1)',
                    background: editModal.status === 'BusinessTrip' ? 'rgba(14, 165, 233, 0.15)' : 'rgba(255,255,255,0.02)',
                    transition: 'all 0.2s ease'
                  }}>
                  <Plane size={20} color={editModal.status === 'BusinessTrip' ? '#0ea5e9' : 'var(--text-secondary)'} />
                  <span style={{ color: editModal.status === 'BusinessTrip' ? '#0ea5e9' : 'var(--text-primary)', fontWeight: editModal.status === 'BusinessTrip' ? 'bold' : 'normal' }}>سفر عمل</span>
                </div>

                <div
                  onClick={() => setEditModal({ ...editModal, status: 'Late' })}
                  style={{
                    padding: '0.75rem', borderRadius: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem',
                    border: editModal.status === 'Late' ? '2px solid #f59e0b' : '1px solid rgba(255,255,255,0.1)',
                    background: editModal.status === 'Late' ? 'rgba(245, 158, 11, 0.15)' : 'rgba(255,255,255,0.02)',
                    transition: 'all 0.2s ease'
                  }}>
                  <Clock size={20} color={editModal.status === 'Late' ? '#f59e0b' : 'var(--text-secondary)'} />
                  <span style={{ color: editModal.status === 'Late' ? '#f59e0b' : 'var(--text-primary)', fontWeight: editModal.status === 'Late' ? 'bold' : 'normal' }}>تأخير</span>
                </div>

                <div
                  onClick={() => setEditModal({ ...editModal, status: 'DayOff' })}
                  style={{
                    padding: '0.75rem', borderRadius: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem',
                    border: editModal.status === 'DayOff' ? '2px solid #3b82f6' : '1px solid rgba(255,255,255,0.1)',
                    background: editModal.status === 'DayOff' ? 'rgba(59, 130, 246, 0.15)' : 'rgba(255,255,255,0.02)',
                    transition: 'all 0.2s ease'
                  }}>
                  <Calendar size={20} color={editModal.status === 'DayOff' ? '#3b82f6' : 'var(--text-secondary)'} />
                  <span style={{ color: editModal.status === 'DayOff' ? '#3b82f6' : 'var(--text-primary)', fontWeight: editModal.status === 'DayOff' ? 'bold' : 'normal' }}>إجازة عادية</span>
                </div>

                <div
                  onClick={() => setEditModal({ ...editModal, status: 'DayOffWork' })}
                  style={{
                    padding: '0.75rem', borderRadius: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem',
                    border: editModal.status === 'DayOffWork' ? '2px solid #8b5cf6' : '1px solid rgba(255,255,255,0.1)',
                    background: editModal.status === 'DayOffWork' ? 'rgba(139, 92, 246, 0.15)' : 'rgba(255,255,255,0.02)',
                    transition: 'all 0.2s ease'
                  }}>
                  <Briefcase size={20} color={editModal.status === 'DayOffWork' ? '#8b5cf6' : 'var(--text-secondary)'} />
                  <span style={{ color: editModal.status === 'DayOffWork' ? '#8b5cf6' : 'var(--text-primary)', fontWeight: editModal.status === 'DayOffWork' ? 'bold' : 'normal' }}>عمل بإجازة</span>
                </div>
              </div>
            </div>

            <div className="handleadminreports-style-52">
              <div className="handleadminreports-style-53">
                <h3 className="handleadminreports-style-54">
                  <Edit2 size={18} /> ملاحظة (السبب)
                </h3>
                {editModal.notes && (
                  <button
                    onClick={() => setEditModal({ ...editModal, notes: '' })}
                    className="handleadminreports-style-55"
                    title="حذف الملاحظة"
                  >
                    <X size={14} /> حذف
                  </button>
                )}
              </div>
              <textarea
                value={editModal.notes}
                onChange={(e) => setEditModal({ ...editModal, notes: e.target.value })}
                placeholder="أدخل سبب التعديل أو تفاصيل الإجازة/سفر العمل..."
                className="handleadminreports-style-56"
              />
            </div>

            <div className="handleadminreports-style-57">
              <button
                onClick={handleEditTime}
                className="handleadminreports-style-58"
              >
                <Save size={18} /> حفظ
              </button>
              <button
                onClick={() => setEditModal({ isOpen: false, log: null, checkInTime: '', checkOutTime: '', status: '', notes: '' })}
                className="handleadminreports-style-59"
              >
                <X size={18} /> إلغاء
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminGuard>
  );
};

export default HandleAdminReports;
