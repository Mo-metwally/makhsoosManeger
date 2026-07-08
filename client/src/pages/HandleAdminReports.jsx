import React, { useState, useEffect } from 'react';
import { Activity, Search, Trash2, ChevronRight, ChevronLeft, Users, LogIn, LogOut, CheckCircle, Calendar } from 'lucide-react';
import AdminGuard from '../components/AdminGuard';
import CustomSelect from '../components/CustomSelect';
import api from '../services/api';
import './Monitoring.css';

const HandleAdminReports = () => {
  const [attendanceLogs, setAttendanceLogs] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [timeFilter, setTimeFilter] = useState('all');
  const [employeeFilter, setEmployeeFilter] = useState('all');
  const [sortBy, setSortBy] = useState('date_desc');
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 8; // Adjust if needed

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
    const hours = Math.floor(diffMins / 60);
    const mins = diffMins % 60;
    
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

  // Time Filter
  if (timeFilter !== 'all') {
    filteredLogs = filteredLogs.filter(log => {
      const logDate = new Date(log.date || log.createdAt);
      if (timeFilter === 'today') {
        return logDate.toDateString() === now.toDateString();
      }
      if (timeFilter === 'yesterday') {
        const yesterday = new Date(now);
        yesterday.setDate(yesterday.getDate() - 1);
        return logDate.toDateString() === yesterday.toDateString();
      }
      if (timeFilter === 'week') {
        const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        return logDate >= oneWeekAgo;
      }
      if (timeFilter === 'month') {
        return logDate.getMonth() === now.getMonth() && logDate.getFullYear() === now.getFullYear();
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
            <h1 className="page-title gradient-title">سجل المراقبة المجمع (إدارة)</h1>
            <div style={{ color: 'var(--text-secondary)' }}>
              إجمالي السجلات: <strong>{attendanceLogs.length}</strong>
            </div>
          </div>
        </header>

        <div className="filter-section" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', position: 'relative', zIndex: 10 }}>
          
          {/* Time Filters */}
          <div className="admin-filter-group">
            {['all', 'today', 'yesterday', 'week', 'month'].map(val => (
              <div className="admin-filter-radio" key={val}>
                <label>
                  <input 
                    type="radio" 
                    name="timeFilter" 
                    value={val} 
                    checked={timeFilter === val} 
                    onChange={(e) => setTimeFilter(e.target.value)} 
                  /> 
                  <span>{val === 'all' ? 'الكل' : val === 'today' ? 'اليوم' : val === 'yesterday' ? 'أمس' : val === 'week' ? 'الأسبوع' : 'الشهر'}</span>
                  {timeFilter === val && <div className="radio-bg"></div>}
                </label>
              </div>
            ))}
          </div>

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
                </tr>
              </thead>
              <tbody>
                {currentLogs.map(log => (
                  <tr key={log.id}>
                    <td>
                      <div style={{ fontWeight: 'bold', color: 'var(--theme-color)', fontSize: '1.1rem' }}>{log.User ? log.User.fullName : '---'}</div>
                      <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>{log.User ? log.User.jobTitle : ''}</div>
                    </td>
                    <td>{formatDate(log.date)}</td>
                    <td>{log.Shift ? log.Shift.name : '---'}</td>
                    <td style={{ color: '#10b981' }}><LogIn size={16} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }} /> {formatTime(log.checkInTime)}</td>
                    <td style={{ color: log.checkOutTime ? '#ef4444' : 'var(--text-secondary)' }}>
                      {log.checkOutTime ? <><LogOut size={16} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }} /> {formatTime(log.checkOutTime)}</> : 'لم ينصرف بعد'}
                    </td>
                    <td>
                      <div style={{ fontSize: '0.85rem', display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                        {log.breakDetails && log.breakDetails['بريك صلاة'] > 0 && (
                          <div style={{ color: 'var(--text-secondary)' }}><span style={{marginRight: '4px'}}>🕋</span>صلاة: {(() => {
                            const totalMins = Math.floor(log.breakDetails['بريك صلاة'] / 60000);
                            const hours = Math.floor(totalMins / 60);
                            const mins = totalMins % 60;
                            return hours > 0 ? `${hours} س ${mins} د` : `${mins} دقيقة`;
                          })()}</div>
                        )}
                        {log.breakDetails && log.breakDetails['بريك غداء'] > 0 && (
                          <div style={{ color: 'var(--text-secondary)' }}><span style={{marginRight: '4px'}}>🍔</span>غداء: {(() => {
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
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.4rem 0.8rem', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', borderRadius: '20px', fontSize: '0.85rem' }}>
                        <CheckCircle size={14} /> مسجل
                      </span>
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
    </AdminGuard>
  );
};

export default HandleAdminReports;
