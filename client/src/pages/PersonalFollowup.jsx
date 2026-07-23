import React, { useEffect, useState } from 'react';
import { Activity, PhoneCall, TrendingUp, TrendingDown, Clock, LogIn, LogOut, Coffee, CalendarHeart, AlertCircle, BarChart2, Calendar as CalendarIcon, Filter, Star, CheckCircle } from 'lucide-react';
import { useParams, Link } from 'react-router-dom';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { getLogicalDateString } from '../utils/dateHelpers';
import "./PersonalFollowup.scss";
import { useToast } from '../contexts/ToastContext';

const PersonalFollowup = () => {
  const { showToast } = useToast();
  const { employeeId } = useParams();
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [attendanceStatus, setAttendanceStatus] = useState(null);
  const [hasSummaryToday, setHasSummaryToday] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [showEarlyCheckoutModal, setShowEarlyCheckoutModal] = useState(false);

  // Chart states
  const [callsChartPeriod, setCallsChartPeriod] = useState('daily');
  const [breaksChartPeriod, setBreaksChartPeriod] = useState('daily');
  const [attendanceChartPeriod, setAttendanceChartPeriod] = useState('daily');

  // Filter States
  const [filterType, setFilterType] = useState('today'); // today, week, month, custom
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');

  const fetchStats = async (start, end) => {
    setLoading(true);
    try {
      const params = {};
      if (start) params.startDate = start;
      if (end) params.endDate = end;
      if (employeeId) params.employeeId = employeeId;

      const res = await api.get('/data/personal-stats', { params });
      setStats(res.data);
    } catch (err) {
      console.error('Error fetching personal stats:', err);
      setError('حدث خطأ أثناء جلب البيانات الشخصية.');
    } finally {
      setLoading(false);
    }
  };

  const processCheckout = async () => {
    try {
      await api.post('/attendance/checkout');
      showToast('تم تسجيل الانصراف بنجاح!', 'success');
      window.dispatchEvent(new Event('userStatusChanged'));
      setTimeout(() => window.location.reload(), 1500);
    } catch (error) {
      showToast(error.response?.data?.error || 'حدث خطأ أثناء الانصراف', 'error');
    }
  };

  const handleCheckoutClick = () => {
    if (!hasSummaryToday) {
      showToast('يجب تسجيل ملخص المهام للدوام قبل تسجيل الانصراف!', 'error');
      setTimeout(() => window.location.href = '/summery', 1500);
      return;
    }

    // Check for early checkout (at least 5 minutes early)
    const activeShift = attendanceStatus?.log?.Shift || attendanceStatus?.shift;
    if (activeShift?.endTime) {
      const now = new Date();
      const [endHour, endMinute] = activeShift.endTime.split(':').map(Number);

      let endTimeDate = new Date();
      if (attendanceStatus?.log?.date) {
        endTimeDate = new Date(attendanceStatus.log.date);
      }
      endTimeDate.setHours(endHour, endMinute, 0, 0);

      if (activeShift.startTime) {
        const [startHour] = activeShift.startTime.split(':').map(Number);
        if (endHour < startHour) {
          endTimeDate.setDate(endTimeDate.getDate() + 1);
        }
      }

      const diffMs = endTimeDate.getTime() - now.getTime();
      const diffMins = diffMs / 60000;

      if (diffMins >= 5) {
        setShowEarlyCheckoutModal(true);
        return;
      }
    }

    processCheckout();
  };

  useEffect(() => {
    document.title = "المتابعة الشخصية | مخصوص";
    handleFilterChange('today');

    if (!employeeId) {
      const fetchStatus = async () => {
        try {
          const [attRes, perfRes] = await Promise.all([
            api.get('/attendance/status'),
            api.get('/data/performance-logs')
          ]);
          setAttendanceStatus(attRes.data);

          const today = getLogicalDateString(new Date());
          const logs = perfRes.data || [];
          const summaryToday = logs.some(l => l.date === today);
          setHasSummaryToday(summaryToday);
        } catch (error) {
          console.error("Error fetching statuses:", error);
        } finally {
          setLoadingStatus(false);
        }
      };
      fetchStatus();
    } else {
      setLoadingStatus(false);
    }
    // eslint-disable-next-line
  }, [employeeId]);

  const handleFilterChange = (type) => {
    setFilterType(type);
    const today = new Date();
    let startStr = getLogicalDateString(today);
    let endStr = getLogicalDateString(today);

    if (type === 'today') {
      startStr = endStr;
      fetchStats(startStr, endStr);
    } else if (type === 'week') {
      const start = new Date(today);
      start.setDate(today.getDate() - 6);
      startStr = getLogicalDateString(start);
      fetchStats(startStr, endStr);
    } else if (type === 'month') {
      const start = new Date(today);
      start.setDate(today.getDate() - 29);
      startStr = getLogicalDateString(start);
      fetchStats(startStr, endStr);
    }
  };

  const applyCustomFilter = () => {
    if (customStart && customEnd) {
      fetchStats(customStart, customEnd);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'غير محدد';
    const date = new Date(dateStr);
    return date.toLocaleDateString('ar-EG', { weekday: 'long', year: 'numeric', month: 'short', day: 'numeric' });
  };

  const formatDuration = (ms) => {
    if (!ms) return '0 دقيقة';
    const minutes = Math.floor(ms / (1000 * 60));
    if (minutes >= 60) {
      const h = Math.floor(minutes / 60);
      const m = minutes % 60;
      return `${h} ساعة و ${m} دقيقة`;
    }
    return `${minutes} دقيقة`;
  };

  const renderChart = (title, icon, data, period, setPeriod, dataKey, name, colorArea, colorBar, yAxisFormatter = (val) => val, extraAction = null) => (
    <div className="pf-chart-section fade-in" style={{ animationDelay: '0.2s', opacity: loading ? 0.6 : 1, marginTop: '2rem' }}>
      <div className="pf-chart-header">
        <div className="pf-chart-title">
          {icon}
          <h2>{title}</h2>
          {extraAction}
        </div>
        <div className="pf-chart-tabs">
          <button className={`pf-tab ${period === 'daily' ? 'active' : ''}`} onClick={() => setPeriod('daily')}>يومي</button>
          <button className={`pf-tab ${period === 'weekly' ? 'active' : ''}`} onClick={() => setPeriod('weekly')}>أسبوعي</button>
          <button className={`pf-tab ${period === 'monthly' ? 'active' : ''}`} onClick={() => setPeriod('monthly')}>شهري</button>
        </div>
      </div>
      <div className="pf-chart-container">
        <ResponsiveContainer width="100%" height={350}>
          <AreaChart data={data[period]} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id={`color${dataKey}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={colorArea} stopOpacity={0.8} />
                <stop offset="95%" stopColor={colorArea} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
            <XAxis dataKey="name" stroke="var(--text-secondary)" tick={{ fill: 'var(--text-secondary)' }} />
            <YAxis stroke="var(--text-secondary)" tick={{ fill: 'var(--text-secondary)' }} tickFormatter={yAxisFormatter} />
            <Tooltip contentStyle={{ backgroundColor: 'var(--bg-main)', borderColor: 'var(--border-color)', borderRadius: '8px', color: 'var(--text-primary)' }} itemStyle={{ color: colorArea, fontWeight: 'bold' }} />
            <Area type="monotone" dataKey="value" name={name} stroke={colorArea} strokeWidth={3} fillOpacity={1} fill={`url(#color${dataKey})`} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );

  const renderFilterBar = () => (
    <div className="pf-filter-bar fade-in">
      <div className="pf-filter-group">
        <Filter size={20} className="text-blue" />
        <span className="pf-filter-label">تصفية البيانات:</span>
        <button className={`pf-filter-btn ${filterType === 'today' ? 'active' : ''}`} onClick={() => handleFilterChange('today')}>اليوم</button>
        <button className={`pf-filter-btn ${filterType === 'week' ? 'active' : ''}`} onClick={() => handleFilterChange('week')}>هذا الأسبوع</button>
        <button className={`pf-filter-btn ${filterType === 'month' ? 'active' : ''}`} onClick={() => handleFilterChange('month')}>هذا الشهر</button>
        <button className={`pf-filter-btn ${filterType === 'custom' ? 'active' : ''}`} onClick={() => setFilterType('custom')}>فترة مخصصة</button>
      </div>

      {filterType === 'custom' && (
        <div className="pf-custom-filter slide-down">
          <input type="date" className="pf-date-input" value={customStart} onChange={(e) => setCustomStart(e.target.value)} />
          <span className="personalfollowup-style-1">إلى</span>
          <input type="date" className="pf-date-input" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)} />
          <button className="pf-apply-btn" onClick={applyCustomFilter}>تطبيق</button>
        </div>
      )}
    </div>
  );

  if (loading && !stats) {
    return (
      <div className="pf-loading fade-in">
        <Activity size={48} className="spinner text-blue" />
        <p>جاري تحميل إحصائياتك...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="pf-error fade-in">
        <AlertCircle size={48} />
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div className="pf-container fade-in">
      <header className="pf-header">
        <div className="pf-title-wrapper">
          <Activity size={32} className="pf-title-icon" />
          <h1 className="pf-gradient-title">المتابعة الشخصية</h1>
        </div>
        <p className="pf-subtitle">
          مرحباً، إليك ملخص أداء ونشاط <span>{stats?.user?.name || user?.fullName}</span> للفترة المحددة.
        </p>
      </header>

      {renderFilterBar()}

      {!employeeId && !loadingStatus && (
        <div className="personalfollowup-style-2">

          {/* Summary Status Card */}
          <div className="pf-stat-card fade-in personalfollowup-style-3" >
            <div className="personalfollowup-style-4">
              <div className="personalfollowup-style-5">
                <div className="personalfollowup-style-6">
                  <Star size={24} />
                </div>
                <div>
                  <h3 className="personalfollowup-style-7">حالة ملخص المهام لليوم</h3>
                  <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: hasSummaryToday ? '#10b981' : '#ef4444' }}>
                    {hasSummaryToday ? 'مسجل' : 'غير مسجل'}
                  </div>
                </div>
              </div>
            </div>
            {!hasSummaryToday ? (
              <Link to="/summery" className="personalfollowup-style-8">
                تسجيل الملخص الآن
              </Link>
            ) : (

              <div className="personalfollowup-style-9">
                تم تسجيل الملخص لليوم
              </div>
            )}
          </div>

          {/* Checkout Card */}
          {attendanceStatus?.hasCheckedIn && (
            <div className="pf-stat-card fade-in personalfollowup-style-10" >
              <div className="personalfollowup-style-11">
                <div className="personalfollowup-style-12">
                  <div className="personalfollowup-style-13">
                    <LogOut size={24} />
                  </div>
                  <div>
                    <h3 className="personalfollowup-style-14">الوردية الحالية</h3>
                    <div className="personalfollowup-style-15">
                      ينتهي: {(attendanceStatus?.log?.Shift || attendanceStatus?.shift)?.endTime || 'غير محدد'}
                    </div>
                  </div>
                </div>
              </div>
              {!attendanceStatus?.log?.checkOutTime ? (
                <button
                  onClick={handleCheckoutClick}
                  className="personalfollowup-style-16"
                  onMouseOver={(e) => { e.currentTarget.style.background = '#ef4444'; e.currentTarget.style.color = 'white'; }}
                  onMouseOut={(e) => { e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'; e.currentTarget.style.color = '#ef4444'; }}
                >
                  <LogOut size={18} />
                  تسجيل الانصراف
                </button>
              ) : (
                <div className="personalfollowup-style-17">
                  <CheckCircle size={18} className="personalfollowup-style-18" />
                  تم تسجيل الانصراف
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {loading && stats && (
        <div className="pf-reloading-overlay">
          <Activity size={24} className="spinner" /> تحديث البيانات...
        </div>
      )}

      {stats && (
        <>
          <div className="pf-grid" style={{ opacity: loading ? 0.6 : 1 }}>
            {/* Calls Card */}
            <div className="pf-card pf-card-calls glow-hover">
              <div className="pf-card-icon-wrapper">
                <PhoneCall size={28} />
              </div>
              <div className="pf-card-content">
                <h3>المكالمات المجراة</h3>
                <div className="pf-card-value">{stats.calls.current} <span className="pf-unit">مكالمة</span></div>
                <div className={`pf-diff ${stats.calls.diff > 0 ? 'positive' : stats.calls.diff < 0 ? 'negative' : 'neutral'}`}>
                  {stats.calls.diff > 0 ? (
                    <><TrendingUp size={16} /> +{stats.calls.diff} عن الفترة السابقة</>
                  ) : stats.calls.diff < 0 ? (
                    <><TrendingDown size={16} /> {stats.calls.diff} عن الفترة السابقة</>
                  ) : (
                    <><Activity size={16} /> نفس أداء الفترة السابقة</>
                  )}
                </div>
              </div>
            </div>

            {/* Attendance & Discipline Card */}
            <div className="pf-card pf-card-attendance glow-hover">
              <div className="pf-card-icon-wrapper">
                <Clock size={28} />
              </div>
              <div className="pf-card-content">
                <h3>معدل الانضباط والحضور</h3>
                <div className="pf-discipline-wrapper">
                  <div className="pf-discipline-rate">
                    <span className="rate-num">{stats.attendance.disciplineRate}%</span>
                    <span className={`rate-badge ${stats.attendance.disciplineRate >= 85 ? 'good' : 'bad'}`}>
                      {stats.attendance.disciplineRating} <Star size={14} />
                    </span>
                  </div>
                  <div className="pf-progress-bg">
                    <div className="pf-progress-fill" style={{ width: `${stats.attendance.disciplineRate}%`, backgroundColor: stats.attendance.disciplineRate >= 85 ? '#10b981' : '#f59e0b' }}></div>
                  </div>
                </div>

                <div className="pf-timeline personalfollowup-style-19" >
                  <div className="pf-timeline-item">
                    <LogIn size={18} className="text-green" />
                    <div className="pf-time-info">
                      <span className="pf-time-label">متوسط توقيت الحضور</span>
                      <span className="pf-time-value">{stats.attendance.avgCheckInTime}</span>
                    </div>
                  </div>
                  <div className={`pf-diff ${stats.attendance.checkInDiffMins < 0 ? 'positive' : stats.attendance.checkInDiffMins > 0 ? 'negative' : 'neutral'}`}>
                    {stats.attendance.checkInDiffMins < 0 ? (
                      <><TrendingUp size={16} /> أبكر بـ {Math.abs(stats.attendance.checkInDiffMins)} دقيقة من الفترة السابقة</>
                    ) : stats.attendance.checkInDiffMins > 0 ? (
                      <><TrendingDown size={16} /> متأخر بـ {stats.attendance.checkInDiffMins} دقيقة عن الفترة السابقة</>
                    ) : (
                      <><Activity size={16} /> نفس مستوى الفترة السابقة</>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Breaks Card */}
            <div className="pf-card pf-card-breaks glow-hover">
              <div className="pf-card-icon-wrapper">
                <Coffee size={28} />
              </div>
              <div className="pf-card-content">
                <h3>البريكات والخمول</h3>
                <div className="pf-card-value">{formatDuration(stats.breaks.totalMs)}</div>
                <p className="pf-desc">إجمالي الوقت المقضي في الاستراحات والخمول خلال الفترة المحددة (تم تسجيل {stats.breaks.count} فترة).</p>
              </div>
            </div>

            {/* Next Day Off Card */}
            <div className="pf-card pf-card-dayoff glow-hover">
              <div className="pf-card-icon-wrapper">
                <CalendarHeart size={28} />
              </div>
              <div className="pf-card-content">
                <h3>موعد الإجازة القادمة</h3>
                <div className="pf-card-value pf-date-value">
                  {stats.nextDayOff ? formatDate(stats.nextDayOff) : 'لا توجد إجازات مجدولة'}
                </div>
                <p className="pf-desc">هذا هو موعد إجازتك القادمة المعتمدة في النظام.</p>
              </div>
            </div>
          </div>

          {/* Charts Section */}
          {stats.chartData && renderChart(
            "متابعة الأداء الزمني (المكالمات)",
            <BarChart2 size={24} className="text-blue" />,
            stats.chartData,
            callsChartPeriod,
            setCallsChartPeriod,
            "Calls",
            "عدد المكالمات",
            "#3b82f6",
            "#f97316",
            (val) => val,
            (user?.role === 'Admin' || user?.role === 'SuperAdmin') ? (
              <Link
                to={`/handleAdmin?employeeName=${encodeURIComponent(stats.user.name)}`}
                className="personalfollowup-style-20"
                onMouseOver={e => e.currentTarget.style.background = 'rgba(59, 130, 246, 0.25)'}
                onMouseOut={e => e.currentTarget.style.background = 'rgba(59, 130, 246, 0.15)'}
                title="عرض سجلات المكالمات لهذا الموظف"
              >
                <PhoneCall size={16} />
                سجلات المكالمات
              </Link>
            ) : null
          )}

          {stats.breaksChartData && renderChart(
            "متابعة الأداء الزمني (البريكات)",
            <Coffee size={24} className="personalfollowup-style-21" />,
            stats.breaksChartData,
            breaksChartPeriod,
            setBreaksChartPeriod,
            "Breaks",
            "مدة البريكات (دقائق)",
            "#eab308",
            "#f59e0b",
            (val) => `${val} د`,
            (user?.role === 'Admin' || user?.role === 'SuperAdmin') ? (
              <Link
                to={`/monitoring?employeeName=${encodeURIComponent(stats.user.name)}`}
                className="personalfollowup-style-22"
                onMouseOver={e => e.currentTarget.style.background = 'rgba(234, 179, 8, 0.25)'}
                onMouseOut={e => e.currentTarget.style.background = 'rgba(234, 179, 8, 0.15)'}
                title="عرض سجلات البريك لهذا الموظف"
              >
                <Coffee size={16} />
                سجلات البريك
              </Link>
            ) : null
          )}

          {stats.attendanceChartData && renderChart(
            "متابعة الأداء الزمني (ساعات العمل)",
            <Clock size={24} className="personalfollowup-style-23" />,
            stats.attendanceChartData,
            attendanceChartPeriod,
            setAttendanceChartPeriod,
            "Attendance",
            "ساعات العمل",
            "#10b981",
            "#059669",
            (val) => `${val} س`,
            (user?.role === 'Admin' || user?.role === 'SuperAdmin') ? (
              <Link
                to={`/attendancereports?employeeName=${encodeURIComponent(stats.user.name)}`}
                className="personalfollowup-style-24"
                onMouseOver={e => e.currentTarget.style.background = 'rgba(16, 185, 129, 0.25)'}
                onMouseOut={e => e.currentTarget.style.background = 'rgba(16, 185, 129, 0.15)'}
                title="عرض تقارير الحضور المجمعة لهذا الموظف"
              >
                <Activity size={16} />
                سجلات الحضور
              </Link>
            ) : null
          )}
        </>
      )}
      {/* Early Checkout Modal */}
      {showEarlyCheckoutModal && (
        <div className="personalfollowup-style-25">
          <div className="fade-in personalfollowup-style-26" >
            <div className="personalfollowup-style-27">
              <AlertCircle size={64} />
            </div>
            <h2 className="personalfollowup-style-28">انصراف مبكر!</h2>
            <p className="personalfollowup-style-29">
              سيتم تسجيل انصراف مبكر وتطبيق خصم على الساعات المتبقية من الوردية. هل أنت متأكد من الاستمرار؟
            </p>
            <div className="personalfollowup-style-30">
              <button
                onClick={() => {
                  setShowEarlyCheckoutModal(false);
                  processCheckout();
                }}
                className="personalfollowup-style-31"
                onMouseOver={(e) => e.currentTarget.style.opacity = '0.8'}
                onMouseOut={(e) => e.currentTarget.style.opacity = '1'}
              >
                نعم، تسجيل الانصراف
              </button>
              <button
                onClick={() => setShowEarlyCheckoutModal(false)}
                className="personalfollowup-style-32"
                onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'}
                onMouseOut={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
              >
                تراجع
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default PersonalFollowup;
