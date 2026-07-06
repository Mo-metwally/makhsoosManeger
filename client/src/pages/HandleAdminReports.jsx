import React, { useState, useEffect } from 'react';
import { Activity, Search, AlertTriangle, Coffee, Moon, BookOpen, Trash2, ChevronRight, ChevronLeft } from 'lucide-react';
import AdminGuard from '../components/AdminGuard';
import CustomSelect from '../components/CustomSelect';
import { applyFiltersAndSort } from '../utils/filterAndSort';
import './Monitoring.css'; // Reuse monitoring styles

const HandleAdminReports = () => {
  const [logs, setLogs] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [timeFilter, setTimeFilter] = useState('all');
  const [supervisorFilter, setSupervisorFilter] = useState('all');
  const [sortBy, setSortBy] = useState('date_desc');
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 6;

  useEffect(() => {
    document.title = "سجل المراقبة المجمع | مخصوص";
    const savedLogs = JSON.parse(localStorage.getItem('admin_aggregated_logs') || '[]');
    setLogs(savedLogs);
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, timeFilter, supervisorFilter, sortBy]);

  const handleClearData = () => {
    if (window.confirm('هل أنت متأكد من مسح جميع فترات الراحة والخمول المجمعة؟')) {
      localStorage.removeItem('admin_aggregated_logs');
      setLogs([]);
    }
  };

  const uniqueSupervisors = Array.from(new Set(logs.map(l => l.supervisorName).filter(Boolean)));

  const filteredLogs = applyFiltersAndSort(logs, { timeFilter, supervisorFilter, searchQuery, sortBy }, true);
  const totalPages = Math.ceil(filteredLogs.length / ITEMS_PER_PAGE);
  const currentLogs = filteredLogs.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  return (
    <AdminGuard>
      <div className="monitoring-container">
        <header className="page-header">
          <div className="page-title-wrapper">
            <Activity size={28} className="title-icon text-blue" />
            <h1 className="page-title gradient-title">سجل المراقبة المجمع (إدارة)</h1>
          </div>
          <div style={{ color: 'var(--text-secondary)' }}>
            إجمالي الفترات: <strong>{logs.length}</strong>
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
                placeholder="بحث باسم المشرف أو نوع الفترة..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="search-input"
              />
            </div>
            
            <CustomSelect 
              options={[
                { value: 'all', label: 'كل المشرفين (الجميع)' },
                ...uniqueSupervisors.map(name => ({ value: name, label: name }))
              ]}
              value={supervisorFilter} 
              onChange={setSupervisorFilter}
              placeholder="اختر المشرف"
            />

            <CustomSelect 
              options={[
                { value: 'date_desc', label: 'الأحدث أولاً' },
                { value: 'date_asc', label: 'الأقدم أولاً' },
                { value: 'supervisor_asc', label: 'المشرف (أ - ي)' },
                { value: 'supervisor_desc', label: 'المشرف (ي - أ)' }
              ]}
              value={sortBy} 
              onChange={setSortBy}
              placeholder="ترتيب حسب"
            />
            
            <button
              className="btn-save"
              onClick={handleClearData}
              title="مسح قاعدة البيانات المجمعة"
              style={{ 
                display: 'flex', alignItems: 'center', gap: '8px', 
                padding: '0.8rem 1.5rem', border: 'none', borderRadius: '12px', 
                cursor: 'pointer', fontWeight: 'bold',
                backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#ef4444',
                margin: 0
              }}
            >
              <Trash2 size={18} />
              <span>مسح السجل</span>
            </button>
          </div>
        </div>

        <div className="table-container">
          <table className="calls-table">
            <thead>
              <tr>
                <th>المشرف (رافع التقرير)</th>
                <th>نوع الفترة</th>
                <th>وقت البداية</th>
                <th>وقت العودة (النشاط)</th>
                <th>المدة الإجمالية</th>
                <th>الحالة</th>
              </tr>
            </thead>
            <tbody>
              {currentLogs.length > 0 ? (
                currentLogs.map(log => {
                  const isIdle = !log.type || log.type === 'idle' || log.type === 'خمول تجاوز الحد';
                  return (
                    <tr key={log.id}>
                      <td><strong style={{ color: 'var(--theme-color)' }}>{log.supervisorName}</strong></td>
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
                      <td className="time-cell" dir="ltr">{log.startTimeString}</td>
                      <td className="time-cell" dir="ltr">{log.endTimeString}</td>
                      <td className="duration-cell">
                        <span className="duration-badge">
                          {log.durationString}
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
                      <p>لا يوجد فترات خمول أو راحة مسجلة حالياً.</p>
                      <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.5rem' }}>
                        قم بالذهاب إلى صفحة handleAdminAdd لرفع ملفات ZIP.
                      </span>
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
    </AdminGuard>
  );
};

export default HandleAdminReports;
