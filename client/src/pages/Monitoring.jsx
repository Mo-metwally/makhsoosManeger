import React, { useState, useEffect } from 'react';
import { Activity, Clock, Calendar, AlertTriangle, Coffee, Moon, BookOpen, ChevronRight, ChevronLeft } from 'lucide-react';
import './Monitoring.css';

const Monitoring = () => {
  const [logs, setLogs] = useState([]);
  const [filter, setFilter] = useState('today'); // 'today', 'week', 'month', 'all'
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 6;

  // Reset page when filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [filter]);

  useEffect(() => {
    document.title = "مراقبة الأداء | مخصوص";
    const savedLogs = JSON.parse(localStorage.getItem('inactivity_logs') || '[]');
    // Sort by newest first
    savedLogs.sort((a, b) => new Date(b.startTime) - new Date(a.startTime));
    setLogs(savedLogs);
  }, []);

  const getFilteredLogs = () => {
    if (filter === 'all') return logs;
    
    const now = new Date();
    
    return logs.filter(log => {
      const logDate = new Date(log.startTime);
      
      if (filter === 'today') {
        return logDate.toDateString() === now.toDateString();
      }
      
      if (filter === 'week') {
        const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        return logDate >= oneWeekAgo;
      }
      
      if (filter === 'month') {
        return logDate.getMonth() === now.getMonth() && logDate.getFullYear() === now.getFullYear();
      }
      
      return true;
    });
  };

  const filteredLogs = getFilteredLogs();
  const totalPages = Math.ceil(filteredLogs.length / ITEMS_PER_PAGE);
  const currentLogs = filteredLogs.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  // Calculate total duration for filtered logs in minutes
  const totalDurationMs = filteredLogs.reduce((total, log) => total + log.durationMs, 0);
  const totalMinutes = Math.floor(totalDurationMs / (1000 * 60));
  const totalHours = Math.floor(totalMinutes / 60);
  const remainingMinutes = totalMinutes % 60;

  const formatDate = (isoString) => {
    const date = new Date(isoString);
    return date.toLocaleString('ar-EG', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatTime = (isoString) => {
    const date = new Date(isoString);
    return date.toLocaleTimeString('ar-EG', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDuration = (ms) => {
    const minutes = Math.floor(ms / (1000 * 60));
    if (minutes >= 60) {
      const h = Math.floor(minutes / 60);
      const m = minutes % 60;
      return `${h} ساعة و ${m} دقيقة`;
    }
    return `${minutes} دقيقة`;
  };

  return (
    <div className="monitoring-container">
      <header className="page-header">
        <div className="page-title-wrapper">
          <Activity size={28} className="title-icon text-blue" />
          <h1 className="page-title gradient-title">مراقبة الأداء</h1>
        </div>
      </header>

      {/* Stats Summary */}
      <div className="monitoring-summary">
        <div className="summary-card">
          <div className="summary-icon">
            <Clock size={28} />
          </div>
          <div className="summary-info">
            <h3>إجمالي وقت الخمول ({filter === 'today' ? 'اليوم' : filter === 'week' ? 'هذا الأسبوع' : filter === 'month' ? 'هذا الشهر' : 'الكل'})</h3>
            <div className="summary-value">
              {totalHours > 0 ? (
                <>
                  <span className="number">{totalHours}</span> <span className="label">ساعة</span> 
                  <span className="number">{remainingMinutes}</span> <span className="label">دقيقة</span>
                </>
              ) : (
                <>
                  <span className="number">{totalMinutes}</span> <span className="label">دقيقة</span>
                </>
              )}
            </div>
            <p className="summary-desc">بناءً على فترات الخمول التي تتجاوز 10 دقائق متصلة.</p>
          </div>
        </div>
      </div>

      <div className="filter-section">
        <div className="filter-group-container">
          <h3 className="filter-title">تصفية السجل:</h3>
          <div className="radio-filter-group">
            <label className="filter-radio">
              <input 
                type="radio" 
                name="timeFilter" 
                value="today" 
                checked={filter === 'today'} 
                onChange={(e) => setFilter(e.target.value)} 
              />
              <span>اليوم</span>
            </label>
            <label className="filter-radio">
              <input 
                type="radio" 
                name="timeFilter" 
                value="week" 
                checked={filter === 'week'} 
                onChange={(e) => setFilter(e.target.value)} 
              />
              <span>الأسبوع</span>
            </label>
            <label className="filter-radio">
              <input 
                type="radio" 
                name="timeFilter" 
                value="month" 
                checked={filter === 'month'} 
                onChange={(e) => setFilter(e.target.value)} 
              />
              <span>الشهر</span>
            </label>
            <label className="filter-radio">
              <input 
                type="radio" 
                name="timeFilter" 
                value="all" 
                checked={filter === 'all'} 
                onChange={(e) => setFilter(e.target.value)} 
              />
              <span>الكل</span>
            </label>
          </div>
        </div>
      </div>

      <div className="table-container">
        <table className="calls-table">
          <thead>
            <tr>
              <th>التاريخ</th>
              <th>نوع الفترة</th>
              <th>بداية الفترة</th>
              <th>وقت العودة (النشاط)</th>
              <th>المدة الإجمالية</th>
              <th>الحالة</th>
            </tr>
          </thead>
          <tbody>
            {currentLogs.length > 0 ? (
              currentLogs.map(log => {
                const isIdle = !log.type || log.type === 'idle';
                return (
                  <tr key={log.id}>
                    <td className="date-cell">
                      <div className="date-content">
                        <Calendar size={14} className="cell-icon text-orange" />
                        <span>{formatDate(log.startTime)}</span>
                      </div>
                    </td>
                    <td>
                      {isIdle ? (
                        <span className="status-badge badge-warning">
                          <Activity size={14} style={{marginLeft: '4px'}} />
                          خمول تجاوز الحد
                        </span>
                      ) : log.type === 'بريك غداء' ? (
                        <span className="status-badge badge-info" style={{backgroundColor: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b', borderColor: '#f59e0b'}}>
                          <Coffee size={14} style={{marginLeft: '4px'}} />
                          {log.type}
                        </span>
                      ) : log.type === 'بريك صلاة' ? (
                        <span className="status-badge badge-success" style={{backgroundColor: 'rgba(139, 92, 246, 0.1)', color: '#8b5cf6', borderColor: '#8b5cf6'}}>
                          <Moon size={14} style={{marginLeft: '4px'}} />
                          {log.type}
                        </span>
                      ) : log.type === 'تدريب' ? (
                        <span className="status-badge badge-primary" style={{backgroundColor: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', borderColor: '#3b82f6'}}>
                          <BookOpen size={14} style={{marginLeft: '4px'}} />
                          {log.type}
                        </span>
                      ) : (
                         <span className="status-badge badge-default">{log.type}</span>
                      )}
                    </td>
                    <td className="time-cell" dir="ltr">{formatTime(log.startTime)}</td>
                    <td className="time-cell" dir="ltr">{formatTime(log.endTime)}</td>
                    <td className="duration-cell">
                      <span className="duration-badge">
                        {formatDuration(log.durationMs)}
                      </span>
                    </td>
                    <td>
                      {isIdle ? (
                        <span className="text-orange" style={{fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '4px'}}>
                          <AlertTriangle size={14} /> تنبيه
                        </span>
                      ) : (
                        <span style={{color: '#22c55e', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '4px'}}>
                          مسجل ✔️
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan="6" className="empty-state">
                  <div className="empty-content">
                    <Activity size={40} className="empty-icon text-orange" />
                    <p>لا يوجد فترات خمول مسجلة تتجاوز 10 دقائق في هذه الفترة.</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>

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
  );
};

export default Monitoring;
