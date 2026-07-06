import React, { useState, useEffect } from 'react';
import { Calendar, Clock, Check, Phone, CheckCircle, TrendingUp, Info, ChevronRight, Plus, UserPlus, Coffee, Moon, BookOpen, Play, LayoutDashboard, User, MapPin, PhoneCall as PhoneIcon, MessageSquare, FileText, Activity, MessageCircle, Send } from 'lucide-react';
import api from '../services/api';
import './Home.css';

const TARGET_CALLS = 30;

const Home = () => {
  const [calls, setCalls] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [toast, setToast] = useState({ show: false, message: '', type: 'error' });

  // Helper function to get local YYYY-MM-DD string to avoid timezone issues
  const getLocalDateString = (date = new Date()) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const [selectedDate, setSelectedDate] = useState(getLocalDateString());
  const [pendingDate, setPendingDate] = useState(null);
  const [isDateWarningOpen, setIsDateWarningOpen] = useState(false);

  // Break state
  const [activeBreak, setActiveBreak] = useState(localStorage.getItem('activeBreak') || null);
  const [breakStartTime, setBreakStartTime] = useState(localStorage.getItem('breakStartTime') || null);
  const [breakTimer, setBreakTimer] = useState('00:00');
  const [userName, setUserName] = useState('');

  useEffect(() => {
    document.title = "لوحة التحكم | مخصوص";
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

  const handleStartBreak = (breakType) => {
    const startTime = new Date().toISOString();
    setActiveBreak(breakType);
    setBreakStartTime(startTime);
    localStorage.setItem('activeBreak', breakType);
    localStorage.setItem('breakStartTime', startTime);
  };

  const handleEndBreak = () => {
    if (activeBreak && breakStartTime) {
      const endTime = new Date();
      const startTime = new Date(breakStartTime);
      const durationMs = endTime.getTime() - startTime.getTime();

      const logs = JSON.parse(localStorage.getItem('inactivity_logs') || '[]');
      const newLog = {
        id: Date.now(),
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        durationMs,
        type: activeBreak
      };
      localStorage.setItem('inactivity_logs', JSON.stringify([...logs, newLog]));
    }

    setActiveBreak(null);
    setBreakStartTime(null);
    localStorage.removeItem('activeBreak');
    localStorage.removeItem('breakStartTime');
    showToast('تم العودة للعمل بنجاح وتم تسجيل الفاصل', 'success');
  };

  const fetchCalls = async () => {
    try {
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
    const today = getLocalDateString();

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
    const commMethod = formData.get('commMethod');
    const agentStatus = formData.get('agentStatus');

    // Custom Validation
    if (!agentName || agentName.trim() === '') {
      showToast('يرجى إدخال اسم المندوب', 'error');
      return;
    }

    // Validate phone number (basic check for digits/length)
    const phoneRegex = /^[0-9+]{8,15}$/;
    if (!phone || !phoneRegex.test(phone.trim())) {
      showToast('يرجى إدخال رقم هاتف صحيح', 'error');
      return;
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

    // Check if phone number already exists
    const isPhoneExists = calls.some(call => call.phone === phone.trim());
    if (isPhoneExists) {
      showToast('هذا الرقم مسجل بالفعل في النظام', 'error');
      return;
    }

    // Construct date using selectedDate but current time
    const now = new Date();
    const selectedDateObj = new Date(selectedDate);
    selectedDateObj.setHours(now.getHours(), now.getMinutes(), now.getSeconds());

    const newCall = {
      agentName,
      phone,
      city,
      commMethod,
      agentStatus,
      callStatus,
      report,
      createdAt: selectedDateObj.toISOString()
    };

    try {
      await api.post('/data/calls', [newCall]);
      await fetchCalls(); // Refresh to get proper ID and any other DB fields
      setIsModalOpen(false);
      showToast('تم حفظ تقرير المكالمة بنجاح!', 'success');
    } catch (err) {
      console.error(err);
      showToast('حدث خطأ أثناء حفظ المكالمة', 'error');
    }
  };

  // Filter calls by selected date (using local date to match date picker)
  const filteredCalls = calls.filter(call => {
    const callDateStr = getLocalDateString(new Date(call.createdAt));
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
  const progressPercent = Math.min(totalCallsCount / TARGET_CALLS, 1);
  const strokeDashoffset = circumference - (progressPercent * circumference);

  return (
    <div className="home-container">
      {/* Header */}
      <header className="home-header">
        <div className="page-title-wrapper">
          <LayoutDashboard size={28} className="title-icon text-blue" />
          <h1 className="page-title gradient-title">لوحة التحكم</h1>
        </div>
        <div className="header-datetime">
          <input
            type="date"
            className="date-picker-input"
            value={selectedDate}
            onChange={handleDateChange}
          />
        </div>
      </header>

      {/* Main Status */}
      <section className="main-status-card">
        <div className="status-text">
          <h3 className="status-label">الحالة الحالية:</h3>
          <div className="status-value-group">
            <h2 className={activeBreak ? "status-active break-mode-text" : "status-active"}>
              {activeBreak || "نشط"}
            </h2>
            <span className="status-en" style={activeBreak ? { color: '#f59e0b', fontWeight: 'bold', fontSize: '1.2rem' } : {}}>
              ({activeBreak ? breakTimer : 'Active'})
            </span>
          </div>
        </div>
        <div className="status-icon-wrapper">
          <div className={`status-icon glow ${activeBreak ? 'break-mode-icon' : ''}`}>
            {activeBreak === 'بريك غداء' ? <Coffee size={50} strokeWidth={2} color="#f59e0b" /> :
              activeBreak === 'بريك صلاة' ? <Moon size={50} strokeWidth={2} color="#8b5cf6" /> :
                activeBreak === 'تدريب' ? <BookOpen size={50} strokeWidth={2} color="#3b82f6" /> :
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
            <button className="add-btn" onClick={() => setIsModalOpen(true)}>
              <Plus size={16} />
              <span>إنشاء تقرير</span>
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
                <span className="progress-total">من أصل {TARGET_CALLS}<br />مكالمات اليوم</span>
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
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>إنشاء تقرير مكالمة</h2>
              <button className="close-btn" onClick={() => setIsModalOpen(false)}>&times;</button>
            </div>
            <form className="create-report-form" onSubmit={handleSaveReport} noValidate>

              <div className="form-section">
                <h4 className="section-title"><User size={18}/> بيانات المندوب</h4>
                <div className="form-row three-cols">
                  <div className="form-group">
                    <label>اسم المندوب</label>
                    <div className="input-with-icon">
                      <input type="text" name="agentName" required placeholder="أدخل اسم المندوب" />
                      <User size={16} className="input-icon"/>
                    </div>
                  </div>
                  <div className="form-group">
                    <label>رقم الهاتف</label>
                    <div className="input-with-icon">
                      <input type="tel" name="phone" required placeholder="أدخل رقم الهاتف" dir="ltr" style={{ textAlign: 'right' }} />
                      <PhoneIcon size={16} className="input-icon"/>
                    </div>
                  </div>
                  <div className="form-group">
                    <label>المحافظة / المدينة</label>
                    <div className="input-with-icon">
                      <input type="text" name="city" required placeholder="مثال: القاهرة، الإسكندرية..." />
                      <MapPin size={16} className="input-icon"/>
                    </div>
                  </div>
                </div>
              </div>

              <div className="form-section">
                <h4 className="section-title"><MessageSquare size={18}/> تفاصيل التواصل</h4>
                <div className="form-row">
                  <div className="form-group full-width">
                    <label style={{ marginBottom: '0.8rem', display: 'block' }}>طريقة التواصل</label>
                    <div className="radio-group">
                      <label className="radio-label comm-whatsapp">
                        <input type="radio" name="commMethod" value="واتساب" required />
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}><MessageCircle size={16} /> واتساب</span>
                      </label>
                      <label className="radio-label comm-messenger">
                        <input type="radio" name="commMethod" value="ماسينجر" required />
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}><Send size={16} /> ماسينجر</span>
                      </label>
                      <label className="radio-label comm-call">
                        <input type="radio" name="commMethod" value="مكالمة هاتفية" required />
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}><PhoneIcon size={16} /> مكالمة هاتفية</span>
                      </label>
                    </div>
                  </div>
                </div>
              </div>

              <div className="form-section">
                <h4 className="section-title"><Activity size={18}/> الحالة والنتيجة</h4>
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
                <h4 className="section-title"><FileText size={18}/> التقرير</h4>
                <div className="form-row">
                  <div className="form-group full-width">
                    <textarea name="report" rows="3" required placeholder="اكتب ملخص ما تم في المكالمة..."></textarea>
                  </div>
                </div>
              </div>

              <div className="form-actions">
                <button type="button" className="btn-cancel" onClick={() => setIsModalOpen(false)}>إلغاء</button>
                <button type="submit" className="btn-save">حفظ المكالمة</button>
              </div>
            </form>
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
