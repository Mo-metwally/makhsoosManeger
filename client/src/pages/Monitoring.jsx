import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Activity, Clock, Calendar, AlertTriangle, Coffee, Moon, BookOpen, ChevronRight, ChevronLeft, User, RefreshCw, Loader, Shield, Cat, Crown, Star, Smile, Briefcase, Flame, Zap, Heart, Search, Users, ArrowUpDown, ChevronDown } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { getLogicalDateString } from '../utils/dateHelpers';
import CustomSelect from '../components/CustomSelect';
import AdminNavBar from '../components/AdminNavBar';
import AvatarIcon from '../components/AvatarIcon';
import './Monitoring.css';

const Monitoring = ({ isMyMonitoring = false }) => {
  const { user } = useAuth();
  const [logs, setLogs] = useState([]);
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const initialEmployeeName = searchParams.get('employeeName');

  const [filter, setFilter] = useState('today'); // 'today', 'week', 'month', 'all'
  const [recordTypeFilter, setRecordTypeFilter] = useState('all'); // 'all', 'idle', 'breaks'
  const [searchQuery, setSearchQuery] = useState('');
  const [myStatsOnly, setMyStatsOnly] = useState(false);
  const [selectedSupervisor, setSelectedSupervisor] = useState(initialEmployeeName || 'all');
  const [sortBy, setSortBy] = useState('newest');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 6;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filter, recordTypeFilter, searchQuery, myStatsOnly, selectedSupervisor, sortBy]);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get('/data/admin/all');
      if (res.data && res.data.inactivity) {
        const sortedLogs = res.data.inactivity.sort((a, b) => new Date(b.startTime) - new Date(a.startTime));
        setLogs(sortedLogs);
      }
    } catch (err) {
      console.error('Error fetching monitoring logs:', err);
      setError('حدث خطأ أثناء جلب بيانات المتابعة. يرجى المحاولة مرة أخرى.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    document.title = "المتابعة الخمول | مخصوص";
    fetchLogs();

    // Auto refresh every 2 minutes
    const interval = setInterval(() => {
      fetchLogs();
    }, 2 * 60 * 1000);

    return () => clearInterval(interval);
  }, []);

  const getFilteredLogs = () => {
    let filtered = logs;

    if (isMyMonitoring || (myStatsOnly && user)) {
      if (user) {
        filtered = filtered.filter(log => log.userId === user.id);
      }
    }

    if (searchQuery) {
      filtered = filtered.filter(log => {
        const name = log.User?.fullName || log.supervisorName || '';
        return name.toLowerCase().includes(searchQuery.toLowerCase());
      });
    }

    if (selectedSupervisor !== 'all') {
      filtered = filtered.filter(log => {
        const name = log.User?.fullName || log.supervisorName || '';
        return name === selectedSupervisor;
      });
    }

    if (filter !== 'all') {
      const now = new Date();
      filtered = filtered.filter(log => {
        const logDate = new Date(log.startTime);

        if (filter === 'today') {
          return getLogicalDateString(logDate) === getLogicalDateString(now);
        } else if (filter === 'yesterday') {
          const yesterday = new Date(now);
          yesterday.setDate(yesterday.getDate() - 1);
          return getLogicalDateString(logDate) === getLogicalDateString(yesterday);
        } else if (filter === 'custom') {
          let isValid = true;
          if (customStartDate) {
            const start = new Date(customStartDate);
            start.setHours(0, 0, 0, 0);
            if (logDate < start) isValid = false;
          }
          if (customEndDate) {
            const end = new Date(customEndDate);
            end.setHours(23, 59, 59, 999);
            if (logDate > end) isValid = false;
          }
          return isValid;
        } else if (filter === 'week') {
          const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          return logDate >= weekAgo;
        } else if (filter === 'month') {
          const monthAgo = new Date(now.setMonth(now.getMonth() - 1));
          return logDate >= monthAgo;
        }
        return true;
      });
    }

    if (recordTypeFilter === 'idle') {
      filtered = filtered.filter(log => !log.type || log.type === 'idle');
    } else if (recordTypeFilter === 'breaks') {
      filtered = filtered.filter(log => log.type && log.type !== 'idle');
    }

    // Sort
    if (sortBy === 'newest') {
      filtered.sort((a, b) => new Date(b.startTime) - new Date(a.startTime));
    } else if (sortBy === 'supervisor') {
      filtered.sort((a, b) => (a.supervisorName || '').localeCompare(b.supervisorName || ''));
    }

    return filtered;
  };

  const filteredLogs = getFilteredLogs();
  const totalPages = Math.ceil(filteredLogs.length / ITEMS_PER_PAGE);
  const currentLogs = filteredLogs.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);
  const uniqueNames = [...new Set(logs.map(log => log.User?.fullName || log.supervisorName).filter(Boolean))];

  const employeeOptions = [
    { value: 'all', label: 'كل الموظفين' },
    ...uniqueNames.map(name => ({ value: name, label: name }))
  ];

  const sortOptions = [
    { value: 'newest', label: 'الأحدث أولاً' },
    { value: 'supervisor', label: 'حسب اسم الموظف' }
  ];

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
      {!isMyMonitoring && <AdminNavBar />}
      <header className="page-header">
        <div className="page-title-wrapper" style={{ display: 'flex', alignItems: 'center', gap: '1rem', width: '100%', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <Activity size={28} className="title-icon text-blue" />
            <h1 className="page-title gradient-title">{isMyMonitoring ? 'متابعة الخمول الخاصة بي' : 'المتابعة الخمول للاستراحات'}</h1>
          </div>
          <button
            onClick={fetchLogs}
            disabled={loading}
            style={{
              background: 'rgba(59, 130, 246, 0.1)',
              color: 'var(--blue)',
              border: '1px solid rgba(59, 130, 246, 0.3)',
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
            <span style={{ fontSize: '0.9rem', fontWeight: 'bold' }}>تحديث</span>
          </button>
        </div>
      </header>

      {/* Stats Summary */}
      <div className="monitoring-summary">
        <div className="summary-card">
          <div className="summary-icon">
            <Clock size={28} />
          </div>
          <div className="summary-info">
            <h3>إجمالي وقت الخمول ({filter === 'today' ? 'اليوم' : filter === 'yesterday' ? 'أمس' : filter === 'week' ? 'هذا الأسبوع' : filter === 'month' ? 'هذا الشهر' : filter === 'custom' ? 'مخصص' : 'الكل'})</h3>
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
        <div className="filter-toolbar">

          {/* Top Row: Time Filters and Type Filters */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2rem', width: '100%' }}>
            <div className="filter-group-container">
              <h3 className="filter-title">تصفية السجل:</h3>
              <div className="mon-radio-filter-group">
                <label className="mon-filter-radio">
                  <input
                    type="radio"
                    name="timeFilter"
                    value="today"
                    checked={filter === 'today'}
                    onChange={(e) => setFilter(e.target.value)}
                  />
                  <span>اليوم</span>
                </label>
                <label className="mon-filter-radio">
                  <input
                    type="radio"
                    name="timeFilter"
                    value="yesterday"
                    checked={filter === 'yesterday'}
                    onChange={(e) => setFilter(e.target.value)}
                  />
                  <span>أمس</span>
                </label>
                <label className="mon-filter-radio">
                  <input
                    type="radio"
                    name="timeFilter"
                    value="week"
                    checked={filter === 'week'}
                    onChange={(e) => setFilter(e.target.value)}
                  />
                  <span>الأسبوع</span>
                </label>
                <label className="mon-filter-radio">
                  <input
                    type="radio"
                    name="timeFilter"
                    value="month"
                    checked={filter === 'month'}
                    onChange={(e) => setFilter(e.target.value)}
                  />
                  <span>الشهر</span>
                </label>
                <label className="mon-filter-radio">
                  <input
                    type="radio"
                    name="timeFilter"
                    value="all"
                    checked={filter === 'all'}
                    onChange={(e) => setFilter(e.target.value)}
                  />
                  <span>الكل</span>
                </label>
                <label className="mon-filter-radio">
                  <input
                    type="radio"
                    name="timeFilter"
                    value="custom"
                    checked={filter === 'custom'}
                    onChange={(e) => setFilter(e.target.value)}
                  />
                  <span>مخصص</span>
                </label>
              </div>
              {filter === 'custom' && (
                <div className="custom-date-filters fade-in" style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                    <label style={{ fontSize: '0.85rem', color: '#94a3b8' }}>من تاريخ</label>
                    <input type="date" className="employee-search-input" value={customStartDate} onChange={(e) => setCustomStartDate(e.target.value)} style={{ padding: '0.4rem', borderRadius: '6px', background: 'rgba(15, 23, 42, 0.6)' }} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                    <label style={{ fontSize: '0.85rem', color: '#94a3b8' }}>إلى تاريخ</label>
                    <input type="date" className="employee-search-input" value={customEndDate} onChange={(e) => setCustomEndDate(e.target.value)} style={{ padding: '0.4rem', borderRadius: '6px', background: 'rgba(15, 23, 42, 0.6)' }} />
                  </div>
                </div>
              )}

            </div>
            {!isMyMonitoring && (
              <div className="search-container">
                <div className="search-icon-box">
                  <Search size={18} />
                </div>
                <input
                  type="text"
                  placeholder="ابحث باسم الموظف..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="employee-search-input"
                />
              </div>
            )}
          </div>

          <div className="advanced-filters-container">
            <div className="filter-actions-container" style={{ justifyContent: 'flex-start', flexWrap: 'wrap' }}>
              <div className="filter-group-container" style={{ marginTop: filter === 'custom' ? '1rem' : '0' }}>
                <h3 className="filter-title">نوع السجل:</h3>
                <div className="mon-radio-filter-group">
                  <label className="mon-filter-radio">
                    <input
                      type="radio"
                      name="recordTypeFilter"
                      value="all"
                      checked={recordTypeFilter === 'all'}
                      onChange={(e) => setRecordTypeFilter(e.target.value)}
                    />
                    <span>الكل</span>
                  </label>
                  <label className="mon-filter-radio">
                    <input
                      type="radio"
                      name="recordTypeFilter"
                      value="idle"
                      checked={recordTypeFilter === 'idle'}
                      onChange={(e) => setRecordTypeFilter(e.target.value)}
                    />
                    <span>خمول فقط</span>
                  </label>
                  <label className="mon-filter-radio">
                    <input
                      type="radio"
                      name="recordTypeFilter"
                      value="breaks"
                      checked={recordTypeFilter === 'breaks'}
                      onChange={(e) => setRecordTypeFilter(e.target.value)}
                    />
                    <span>استراحات فقط</span>
                  </label>
                </div>
              </div>

            </div>
          </div>

          <div className="advanced-filters-container">
            {!isMyMonitoring && (
              <button
                onClick={() => setMyStatsOnly(!myStatsOnly)}
                className={`my-stats-toggle ${myStatsOnly ? 'active' : ''}`}
              >
                <User size={18} />
                <span>بياناتي</span>
              </button>
            )}
            {!isMyMonitoring && (
              <CustomSelect
                options={employeeOptions}
                value={selectedSupervisor}
                onChange={setSelectedSupervisor}
                icon={<Users size={18} />}
              />
            )}

            {!isMyMonitoring && (
              <CustomSelect
                options={sortOptions}
                value={sortBy}
                onChange={setSortBy}
                icon={<ArrowUpDown size={18} />}
              />
            )}

          </div>
        </div>
      </div>

      <div className="table-container">
        <table className="calls-table">
          <thead>
            <tr>
              <th>الموظف</th>
              <th>التاريخ</th>
              <th>نوع الفترة</th>
              <th style={{ textAlign: 'center' }}>التوقيت</th>
              <th style={{ textAlign: 'center' }}>المدة الإجمالية</th>
              <th>الحالة</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="7" className="empty-state">
                  <div className="empty-content">
                    <Loader size={40} className="spinner text-blue" />
                    <p>جاري تحميل السجلات...</p>
                  </div>
                </td>
              </tr>
            ) : error ? (
              <tr>
                <td colSpan="7" className="empty-state">
                  <div className="empty-content">
                    <AlertTriangle size={40} className="text-orange" />
                    <p>{error}</p>
                    <button onClick={fetchLogs} style={{ marginTop: '1rem', padding: '0.5rem 1rem', borderRadius: '8px', background: 'var(--blue)', color: 'white', border: 'none', cursor: 'pointer' }}>إعادة المحاولة</button>
                  </div>
                </td>
              </tr>
            ) : currentLogs.length > 0 ? (
              currentLogs.map(log => {
                const isIdle = !log.type || log.type === 'idle';
                const userAvatar = log.User?.avatar || 'User';
                return (
                  <tr key={log.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <div style={{
                          width: '40px',
                          height: '40px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          background: 'rgba(var(--theme-color-rgb, 59, 130, 246), 0.15)',
                          border: '1px solid rgba(var(--theme-color-rgb, 59, 130, 246), 0.3)',
                          borderRadius: '50%',
                          flexShrink: 0
                        }}>
                          <AvatarIcon name={userAvatar} size={20} color="var(--theme-color)" />
                        </div>
                        <div>
                          <div style={{ fontWeight: 'bold', color: 'var(--theme-color)' }}>{log.User ? log.User.fullName : (log.supervisorName || 'موظف')}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{log.User ? log.User.jobTitle : ''}</div>
                        </div>
                      </div>
                    </td>
                    <td className="date-cell">
                      <div className="date-content">
                        <Calendar size={14} className="cell-icon text-orange" />
                        <span>{formatDate(log.startTime)}</span>
                      </div>
                    </td>
                    <td>
                      {isIdle ? (
                        <span className="status-badge badge-warning">
                          <Activity size={14} style={{ marginLeft: '4px' }} />
                          خمول تجاوز الحد
                        </span>
                      ) : log.type === 'بريك غداء' ? (
                        <span className="status-badge badge-info" style={{ backgroundColor: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b', borderColor: '#f59e0b' }}>
                          <Coffee size={14} style={{ marginLeft: '4px' }} />
                          {log.type}
                        </span>
                      ) : log.type === 'بريك صلاة' ? (
                        <span className="status-badge badge-success" style={{ backgroundColor: 'rgba(139, 92, 246, 0.1)', color: '#8b5cf6', borderColor: '#8b5cf6' }}>
                          <Moon size={14} style={{ marginLeft: '4px' }} />
                          {log.type}
                        </span>
                      ) : log.type === 'تدريب' ? (
                        <span className="status-badge badge-primary" style={{ backgroundColor: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', borderColor: '#3b82f6' }}>
                          <BookOpen size={14} style={{ marginLeft: '4px' }} />
                          {log.type}
                        </span>
                      ) : (
                        <span className="status-badge badge-default">{log.type}</span>
                      )}
                    </td>
                    <td className="time-cell" dir="ltr">
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.4rem' }}>
                        <span style={{ color: 'var(--text-primary)' }}>{formatTime(log.startTime)}</span>
                        <div style={{ width: '30px', height: '1px', background: 'rgba(255,255,255,0.1)' }}></div>
                        <span style={{ color: 'var(--text-secondary)' }}>
                          {log.endTime ? formatTime(log.endTime) : '---'}
                        </span>
                      </div>
                    </td>
                    <td className="duration-cell" style={{ textAlign: 'center' }}>
                      <span className="duration-badge">
                        {formatDuration(log.durationMs)}
                      </span>
                    </td>
                    <td>
                      {!log.endTime ? (
                        <span className="text-orange" style={{ fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Activity size={14} className="spinner" /> قيد التقدم
                        </span>
                      ) : isIdle ? (
                        <span className="text-orange" style={{ fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <AlertTriangle size={14} /> تنبيه
                        </span>
                      ) : (
                        <span style={{ color: '#22c55e', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          مسجل ✔️
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan="7" className="empty-state">
                  <div className="empty-content">
                    <Coffee size={40} className="empty-icon text-orange" />
                    <p>لا توجد فترات استراحة مسجلة في هذه الفترة.</p>
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
