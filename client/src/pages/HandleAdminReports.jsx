import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Activity, Search, Trash2, ChevronRight, ChevronLeft, Users, LogIn, LogOut, CheckCircle, Calendar, Edit2, X, Save, Clock, XCircle } from 'lucide-react';
import AdminGuard from '../components/AdminGuard';
import CustomSelect from '../components/CustomSelect';
import { getLogicalDateString } from '../utils/dateHelpers';
import api from '../services/api';
import './Monitoring.css';
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
  const [sortBy, setSortBy] = useState('date_desc');
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 8; // Adjust if needed

  const [editModal, setEditModal] = useState({ isOpen: false, log: null, checkInTime: '', checkOutTime: '', status: '' });
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
        status: editModal.status || undefined
      });
      showToast('تم تحديث السجل بنجاح', 'success');
      setEditModal({ isOpen: false, log: null, checkInTime: '', checkOutTime: '', status: '' });
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
    const actualDelayMins = diffMins - allowedDelay;

    if (actualDelayMins <= 0) return 'لا يوجد';

    const hours = Math.floor(actualDelayMins / 60);
    const mins = actualDelayMins % 60;

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

  const uniqueEmployees = Array.from(new Set(attendanceLogs.map(l => l.User?.fullName).filter(Boolean)));

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

  // Employee Filter
  if (employeeFilter !== 'all') {
    filteredLogs = filteredLogs.filter(log => log.User?.fullName === employeeFilter);
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
            <div style={{ color: 'var(--text-secondary)' }}>
              إجمالي السجلات: <strong>{attendanceLogs.length}</strong>
            </div>
          </div>
        </header>

        <div className="filter-section" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', position: 'relative', zIndex: 10 }}>

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

          {timeFilter === 'custom' && (
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap', background: 'var(--glass-bg)', padding: '1rem', borderRadius: '12px', border: 'var(--glass-border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ color: 'var(--text-secondary)' }}>من:</span>
                <input type="date" value={customStartDate} onChange={e => setCustomStartDate(e.target.value)} className="search-input" style={{ width: 'auto', padding: '0.5rem', margin: 0 }} />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ color: 'var(--text-secondary)' }}>إلى:</span>
                <input type="date" value={customEndDate} onChange={e => setCustomEndDate(e.target.value)} className="search-input" style={{ width: 'auto', padding: '0.5rem', margin: 0 }} />
              </div>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
            <div className="search-bar" style={{ flex: 1, minWidth: '250px', maxWidth: '400px', margin: 0 }}>
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
              placeholder="اختر الموظف"
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
            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)', background: 'var(--glass-bg)', borderRadius: '16px', border: 'var(--glass-border)' }}>
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
                  <th>الاستراحات</th>
                  <th>التأخير</th>
                  <th>الحالة</th>
                  <th>إجراء</th>
                </tr>
              </thead>
              <tbody>
                {currentLogs.map(log => (
                  <tr key={log.id}>
                    <td>
                      <div style={{ fontWeight: 'bold', color: 'var(--theme-color)', fontSize: '1.1rem' }}>{log.User ? log.User.fullName : '---'}</div>
                      <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.2rem', marginBottom: '0.5rem' }}>{log.User ? log.User.jobTitle : ''}</div>
                      {log.userId && (
                        <Link
                          to={`/personal-followup/${log.userId}`}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.3rem',
                            padding: '0.3rem 0.6rem',
                            background: 'rgba(59, 130, 246, 0.15)',
                            color: '#60a5fa',
                            borderRadius: '4px',
                            textDecoration: 'none',
                            fontSize: '0.75rem',
                            fontWeight: 'bold',
                            transition: 'background 0.2s',
                          }}
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
                      {log.checkInTime ? <><LogIn size={16} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }} /> {formatTime(log.checkInTime)}</> : '---'}
                    </td>
                    <td style={{ color: log.checkOutTime ? '#ef4444' : 'var(--text-secondary)' }}>
                      {log.checkOutTime ? <><LogOut size={16} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }} /> {formatTime(log.checkOutTime)}</> : (log.status === 'Present' ? 'لم ينصرف بعد' : '---')}
                    </td>
                    <td>
                      <div style={{ fontSize: '0.85rem', display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                        {log.breakDetails && log.breakDetails['بريك صلاة'] > 0 && (
                          <div style={{ color: 'var(--text-secondary)' }}><span style={{ marginRight: '4px' }}>🕋</span>صلاة: {(() => {
                            const totalMins = Math.floor(log.breakDetails['بريك صلاة'] / 60000);
                            const hours = Math.floor(totalMins / 60);
                            const mins = totalMins % 60;
                            return hours > 0 ? `${hours} س ${mins} د` : `${mins} دقيقة`;
                          })()}</div>
                        )}
                        {log.breakDetails && log.breakDetails['بريك غداء'] > 0 && (
                          <div style={{ color: 'var(--text-secondary)' }}><span style={{ marginRight: '4px' }}>🍔</span>غداء: {(() => {
                            const totalMins = Math.floor(log.breakDetails['بريك غداء'] / 60000);
                            const hours = Math.floor(totalMins / 60);
                            const mins = totalMins % 60;
                            return hours > 0 ? `${hours} س ${mins} د` : `${mins} دقيقة`;
                          })()}</div>
                        )}
                        {(!log.breakDetails || (log.breakDetails['بريك صلاة'] === 0 && log.breakDetails['بريك غداء'] === 0)) && (
                          <span style={{ color: 'var(--text-secondary)' }}>لا يوجد</span>
                        )}
                      </div>
                    </td>
                    <td style={{ color: '#f59e0b', fontWeight: 'bold' }}>
                      {calculateDelay(log.checkInTime, log.Shift?.startTime)}
                    </td>
                    <td>
                      {log.status === 'Absent' ? (
                        <span className="status-badge" style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444' }}>
                          <X size={14} /> غياب
                        </span>
                      ) : log.status === 'DayOffWork' || log.status === 'DayOff' ? (
                        <span className="status-badge" style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6' }}>
                          <Calendar size={14} /> إجازة
                        </span>
                      ) : log.status === 'Late' ? (
                        <span className="status-badge" style={{ background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b' }}>
                          <Clock size={14} /> تأخير
                        </span>
                      ) : (
                        <span className="status-badge" style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981' }}>
                          <CheckCircle size={14} /> حضور
                        </span>
                      )}
                    </td>
                    <td>
                      <button 
                        onClick={() => {
                          setEditModal({
                            isOpen: true,
                            log: log,
                            checkInTime: log.checkInTime ? new Date(log.checkInTime).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : '',
                            checkOutTime: log.checkOutTime ? new Date(log.checkOutTime).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : '',
                            status: log.status
                          });
                        }}
                        style={{
                          background: 'rgba(255, 255, 255, 0.1)',
                          border: 'none',
                          color: 'var(--text-secondary)',
                          padding: '0.5rem',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          transition: '0.3s'
                        }}
                        title="تعديل الوقت"
                        onMouseOver={(e) => e.currentTarget.style.color = 'var(--theme-color)'}
                        onMouseOut={(e) => e.currentTarget.style.color = 'var(--text-secondary)'}
                      >
                        <Edit2 size={18} />
                      </button>
                    </td>
                  </tr>
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
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div style={{ background: 'var(--bg-main)', padding: '2rem', borderRadius: '16px', width: '90%', maxWidth: '400px', border: '1px solid var(--border-color)', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }}>
            <h3 style={{ color: 'var(--text-primary)', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Edit2 size={24} className="text-blue" />
              تعديل أوقات السجل
            </h3>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
              موظف: <strong>{editModal.log?.User?.fullName}</strong><br/>
              تاريخ: {formatDate(editModal.log?.date)}
            </p>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>وقت الحضور</label>
              <input 
                type="time" 
                value={editModal.checkInTime} 
                onChange={(e) => setEditModal({...editModal, checkInTime: e.target.value})}
                style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
              />
            </div>
            
            <div style={{ marginBottom: '2rem' }}>
              <label style={{ display: 'block', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>وقت الانصراف</label>
              <input 
                type="time" 
                value={editModal.checkOutTime} 
                onChange={(e) => setEditModal({...editModal, checkOutTime: e.target.value})}
                style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
              />
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>حالة الحضور</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div 
                  onClick={() => setEditModal({...editModal, status: 'Present'})}
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
                  onClick={() => setEditModal({...editModal, status: 'Absent'})}
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
                  onClick={() => setEditModal({...editModal, status: 'Late'})}
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
                  onClick={() => setEditModal({...editModal, status: 'DayOffWork'})}
                  style={{
                    padding: '0.75rem', borderRadius: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem',
                    border: editModal.status === 'DayOffWork' ? '2px solid #3b82f6' : '1px solid rgba(255,255,255,0.1)',
                    background: editModal.status === 'DayOffWork' ? 'rgba(59, 130, 246, 0.15)' : 'rgba(255,255,255,0.02)',
                    transition: 'all 0.2s ease'
                  }}>
                  <Calendar size={20} color={editModal.status === 'DayOffWork' ? '#3b82f6' : 'var(--text-secondary)'} />
                  <span style={{ color: editModal.status === 'DayOffWork' ? '#3b82f6' : 'var(--text-primary)', fontWeight: editModal.status === 'DayOffWork' ? 'bold' : 'normal' }}>إجازة</span>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '1rem' }}>
              <button 
                onClick={handleEditTime}
                style={{ flex: 1, background: 'var(--theme-color)', color: 'white', padding: '0.8rem', borderRadius: '8px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', border: 'none', fontWeight: 'bold' }}
              >
                <Save size={18} /> حفظ
              </button>
              <button 
                onClick={() => setEditModal({ isOpen: false, log: null, checkInTime: '', checkOutTime: '', status: '' })}
                style={{ flex: 1, background: 'rgba(255,255,255,0.1)', color: 'var(--text-primary)', padding: '0.8rem', borderRadius: '8px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', border: 'none' }}
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
