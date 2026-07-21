import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Users, ArrowRight, Loader, ShieldAlert, CheckCircle, XCircle, Clock, CalendarDays, PhoneCall, AlertTriangle, CalendarRange, Search, Filter, Activity, TrendingUp, DollarSign } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import api from '../services/api';
import AvatarIcon from '../components/AvatarIcon';
import './ShiftStaffDetails.css';
import { useToast } from '../contexts/ToastContext';

const ShiftStaffDetails = () => {
  const { showToast } = useToast();
  const { shiftId } = useParams();
  const navigate = useNavigate();
  
  const [shift, setShift] = useState(null);
  const [staff, setStaff] = useState([]);
  const [aggregatedStats, setAggregatedStats] = useState(null);
  const [chartData, setChartData] = useState([]);
  const [timeframe, setTimeframe] = useState('monthly');
  const [activeMetricTab, setActiveMetricTab] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Modals state
  const [actionModal, setActionModal] = useState({ show: false, type: '', userId: null, userName: '' });
  const [actionReason, setActionReason] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedSalary, setSelectedSalary] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  // Search and Sort state
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('name'); // name, calls, present, absent, late

  useEffect(() => {
    fetchStaffStats();
  }, [shiftId, timeframe]);

  const fetchStaffStats = async () => {
    try {
      const response = await api.get(`/shifts/${shiftId}/staff-stats?timeframe=${timeframe}`);
      setShift(response.data.shift);
      setStaff(response.data.users);
      setAggregatedStats(response.data.aggregatedStats);
      setChartData(response.data.chartData || []);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching staff stats:', err);
      setError('حدث خطأ أثناء جلب تفاصيل الموظفين للوردية.');
      setLoading(false);
    }
  };

  const openModal = (type, userId, userName, currentSalary) => {
    setActionModal({ show: true, type, userId, userName });
    setSelectedDate(new Date().toISOString().split('T')[0]);
    setActionReason('');
    if (type === 'salary') {
      setSelectedSalary(currentSalary || '');
    }
  };

  const closeModal = () => {
    setActionModal({ show: false, type: '', userId: null, userName: '' });
    setSelectedDate('');
    setSelectedSalary('');
  };

  const handleActionSubmit = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    
    try {
      if (actionModal.type === 'absence') {
        await api.post('/attendance/admin/absence', {
          userId: actionModal.userId,
          date: selectedDate,
          notes: actionReason || 'تسجيل يدوي بواسطة الإدارة'
        });
      } else if (actionModal.type === 'dayoff') {
        await api.post('/dayoff/admin/register', {
          userId: actionModal.userId,
          date: selectedDate,
          dayName: new Date(selectedDate).toLocaleDateString('en-US', { weekday: 'long' }),
          reason: actionReason || 'تسجيل يدوي بواسطة الإدارة'
        });
      } else if (actionModal.type === 'salary') {
        await api.put(`/admin/users/${actionModal.userId}`, {
          baseSalary: selectedSalary
        });
      }
      
      // Refresh data
      await fetchStaffStats();
      closeModal();
      showToast('تم تنفيذ الإجراء بنجاح!', 'success');
    } catch (err) {
      console.error('Action error:', err);
      showToast(err.response?.data?.error || 'حدث خطأ أثناء تنفيذ الإجراء', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const formatDuration = (ms) => {
    if (!ms) return '00:00:00';
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    
    return [
      hours.toString().padStart(2, '0'),
      minutes.toString().padStart(2, '0'),
      seconds.toString().padStart(2, '0')
    ].join(':');
  };

  const formatLateDuration = (minutes) => {
    if (!minutes || minutes <= 0) return '0 دقيقة';
    if (minutes < 60) return `${minutes} دقيقة`;
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    if (m === 0) return `${h} ساعة`;
    return `${h} ساعة و ${m} دقيقة`;
  };

  const getFilteredAndSortedStaff = () => {
    let result = [...staff];

    // Search
    if (searchQuery) {
      result = result.filter(user => 
        user.fullName.toLowerCase().includes(searchQuery.toLowerCase()) || 
        user.username.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Sort
    result.sort((a, b) => {
      switch (sortBy) {
        case 'calls':
          return b.stats.totalCalls - a.stats.totalCalls;
        case 'present':
          return b.stats.presentDays - a.stats.presentDays;
        case 'absent':
          return b.stats.absentDays - a.stats.absentDays;
        case 'late':
          return b.stats.lateDays - a.stats.lateDays;
        case 'dayoffs':
          return b.stats.approvedDayOffs - a.stats.approvedDayOffs;
        case 'name':
        default:
          return a.fullName.localeCompare(b.fullName, 'ar');
      }
    });

    return result;
  };

  const getPeriodLabel = () => {
    switch (timeframe) {
      case 'today': return 'اليوم';
      case 'yesterday': return 'أمس';
      case 'weekly': return 'هذا الأسبوع';
      case 'yearly': return 'هذا العام';
      case 'monthly':
      default: return 'هذا الشهر';
    }
  };

  const renderDashboard = () => {
    if (!aggregatedStats) return null;

    const { currentMonth, previousMonth } = aggregatedStats;
    
    const currentTotalDays = currentMonth.totalPresent + currentMonth.totalAbsent + currentMonth.totalDayOffs;
    const currentRatio = currentTotalDays > 0 ? Math.round((currentMonth.totalPresent / currentTotalDays) * 100) : 0;
    
    const prevTotalDays = previousMonth.totalPresent + previousMonth.totalAbsent + previousMonth.totalDayOffs;
    const prevRatio = prevTotalDays > 0 ? Math.round((previousMonth.totalPresent / prevTotalDays) * 100) : 0;

    return (
      <div className="ssd-dashboard fade-in">
        <div className="dashboard-header-row">
          <h2 className="dashboard-title">
            <Activity size={24} className="text-blue" />
            الأداء المجمع للوردية (مقارنة زمنية)
          </h2>
          <div className="timeframe-filters">
            <button className={`time-btn ${timeframe === 'today' ? 'active' : ''}`} onClick={() => setTimeframe('today')}>اليوم</button>
            <button className={`time-btn ${timeframe === 'yesterday' ? 'active' : ''}`} onClick={() => setTimeframe('yesterday')}>أمس</button>
            <button className={`time-btn ${timeframe === 'weekly' ? 'active' : ''}`} onClick={() => setTimeframe('weekly')}>أسبوعي</button>
            <button className={`time-btn ${timeframe === 'monthly' ? 'active' : ''}`} onClick={() => setTimeframe('monthly')}>شهري</button>
            <button className={`time-btn ${timeframe === 'yearly' ? 'active' : ''}`} onClick={() => setTimeframe('yearly')}>سنوي</button>
          </div>
        </div>
        
        <div className="dashboard-cards">
          <div className="dash-card">
            <div className="dash-card-icon"><Clock size={28} /></div>
            <div className="dash-card-info">
              <h4>ساعات الدوام ({getPeriodLabel()})</h4>
              <div className="dash-card-val">{currentMonth.totalHours} <span className="unit">ساعة</span></div>
            </div>
          </div>
          <div className="dash-card">
            <div className="dash-card-icon"><PhoneCall size={28} /></div>
            <div className="dash-card-info">
              <h4>إجمالي المكالمات ({getPeriodLabel()})</h4>
              <div className="dash-card-val">{currentMonth.totalCalls} <span className="unit">مكالمة</span></div>
            </div>
          </div>
          <div className="dash-card">
            <div className="dash-card-icon"><TrendingUp size={28} /></div>
            <div className="dash-card-info">
              <h4>نسبة الحضور ({getPeriodLabel()})</h4>
              <div className="dash-card-val" style={{ color: currentRatio >= 85 ? 'var(--success)' : currentRatio >= 70 ? 'var(--warning)' : 'var(--danger)' }}>
                {currentRatio}%
              </div>
            </div>
          </div>
        </div>

        <div className="dashboard-chart-wrapper">
          <div className="chart-header-row">
            <h3 className="chart-title">مؤشر فرق الأداء الزمني ({getPeriodLabel()} مقابل الفترة السابقة)</h3>
            <div className="metric-tabs">
              <button className={`metric-tab ${activeMetricTab === 'all' ? 'active' : ''}`} onClick={() => setActiveMetricTab('all')}>الكل</button>
              <button className={`metric-tab ${activeMetricTab === 'calls' ? 'active' : ''}`} onClick={() => setActiveMetricTab('calls')}>المكالمات</button>
              <button className={`metric-tab ${activeMetricTab === 'hours' ? 'active' : ''}`} onClick={() => setActiveMetricTab('hours')}>الساعات</button>
              <button className={`metric-tab ${activeMetricTab === 'attendance' ? 'active' : ''}`} onClick={() => setActiveMetricTab('attendance')}>الحضور</button>
            </div>
          </div>
          
          <div className="chart-container" style={{ width: '100%', height: '450px', marginTop: '1rem' }}>
            <ResponsiveContainer>
              <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorCallsCurr" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorCallsPrev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="rgba(255,255,255,0.3)" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="rgba(255,255,255,0.3)" stopOpacity={0}/>
                  </linearGradient>

                  <linearGradient id="colorHoursCurr" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorHoursPrev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="rgba(255,255,255,0.3)" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="rgba(255,255,255,0.3)" stopOpacity={0}/>
                  </linearGradient>

                  <linearGradient id="colorAttCurr" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorAttPrev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="rgba(255,255,255,0.3)" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="rgba(255,255,255,0.3)" stopOpacity={0}/>
                  </linearGradient>
                </defs>

                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" vertical={false} />
                <XAxis dataKey="name" stroke="var(--text-secondary)" tick={{ fill: 'var(--text-secondary)' }} />
                <YAxis stroke="var(--text-secondary)" tick={{ fill: 'var(--text-secondary)' }} />
                <Tooltip 
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div style={{ backgroundColor: 'rgba(15, 23, 42, 0.9)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '1rem', color: '#fff', boxShadow: '0 8px 32px rgba(0,0,0,0.3)', backdropFilter: 'blur(8px)' }}>
                          <p style={{ margin: '0 0 0.8rem 0', fontWeight: 'bold', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.5rem', textAlign: 'center', fontSize: '1.1rem' }}>{label}</p>
                          {payload.map((entry, index) => (
                            <div key={`item-${index}`} style={{ display: 'flex', justifyContent: 'space-between', gap: '2rem', margin: '0.5rem 0', color: entry.color, fontSize: '0.95rem' }}>
                              <span>{entry.name}:</span>
                              <span style={{ fontWeight: 'bold' }}>{entry.value}</span>
                            </div>
                          ))}
                        </div>
                      );
                    }
                    return null;
                  }}
                  cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                />
                <Legend wrapperStyle={{ paddingTop: '20px' }} />

                {(activeMetricTab === 'all' || activeMetricTab === 'calls') && (
                  <>
                    <Area type="monotone" dataKey="المكالمات السابقة" stroke="rgba(255,255,255,0.3)" fillOpacity={1} fill="url(#colorCallsPrev)" strokeWidth={2} />
                    <Area type="monotone" dataKey="المكالمات الحالية" stroke="#3b82f6" fillOpacity={1} fill="url(#colorCallsCurr)" strokeWidth={3} />
                  </>
                )}

                {(activeMetricTab === 'all' || activeMetricTab === 'hours') && (
                  <>
                    <Area type="monotone" dataKey="الساعات السابقة" stroke="rgba(255,255,255,0.3)" fillOpacity={1} fill="url(#colorHoursPrev)" strokeWidth={2} />
                    <Area type="monotone" dataKey="الساعات الحالية" stroke="#10b981" fillOpacity={1} fill="url(#colorHoursCurr)" strokeWidth={3} />
                  </>
                )}

                {(activeMetricTab === 'all' || activeMetricTab === 'attendance') && (
                  <>
                    <Area type="monotone" dataKey="الحضور السابق" stroke="rgba(255,255,255,0.3)" fillOpacity={1} fill="url(#colorAttPrev)" strokeWidth={2} />
                    <Area type="monotone" dataKey="الحضور الحالي" stroke="#f59e0b" fillOpacity={1} fill="url(#colorAttCurr)" strokeWidth={3} />
                  </>
                )}
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="staff-loading">
        <Loader className="spinner" size={40} />
        <p>جاري تحميل إحصائيات الموظفين...</p>
      </div>
    );
  }

  if (error || !shift) {
    return (
      <div className="staff-error">
        <ShieldAlert size={50} />
        <p>{error || 'الوردية غير موجودة'}</p>
        <button onClick={() => navigate('/staff-management')} className="back-btn">
          العودة لإدارة الموظفين
        </button>
      </div>
    );
  }

  return (
    <div className="shift-staff-container">
      <div className="ssd-header">
        <button className="ssd-back-btn" onClick={() => navigate('/staff-management')}>
          <ArrowRight size={20} />
        </button>
        <div>
          <h1 className="ssd-title">
            <Users size={28} className="ssd-title-icon" />
            موظفي وردية: {shift.name}
          </h1>
          <p className="ssd-subtitle">
            إحصائيات {getPeriodLabel()} (مكالمات، حضور، وتأخير)
          </p>
        </div>
      </div>

      {renderDashboard()}

      <div className="ssd-controls">
        <div className="search-box">
          <Search size={18} className="search-icon" />
          <input 
            type="text" 
            placeholder="ابحث بالاسم..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        
        <div className="sort-pills">
          <span className="sort-label"><Filter size={16} /> ترتيب حسب:</span>
          
          <button 
            className={`sort-pill ${sortBy === 'name' ? 'active' : ''}`}
            onClick={() => setSortBy('name')}
          >
            الاسم
          </button>
          
          <button 
            className={`sort-pill ${sortBy === 'calls' ? 'active blue' : ''}`}
            onClick={() => setSortBy('calls')}
          >
            الأكثر مكالمات
          </button>
          
          <button 
            className={`sort-pill ${sortBy === 'present' ? 'active green' : ''}`}
            onClick={() => setSortBy('present')}
          >
            الأكثر حضوراً
          </button>
          
          <button 
            className={`sort-pill ${sortBy === 'absent' ? 'active red' : ''}`}
            onClick={() => setSortBy('absent')}
          >
            الأكثر غياباً
          </button>
          
          <button 
            className={`sort-pill ${sortBy === 'late' ? 'active yellow' : ''}`}
            onClick={() => setSortBy('late')}
          >
            الأكثر تأخيراً
          </button>
          
          <button 
            className={`sort-pill ${sortBy === 'dayoffs' ? 'active orange' : ''}`}
            onClick={() => setSortBy('dayoffs')}
          >
            الأكثر إجازة
          </button>
        </div>
      </div>

      <div className="staff-table-wrapper">
        <table className="staff-stats-table">
          <thead>
            <tr>
              <th>الموظف</th>
              <th>الأداء والمكالمات</th>
              <th>سجل الحضور</th>
              <th>الإجازات المستهلكة</th>
              <th>إجراءات الإدارة</th>
            </tr>
          </thead>
          <tbody>
            {getFilteredAndSortedStaff().length === 0 ? (
              <tr>
                <td colSpan="5" className="text-center py-8 text-gray-400">لا يوجد موظفين يطابقون بحثك</td>
              </tr>
            ) : (
              getFilteredAndSortedStaff().map(user => {
                const userAvatar = user.avatar || 'User';
                return (
                  <tr key={user.id}>
                    <td>
                      <div className="staff-user-info">
                        <div className="staff-avatar">
                          <AvatarIcon name={userAvatar} size={24} className="staff-avatar-icon" />
                        </div>
                        <div>
                          <h4>{user.fullName}</h4>
                          <span>{user.jobTitle || 'موظف'}</span>
                        </div>
                      </div>
                    </td>
                  <td>
                    <div className="stat-badges-col">
                      <div className="stat-badge blue">
                        <PhoneCall size={14} />
                        {user.stats.totalCalls} مكالمة
                      </div>
                      <div className="stat-badge purple">
                        <Clock size={14} />
                        {formatDuration(user.stats.totalDuration)}
                      </div>
                    </div>
                  </td>
                  <td>
                    <div className="stat-badges-row">
                      <div className="stat-mini green" title="أيام الحضور">
                        <CheckCircle size={16} /> {user.stats.presentDays}
                      </div>
                      <div className="stat-mini red" title="أيام الغياب">
                        <XCircle size={16} /> {user.stats.absentDays}
                      </div>
                      <div className="stat-mini yellow" title="التأخير المجمع للفترة">
                        <AlertTriangle size={16} /> {user.stats.lateDays} 
                        <span style={{ fontSize: '0.75rem', opacity: 0.8, marginRight: '4px' }}>
                          ({formatLateDuration(user.stats.totalLateMinutes)})
                        </span>
                      </div>
                    </div>
                  </td>
                  <td>
                    <div className="stat-badge orange">
                      <CalendarDays size={14} />
                      {user.stats.approvedDayOffs} {shift.dayOffType === 'Variable' ? `/ ${shift.variableDaysOffCount}` : 'يوم'}
                    </div>
                  </td>
                  <td>
                    <div className="action-buttons">
                      <button 
                        className="action-btn absent-btn"
                        onClick={() => openModal('absence', user.id, user.fullName)}
                        title="تسجيل غياب"
                      >
                        <XCircle size={18} />
                        <span>غياب</span>
                      </button>
                      <button 
                        className="action-btn dayoff-btn" 
                        onClick={() => openModal('dayoff', user.id, user.fullName)}
                        title="تسجيل إجازة"
                      >
                        <Calendar size={16} />
                      </button>
                      <button 
                        className="action-btn"
                        onClick={() => openModal('salary', user.id, user.fullName, user.baseSalary || shift.baseSalary || '')}
                        title="تعديل الراتب"
                        style={{ background: 'rgba(34, 197, 94, 0.1)', color: '#22c55e', border: '1px solid rgba(34, 197, 94, 0.2)' }}
                      >
                        <DollarSign size={18} />
                        <span>الراتب</span>
                      </button>
                    </div>
                  </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {actionModal.show && (
        <div className="action-modal-overlay">
          <div className="action-modal">
            <h3 className={`action-modal-title ${actionModal.type === 'absence' ? 'text-red' : actionModal.type === 'salary' ? 'text-green' : 'text-orange'}`}>
              {actionModal.type === 'absence' ? 'تسجيل غياب' : actionModal.type === 'salary' ? 'تعديل الراتب' : 'تسجيل إجازة'}
            </h3>
            <p className="action-modal-desc">
              أنت تقوم بتسجيل {actionModal.type === 'absence' ? 'غياب' : actionModal.type === 'salary' ? 'تعديل راتب' : 'إجازة'} للموظف: <strong>{actionModal.userName}</strong>
            </p>
            
            <form onSubmit={handleActionSubmit}>
              {actionModal.type === 'salary' ? (
                <div className="form-group">
                  <label>الراتب الشهري:</label>
                  <input 
                    type="number" 
                    min="0"
                    value={selectedSalary} 
                    onChange={(e) => setSelectedSalary(e.target.value)} 
                    placeholder="مثال: 5000"
                    required 
                  />
                </div>
              ) : (
                <>
                  <div className="form-group">
                    <label>التاريخ:</label>
                    <input 
                      type="date" 
                      value={selectedDate} 
                      onChange={(e) => setSelectedDate(e.target.value)} 
                      required 
                    />
                  </div>
                  <div className="form-group" style={{ marginTop: '1rem' }}>
                    <label>السبب / الملاحظة (اختياري):</label>
                    <textarea 
                      value={actionReason}
                      onChange={(e) => setActionReason(e.target.value)}
                      placeholder="اكتب سبب الإجازة أو الغياب..."
                      style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.2)', color: 'white', minHeight: '80px', fontFamily: 'inherit', resize: 'vertical' }}
                    />
                  </div>
                </>
              )}
              
              <div className="action-modal-footer">
                <button type="button" className="cancel-btn" onClick={closeModal} disabled={actionLoading}>إلغاء</button>
                <button type="submit" className={`confirm-btn ${actionModal.type === 'absence' ? 'bg-red' : 'bg-orange'}`} disabled={actionLoading}>
                  {actionLoading ? <Loader size={18} className="spinner" /> : 'تأكيد'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ShiftStaffDetails;
