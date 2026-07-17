import React, { useState, useEffect } from 'react';
import { Calendar, Clock, Check, Phone, CheckCircle, TrendingUp, Info, ChevronRight, Plus, UserPlus, Coffee, Moon, BookOpen, Play, LayoutDashboard, User, MapPin, PhoneCall as PhoneIcon, MessageSquare, FileText, Activity, MessageCircle, Send, Link } from 'lucide-react';
import api from '../services/api';
import { getLogicalDateString } from '../utils/dateHelpers';
import './Home.css';

const FacebookIcon = ({ size = 24, color = "currentColor", style }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style}>
    <path d="M7 10v4h3v7h4v-7h3l1 -4h-4v-2a1 1 0 0 1 1 -1h3v-4h-3a5 5 0 0 0 -5 5v2h-3" />
  </svg>
);

const WhatsAppIcon = ({ size = 24, color = "currentColor", style }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style}>
    <path d="M3 21l1.65 -3.8a9 9 0 1 1 3.4 2.9l-5.05 .9" />
    <path d="M9 10a.5 .5 0 0 0 1 0v-1a.5 .5 0 0 0 -1 0v1a5 5 0 0 0 5 5h1a.5 .5 0 0 0 0 -1h-1a.5 .5 0 0 0 0 1" />
  </svg>
);

const Home = () => {
  const [targetCalls, setTargetCalls] = useState(30);
  const [calls, setCalls] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [reportMethod, setReportMethod] = useState(null);
  const [phoneInput, setPhoneInput] = useState('');
  const [phoneStatus, setPhoneStatus] = useState('empty');
  const [existingCommMethod, setExistingCommMethod] = useState(null);
  const [showConfirmDuplicate, setShowConfirmDuplicate] = useState(false);
  const [pendingCallData, setPendingCallData] = useState(null);
  const [toast, setToast] = useState({ show: false, message: '', type: 'error' });
  const [trackerStatus, setTrackerStatus] = useState('active');

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const res = await api.get('/attendance/status');
        setTrackerStatus(res.data.trackerStatus || 'active');
      } catch (e) {}
    };
    fetchStatus();
    const int = setInterval(fetchStatus, 30000);
    return () => clearInterval(int);
  }, []);

  // Auto-wakeup if user interacts with the page while idle
  useEffect(() => {
    const handleActivity = async () => {
      if (trackerStatus === 'idle') {
        setTrackerStatus('active');
        try {
          await api.post('/data/tracker/status', { status: 'active' });
          window.dispatchEvent(new Event('userStatusChanged'));
        } catch (err) {
          console.error('Failed to update status on interaction', err);
        }
      }
    };

    if (trackerStatus === 'idle') {
      window.addEventListener('mousemove', handleActivity);
      window.addEventListener('keydown', handleActivity);
      window.addEventListener('click', handleActivity);
    }

    return () => {
      window.removeEventListener('mousemove', handleActivity);
      window.removeEventListener('keydown', handleActivity);
      window.removeEventListener('click', handleActivity);
    };
  }, [trackerStatus]);

  useEffect(() => {
    if (!phoneInput) {
      setPhoneStatus('empty');
      return;
    }
    const checkPhone = async () => {
      setPhoneStatus('checking');
      try {
        const res = await api.get(`/data/calls/check-phone?phone=${encodeURIComponent(phoneInput)}`);
        if (res.data.exists) {
          setPhoneStatus('exists');
          setExistingCommMethod(res.data.commMethod);
        } else {
          setPhoneStatus('new');
          setExistingCommMethod(null);
        }
      } catch (err) {
        console.error('Error checking phone:', err);
        setPhoneStatus('empty');
        setExistingCommMethod(null);
      }
    };

    const timer = setTimeout(() => {
      if (phoneInput.length >= 8) {
        checkPhone();
      } else {
        setPhoneStatus('empty');
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [phoneInput]);

  const [selectedDate, setSelectedDate] = useState(getLogicalDateString());
  const [pendingDate, setPendingDate] = useState(null);
  const [isDateWarningOpen, setIsDateWarningOpen] = useState(false);

  // Break state
  const [activeBreak, setActiveBreak] = useState(localStorage.getItem('activeBreak') || null);
  const [breakStartTime, setBreakStartTime] = useState(localStorage.getItem('breakStartTime') || null);
  const [breakTimer, setBreakTimer] = useState('00:00');
  const [userName, setUserName] = useState('');

  useEffect(() => {
    document.title = "لوحة التشغيل | مخصوص";
    let interval;
    if (activeBreak && breakStartTime) {
      interval = setInterval(() => {
        const start = new Date(breakStartTime).getTime();
        const now = new Date().getTime();
        const diff = Math.floor((now - start) / 1000);

        const hrs = Math.floor(diff / 3600);
        const mins = String(Math.floor((diff % 3600) / 60)).padStart(2, '0');
        const secs = String(diff % 60).padStart(2, '0');

        if (hrs > 0) {
          setBreakTimer(`${String(hrs).padStart(2, '0')}:${mins}:${secs}`);
        } else {
          setBreakTimer(`${mins}:${secs}`);
        }
      }, 1000);
    } else {
      setBreakTimer('00:00');
    }
    return () => clearInterval(interval);
  }, [activeBreak, breakStartTime]);

  const handleStartBreak = async (breakType) => {
    const startTime = new Date().toISOString();
    const breakLogId = Date.now().toString();

    setActiveBreak(breakType);
    setBreakStartTime(startTime);
    localStorage.setItem('activeBreak', breakType);
    window.dispatchEvent(new Event('userStatusChanged'));
    localStorage.setItem('breakStartTime', startTime);
    localStorage.setItem('breakLogId', breakLogId);

    try {
      await api.post('/data/inactivity', [{
        id: breakLogId,
        type: breakType,
        startTime,
        endTime: null,
        durationMs: 0
      }]);
    } catch (err) {
      console.error('Failed to save break start:', err);
    }
  };

  const handleEndBreak = async () => {
    if (activeBreak && breakStartTime) {
      const endTime = new Date();
      const startTime = new Date(breakStartTime);
      const durationMs = endTime.getTime() - startTime.getTime();
      const breakLogId = localStorage.getItem('breakLogId') || Date.now().toString();

      const newLog = {
        id: breakLogId,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        durationMs,
        type: activeBreak
      };

      try {
        await api.post('/data/inactivity', [newLog]);
      } catch (err) {
        console.error('Failed to save inactivity log to server:', err);
        // Fallback to local storage if API fails
        const logs = JSON.parse(localStorage.getItem('inactivity_logs') || '[]');
        localStorage.setItem('inactivity_logs', JSON.stringify([...logs, newLog]));
      }
    }

    setActiveBreak(null);
    setBreakStartTime(null);
    localStorage.removeItem('activeBreak');
    window.dispatchEvent(new Event('userStatusChanged'));
    localStorage.removeItem('breakStartTime');
    localStorage.removeItem('breakLogId');
    showToast('تم العودة للعمل بنجاح وتم تسجيل الفاصل', 'success');
  };

  const fetchCalls = async () => {
    try {
      // Fetch target calls first
      try {
        const settingsRes = await api.get('/settings?key=dailyCallsTarget');
        if (settingsRes.data && settingsRes.data.dailyCallsTarget) {
          setTargetCalls(Number(settingsRes.data.dailyCallsTarget));
        }
      } catch (settingsErr) {
        console.error('Error fetching target calls:', settingsErr);
      }

      const res = await api.get('/data/calls');
      setCalls(res.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchCalls();
  }, []);

  const showToast = (message, type = 'error') => {
    setToast({ show: true, message, type });
    setTimeout(() => {
      setToast(prev => ({ ...prev, show: false }));
    }, 3000);
  };

  const handleDateChange = (e) => {
    const newDate = e.target.value;
    const today = getLogicalDateString();

    if (newDate < today) {
      setPendingDate(newDate);
      setIsDateWarningOpen(true);
    } else {
      setSelectedDate(newDate);
    }
  };

  const confirmDateChange = () => {
    setSelectedDate(pendingDate);
    setIsDateWarningOpen(false);
  };

  const handleSaveReport = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const agentName = formData.get('agentName');
    const phone = formData.get('phone');
    const callStatus = formData.get('callStatus');
    const report = formData.get('report');
    const city = formData.get('city');
    const profileLink = formData.get('profileLink');
    const commMethod = reportMethod === 'call' ? 'مكالمة هاتفية' : (reportMethod === 'facebook' ? 'فيسبوك' : (reportMethod === 'whatsapp' ? 'واتساب' : formData.get('commMethod')));
    const agentStatus = formData.get('agentStatus');

    // Custom Validation
    if (!agentName || agentName.trim() === '') {
      showToast('يرجى إدخال اسم المندوب', 'error');
      return;
    }

    if (reportMethod === 'call' || reportMethod === 'whatsapp') {
      const phoneRegex = /^[0-9+]{8,15}$/;
      if (!phone || !phoneRegex.test(phone.trim())) {
        showToast('يرجى إدخال رقم هاتف صحيح', 'error');
        return;
      }
    }

    if (!city || city.trim() === '') {
      showToast('يرجى إدخال المحافظة / المدينة', 'error');
      return;
    }

    if (!commMethod) {
      showToast('يرجى اختيار طريقة التواصل', 'error');
      return;
    }

    if (!agentStatus) {
      showToast('يرجى اختيار حالة المندوب', 'error');
      return;
    }

    if (!callStatus) {
      showToast('يرجى اختيار حالة المكالمة', 'error');
      return;
    }

    if (!report || report.trim() === '') {
      showToast('يرجى كتابة تقرير المكالمة', 'error');
      return;
    }

    // Construct date using selectedDate but current time
    const now = new Date();
    const selectedDateObj = new Date(selectedDate);
    selectedDateObj.setHours(now.getHours(), now.getMinutes(), now.getSeconds());

    const newCall = {
      agentName,
      phone: phone || '',
      city,
      commMethod,
      profileLink: profileLink || '',
      agentStatus,
      callStatus,
      report,
      date: selectedDate,
      time: selectedDateObj.toTimeString().split(' ')[0].substring(0, 5),
      createdAt: selectedDateObj.toISOString()
    };

    // Check if phone number already exists
    const isPhoneExistsLocal = phone && phone.trim() !== '' ? calls.some(call => call.phone === phone.trim()) : false;
    if ((isPhoneExistsLocal || phoneStatus === 'exists') && phone && phone.trim() !== '') {
      setPendingCallData(newCall);
      setShowConfirmDuplicate(true);
      return;
    }

    await processCallReport(newCall);
  };

  const processCallReport = async (newCall) => {
    try {
      await api.post('/data/calls', [newCall]);
      await fetchCalls(); // Refresh to get proper ID and any other DB fields
      setIsModalOpen(false);
      setReportMethod(null);
      setPhoneInput('');
      setPhoneStatus('empty');
      setExistingCommMethod(null);
      setShowConfirmDuplicate(false);
      setPendingCallData(null);
      showToast('تم حفظ تقرير المكالمة بنجاح!', 'success');
    } catch (err) {
      console.error(err);
      showToast('حدث خطأ أثناء حفظ المكالمة', 'error');
    }
  };

  // Filter calls by selected date (using local date to match date picker)
  const filteredCalls = calls.filter(call => {
    const callDateStr = call.date || getLogicalDateString(new Date(call.createdAt));
    return callDateStr === selectedDate;
  });

  const totalCallsCount = filteredCalls.length;
  const successfulCallsCount = filteredCalls.filter(c => c.callStatus === 'مهتم (موافق)').length;
  const detailsSentCount = filteredCalls.filter(c => c.callStatus === 'تم إرسال تفاصيل').length;
  const successRate = totalCallsCount > 0
    ? Math.round(((successfulCallsCount + detailsSentCount) / totalCallsCount) * 100)
    : 0;

  // Progress calculations
  const circumference = 314.159; // 2 * pi * r (where r=50)
  const progressPercent = Math.min(totalCallsCount / targetCalls, 1);
  const strokeDashoffset = circumference - (progressPercent * circumference);

  return (
    <div className="home-container">
      {/* Header */}
      <header className="home-header">
        <div className="page-title-wrapper">
          <LayoutDashboard size={28} className="title-icon text-blue" />
          <h1 className="page-title gradient-title">لوحة التشغيل</h1>
          <div className="header-datetime">
            <input
              type="date"
              className="date-picker-input"
              value={selectedDate}
              onChange={handleDateChange}
            />
          </div>
        </div>

      </header>

      {/* Main Status */}
      <section className="main-status-card">
        <div className="status-text">
          <h3 className="status-label">الحالة الحالية:</h3>
          <div className="status-value-group">
            <h2 className={activeBreak ? "status-active break-mode-text" : "status-active"} style={!activeBreak && trackerStatus === 'idle' ? { color: '#f97316' } : {}}>
              {activeBreak || (trackerStatus === 'idle' ? 'خامل' : 'نشط')}
            </h2>
            <span className="status-en" style={activeBreak ? { color: '#f59e0b', fontWeight: 'bold', fontSize: '1.2rem' } : (trackerStatus === 'idle' ? { color: '#f97316' } : {})}>
              ({activeBreak ? breakTimer : (trackerStatus === 'idle' ? 'Idle' : 'Active')})
            </span>
          </div>
        </div>
        <div className="status-icon-wrapper">
          <div className={`status-icon glow ${activeBreak ? 'break-mode-icon' : ''}`}>
            {activeBreak === 'بريك غداء' ? <Coffee size={50} strokeWidth={2} color="#f59e0b" /> :
              activeBreak === 'بريك صلاة' ? <Moon size={50} strokeWidth={2} color="#8b5cf6" /> :
                activeBreak === 'تدريب' ? <BookOpen size={50} strokeWidth={2} color="#3b82f6" /> :
                  trackerStatus === 'idle' ? <Moon size={50} strokeWidth={3} color="#f97316" /> :
                  <Check size={50} strokeWidth={4} color="#22c55e" />}
          </div>
        </div>
      </section>

      {/* Middle Grid */}
      <section className="middle-grid">
        {/* Sub Status */}
        <div className="dashboard-card sub-status-card">
          <h3 className="card-title">تغيير الحالة الفرعية</h3>
          <div className="sub-status-buttons">
            {activeBreak ? (
              <button className="sub-btn end-break-btn" onClick={handleEndBreak} style={{ backgroundColor: 'rgba(34, 197, 94, 0.1)', borderColor: '#22c55e', color: '#22c55e', width: '100%' }}>
                <Play size={18} fill="currentColor" />
                <span className="btn-text">إنهاء {activeBreak} والعودة للعمل</span>
              </button>
            ) : (
              <>
                <button className="sub-btn" onClick={() => handleStartBreak('بريك غداء')}>
                  <span className="emoji-icon">🍔</span>
                  <span className="btn-text">بريك غداء</span>
                </button>
                <button className="sub-btn" onClick={() => handleStartBreak('بريك صلاة')}>
                  <span className="emoji-icon">🕋</span>
                  <span className="btn-text">بريك صلاة</span>
                </button>
                {/* <button className="sub-btn" onClick={() => handleStartBreak('تدريب')}>
                  <span className="emoji-icon">📝</span>
                  <span className="btn-text">تدريب</span>
                </button> */}
              </>
            )}
          </div>
          <div className="sub-status-hint">
            <Info size={14} />
            <span>اختر الحالة المناسبة لتحديث حالتك الحالية</span>
          </div>
        </div>

        {/* Target */}
        <div className="dashboard-card target-card">
          <div className="card-header-with-action">
            <h3 className="card-title">تارجت المكالمات اليوم</h3>
            <button className="add-btn" onClick={() => { setIsModalOpen(true); setReportMethod(null); setPhoneInput(''); setPhoneStatus('empty'); }}>
              <Plus size={20} />
              إضافة تقرير مكالمة
            </button>
          </div>

          <div className="circular-progress-wrapper">
            <div className="circular-progress">
              <svg viewBox="0 0 120 120">
                <circle cx="60" cy="60" r="50" className="progress-bg" />
                <circle
                  cx="60" cy="60" r="50"
                  className="progress-value"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                />
              </svg>
              <div className="progress-content">
                <span className="progress-label">تم تحقيق</span>
                <span className="progress-number">{totalCallsCount}</span>
                <span className="progress-total">من أصل {targetCalls}<br />مكالمات اليوم</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Grid */}
      <section className="stats-grid">
        <div className="stat-card">
          <h3 className="stat-title">إجمالي المكالمات</h3>
          <div className="stat-body">
            <div className="stat-info">
              <span className="number">{totalCallsCount}</span>
              <span className="label">مكالمة</span>
            </div>
            <div className="stat-icon icon-blue">
              <Phone size={22} fill="currentColor" />
            </div>
          </div>
        </div>

        <div className="stat-card">
          <h3 className="stat-title">المكالمات الناجحة</h3>
          <div className="stat-body">
            <div className="stat-info">
              <span className="number">{successfulCallsCount}</span>
              <span className="label">مكالمة</span>
            </div>
            <div className="stat-icon icon-green">
              <CheckCircle size={22} fill="currentColor" color="var(--bg-card)" />
            </div>
          </div>
        </div>

        <div className="stat-card">
          <h3 className="stat-title">معدل النجاح</h3>
          <div className="stat-body">
            <div className="stat-info">
              <span className="number">{successRate}%</span>
              <span className="label">نسبة</span>
            </div>
            <div className="stat-icon icon-purple">
              <TrendingUp size={22} />
            </div>
          </div>
        </div>

        <div className="stat-card">
          <h3 className="stat-title">مندوب محتمل</h3>
          <div className="stat-body">
            <div className="stat-info">
              <span className="number">{detailsSentCount}</span>
              <span className="label">مكالمة</span>
            </div>
            <div className="stat-icon icon-orange">
              <UserPlus size={22} />
            </div>
          </div>
        </div>
      </section>

      {/* Create Report Modal */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={() => { setIsModalOpen(false); setReportMethod(null); setPhoneInput(''); setPhoneStatus('empty'); }}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                <h2 style={{ margin: 0 }}>{!reportMethod ? 'اختر طريقة التواصل' : reportMethod === 'facebook' ? 'إنشاء تقرير فيسبوك' : reportMethod === 'whatsapp' ? 'إنشاء تقرير واتساب' : 'إنشاء تقرير مكالمة'}</h2>
                {reportMethod && (
                  <button
                    type="button"
                    onClick={() => { setReportMethod(null); setPhoneInput(''); setPhoneStatus('empty'); setExistingCommMethod(null); }}
                    style={{
                      background: 'rgba(59, 130, 246, 0.15)',
                      color: '#3b82f6',
                      border: 'none',
                      padding: '0.4rem 0.8rem',
                      borderRadius: '6px',
                      fontSize: '0.85rem',
                      fontWeight: 'bold',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                      transition: 'background 0.2s',
                    }}
                    onMouseOver={e => e.currentTarget.style.background = 'rgba(59, 130, 246, 0.25)'}
                    onMouseOut={e => e.currentTarget.style.background = 'rgba(59, 130, 246, 0.15)'}
                  >
                    <ChevronRight size={16} />
                    تغيير طريقة التواصل
                  </button>
                )}
              </div>
              <button className="close-btn" onClick={() => { setIsModalOpen(false); setReportMethod(null); setPhoneInput(''); setPhoneStatus('empty'); setExistingCommMethod(null); }}>&times;</button>
            </div>

            {!reportMethod ? (
              <div style={{ padding: '2rem', display: 'flex', gap: '1.5rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                <div
                  style={{ flex: '1 1 120px', padding: '2rem', background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.2)', borderRadius: '16px', textAlign: 'center', cursor: 'pointer', transition: '0.3s' }}
                  onClick={() => setReportMethod('call')}
                  onMouseOver={(e) => e.currentTarget.style.background = 'rgba(59, 130, 246, 0.2)'}
                  onMouseOut={(e) => e.currentTarget.style.background = 'rgba(59, 130, 246, 0.1)'}
                >
                  <PhoneIcon size={40} color="#3b82f6" style={{ margin: '0 auto 1rem' }} />
                  <h3 style={{ color: 'var(--text-primary)', margin: 0, fontSize: '1.1rem' }}>مكالمة</h3>
                </div>

                <div
                  style={{ flex: '1 1 120px', padding: '2rem', background: 'rgba(59, 130, 246, 0.05)', border: '1px solid rgba(59, 130, 246, 0.1)', borderRadius: '16px', textAlign: 'center', cursor: 'pointer', transition: '0.3s' }}
                  onClick={() => setReportMethod('facebook')}
                  onMouseOver={(e) => e.currentTarget.style.background = 'rgba(59, 130, 246, 0.1)'}
                  onMouseOut={(e) => e.currentTarget.style.background = 'rgba(59, 130, 246, 0.05)'}
                >
                  <FacebookIcon size={40} color="#3b82f6" style={{ margin: '0 auto 1rem', display: 'block' }} />
                  <h3 style={{ color: 'var(--text-primary)', margin: 0, fontSize: '1.1rem' }}>فيسبوك</h3>
                </div>

                <div
                  style={{ flex: '1 1 120px', padding: '2rem', background: 'rgba(34, 197, 94, 0.05)', border: '1px solid rgba(34, 197, 94, 0.1)', borderRadius: '16px', textAlign: 'center', cursor: 'pointer', transition: '0.3s' }}
                  onClick={() => setReportMethod('whatsapp')}
                  onMouseOver={(e) => e.currentTarget.style.background = 'rgba(34, 197, 94, 0.1)'}
                  onMouseOut={(e) => e.currentTarget.style.background = 'rgba(34, 197, 94, 0.05)'}
                >
                  <WhatsAppIcon size={40} color="#22c55e" style={{ margin: '0 auto 1rem', display: 'block' }} />
                  <h3 style={{ color: 'var(--text-primary)', margin: 0, fontSize: '1.1rem' }}>واتساب</h3>
                </div>
              </div>
            ) : (
              <form className="create-report-form" onSubmit={handleSaveReport} noValidate>

                <div className="form-section">
                  <h4 className="section-title"><User size={18} /> بيانات المندوب</h4>
                  <div className="form-row three-cols">
                    <div className="form-group">
                      <label>اسم المندوب</label>
                      <div className="input-with-icon">
                        <input type="text" name="agentName" required placeholder="أدخل اسم المندوب" />
                        <User size={16} className="input-icon2" />
                      </div>
                    </div>
                    <div className="form-group">
                      <label>رقم الهاتف {reportMethod === 'facebook' && '(اختياري)'}</label>
                      <div className={`input-with-icon ${phoneStatus === 'exists' ? 'phone-exists' : phoneStatus === 'new' ? 'phone-new' : ''}`}>
                        <input
                          type="tel"
                          name="phone"
                          required={reportMethod === 'call' || reportMethod === 'whatsapp'}
                          placeholder="أدخل رقم الهاتف"
                          dir="ltr"
                          style={{ textAlign: 'right' }}
                          value={phoneInput}
                          onChange={(e) => setPhoneInput(e.target.value)}
                        />
                        <PhoneIcon size={16} className="input-icon2" />
                      </div>
                      {phoneStatus === 'exists' && (
                        <span style={{ color: '#ef4444', fontSize: '0.8rem', marginTop: '0.2rem', display: 'block' }}>
                          {reportMethod === 'whatsapp' && existingCommMethod === 'مكالمة هاتفية'
                            ? 'هذا الرقم مسجل مسبقاً عن طريق مكالمة'
                            : reportMethod === 'call' && existingCommMethod === 'واتساب'
                              ? 'هذا الرقم مسجل مسبقاً عن طريق واتساب'
                              : 'هذا الرقم مسجل مسبقاً'}
                        </span>
                      )}
                      {phoneStatus === 'new' && <span style={{ color: '#22c55e', fontSize: '0.8rem', marginTop: '0.2rem', display: 'block' }}>رقم جديد</span>}
                      {phoneStatus === 'checking' && <span style={{ color: '#3b82f6', fontSize: '0.8rem', marginTop: '0.2rem', display: 'block' }}>جاري التحقق...</span>}
                    </div>
                    <div className="form-group">
                      <label>المحافظة / المدينة</label>
                      <div className="input-with-icon">
                        <input type="text" name="city" required placeholder="مثال: القاهرة، الإسكندرية..." />
                        <MapPin size={16} className="input-icon2" />
                      </div>
                    </div>
                  </div>
                  {reportMethod === 'facebook' && (
                    <div className="form-group" style={{ marginTop: '1.2rem' }}>
                      <label>لينك الصفحة الشخصية (اختياري)</label>
                      <div className="input-with-icon">
                        <input type="url" name="profileLink" placeholder="أدخل الرابط..." dir="ltr" style={{ textAlign: 'right' }} />
                        <Link size={16} className="input-icon2" />
                      </div>
                    </div>
                  )}
                </div>


                <div className="form-section">
                  <h4 className="section-title"><Activity size={18} /> الحالة والنتيجة</h4>
                  <div className="form-row two-cols">
                    <div className="form-group full-width">
                      <label style={{ marginBottom: '0.8rem', display: 'block' }}>حالة المندوب</label>
                      <div className="radio-group">
                        <label className="radio-label status-license-only">
                          <input type="radio" name="agentStatus" value="رخصة قيادة" required />
                          <span>رخصة قيادة</span>
                        </label>
                        <label className="radio-label status-license-bike">
                          <input type="radio" name="agentStatus" value="رخصة وموتوسيكل" required />
                          <span>رخصة وموتوسيكل</span>
                        </label>
                        <label className="radio-label status-no-license">
                          <input type="radio" name="agentStatus" value="بدون (لا يوجد)" required />
                          <span>بدون (لا يوجد)</span>
                        </label>
                      </div>
                    </div>

                    <div className="form-group full-width">
                      <label style={{ marginBottom: '0.8rem', display: 'block' }}>حالة المكالمة</label>
                      <div className="radio-group">
                        <label className="radio-label status-no-answer">
                          <input type="radio" name="callStatus" value="لا يوجد رد" required />
                          <span>لا يوجد رد</span>
                        </label>
                        <label className="radio-label status-rejected">
                          <input type="radio" name="callStatus" value="رفض" required />
                          <span>رفض</span>
                        </label>
                        <label className="radio-label status-details-sent">
                          <input type="radio" name="callStatus" value="تم إرسال تفاصيل" required />
                          <span>تم إرسال تفاصيل</span>
                        </label>
                        <label className="radio-label status-interested">
                          <input type="radio" name="callStatus" value="مهتم (موافق)" required />
                          <span>مهتم (موافق)</span>
                        </label>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="form-section">
                  <h4 className="section-title"><FileText size={18} /> التقرير</h4>
                  <div className="form-row">
                    <div className="form-group full-width">
                      <textarea name="report" rows="3" required placeholder="اكتب ملخص ما تم في المكالمة..."></textarea>
                    </div>
                  </div>
                </div>

                <div className="form-actions">
                  <button type="submit" className="btn-save">حفظ التقرير</button>
                  <button type="button" className="btn-cancel" onClick={() => { setIsModalOpen(false); setReportMethod(null); setPhoneInput(''); setPhoneStatus('empty'); }}>إلغاء</button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Confirm Duplicate Modal */}
      {showConfirmDuplicate && (
        <div className="modal-overlay" style={{ zIndex: 1000 }} onClick={() => setShowConfirmDuplicate(false)}>
          <div className="modal-content" style={{ maxWidth: '400px', textAlign: 'center', padding: '2rem' }} onClick={e => e.stopPropagation()}>
            <div style={{ color: '#ef4444', marginBottom: '1rem' }}>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ margin: '0 auto' }}>
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="8" x2="12" y2="12"></line>
                <line x1="12" y1="16" x2="12.01" y2="16"></line>
              </svg>
            </div>
            <h3 style={{ marginBottom: '1rem', color: 'var(--text-primary)' }}>تنبيه: الرقم مسجل مسبقاً</h3>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem', lineHeight: '1.5' }}>
              هذا الرقم موجود بالفعل في النظام. هل أنت متأكد أنك تريد المتابعة وحفظ التقرير؟
            </p>
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
              <button
                type="button"
                className="btn-save"
                onClick={() => processCallReport(pendingCallData)}
              >
                نعم، احفظ التقرير
              </button>
              <button
                type="button"
                className="btn-cancel"
                onClick={() => { setShowConfirmDuplicate(false); setPendingCallData(null); }}
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Date Warning Modal */}
      {isDateWarningOpen && (
        <div className="modal-overlay" onClick={() => setIsDateWarningOpen(false)}>
          <div className="modal-content warning-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 style={{ color: '#f59e0b' }}>تحذير تاريخ قديم</h2>
              <button className="close-btn" onClick={() => setIsDateWarningOpen(false)}>&times;</button>
            </div>
            <p style={{ marginBottom: '2rem', fontSize: '1.1rem', color: 'var(--text-secondary)' }}>
              أنت على وشك عرض وإضافة بيانات ليوم سابق. هل تود الاستمرار؟
            </p>
            <div className="form-actions">
              <button type="button" className="btn-cancel" onClick={() => setIsDateWarningOpen(false)}>إلغاء</button>
              <button type="button" className="btn-save" style={{ backgroundColor: '#f59e0b' }} onClick={confirmDateChange}>استمرار</button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toast.show && (
        <div className={`toast-notification toast-${toast.type}`}>
          {toast.message}
        </div>
      )}
    </div>
  );
};

export default Home;
