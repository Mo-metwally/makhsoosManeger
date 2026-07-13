import React, { useState, useEffect } from 'react';
import { CalendarDays, Calendar as CalendarIcon, Users, CheckCircle, Clock, XCircle, Send, X, AlertTriangle } from 'lucide-react';
import api from '../services/api';
import './DayOff.css';
import { useToast } from '../contexts/ToastContext';

const DayOff = () => {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [userRequests, setUserRequests] = useState([]);
  const [allRequests, setAllRequests] = useState([]);
  const [days, setDays] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedDay, setSelectedDay] = useState(null);
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [activeTab, setActiveTab] = useState('apply'); // 'apply' or 'history'
  const [daysFilter, setDaysFilter] = useState('available'); // 'all' or 'available'

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const res = await api.get('/dayoff');
      setUserRequests(res.data.userRequests || []);
      setAllRequests(res.data.allRequests || []);
      generateDays(res.data.userRequests, res.data.allRequests);
    } catch (error) {
      console.error('Error fetching requests:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    document.title = "الإجازات | مخصوص";
    fetchRequests();
  }, []);

  useEffect(() => {
    generateDays(userRequests, allRequests, selectedMonth);
  }, [selectedMonth, userRequests, allRequests]);

  const generateDays = (uRequests = [], aRequests = [], monthStr = selectedMonth) => {
    const arabicDays = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
    const generatedDays = [];
    
    if (!monthStr) return;

    const [year, month] = monthStr.split('-');
    const mYear = parseInt(year);
    const mMonth = parseInt(month) - 1;

    const daysInMonth = new Date(mYear, mMonth + 1, 0).getDate();
    
    const today = new Date();
    today.setHours(0,0,0,0);
    
    for (let i = 1; i <= daysInMonth; i++) {
      const d = new Date(mYear, mMonth, i);
      // To format correctly considering local time
      const dateStr = [
        d.getFullYear(),
        String(d.getMonth() + 1).padStart(2, '0'),
        String(d.getDate()).padStart(2, '0')
      ].join('-');
      
      const dayName = arabicDays[d.getDay()];
      
      const userReq = uRequests.find(r => r.date === dateStr);
      
      const dayAllRequests = aRequests.filter(r => r.date === dateStr);
      const totalPending = dayAllRequests.filter(r => r.status === 'Pending').length;
      const totalApproved = dayAllRequests.filter(r => r.status === 'Approved').length;

      const diffTime = d.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 3600 * 24));
      const canApply = diffDays >= 2;
      const isPast = diffDays < 0;

      generatedDays.push({
        date: dateStr,
        dayName,
        userRequest: userReq,
        totalPending,
        totalApproved,
        canApply,
        isPast
      });
    }
    setDays(generatedDays);
  };

  const openModal = (day) => {
    setSelectedDay(day);
    setReason('');
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedDay) return;
    
    try {
      setSubmitting(true);
      await api.post('/dayoff', {
        date: selectedDay.date,
        dayName: selectedDay.dayName,
        reason
      });
      setModalOpen(false);
      fetchRequests();
      showToast('تم تقديم طلب الإجازة بنجاح', 'success');
    } catch (error) {
      showToast(error.response?.data?.error || 'حدث خطأ أثناء التقديم', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelRequest = async (requestId) => {
    if (!window.confirm('هل أنت متأكد أنك تريد إلغاء هذا الطلب؟')) return;
    try {
      await api.delete(`/dayoff/${requestId}`);
      fetchRequests();
      showToast('تم إلغاء الطلب بنجاح', 'success');
    } catch (error) {
      showToast(error.response?.data?.error || 'حدث خطأ أثناء الإلغاء', 'error');
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Pending':
        return <div className="status-badge status-pending"><Clock size={18} /> قيد المراجعة</div>;
      case 'Approved':
        return <div className="status-badge status-approved"><CheckCircle size={18} /> مقبول</div>;
      case 'Rejected':
        return <div className="status-badge status-rejected"><XCircle size={18} /> مرفوض</div>;
      default:
        return null;
    }
  };

  const monthApproved = userRequests.filter(r => r.status === 'Approved' && r.date.startsWith(selectedMonth)).length;
  const monthPending = userRequests.filter(r => r.status === 'Pending' && r.date.startsWith(selectedMonth)).length;
  const remaining = Math.max(0, 4 - monthApproved);

  return (
    <div className="dayoff-container fade-in">
      <div className="dayoff-header">
        <h1 className="dayoff-title">
          <CalendarDays size={32} style={{ color: 'var(--theme-color)' }} />
          <span>الإجازات</span>
        </h1>
        <div className="dayoff-filters" style={{display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap'}}>
          <input 
            type="month" 
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            style={{ padding: '0.6rem 1rem', borderRadius: '12px', border: '1px solid var(--border-color)', background: 'var(--glass-bg)', color: 'var(--text-primary)', outline: 'none' }}
          />
          <button 
            className={`btn-filter ${activeTab === 'apply' ? 'active' : ''}`}
            onClick={() => setActiveTab('apply')}
          >
            <Send size={18} /> التقديم على إجازة
          </button>
          <button 
            className={`btn-filter ${activeTab === 'history' ? 'active' : ''}`}
            onClick={() => setActiveTab('history')}
          >
            <CheckCircle size={18} /> أجازاتي
          </button>
        </div>
      </div>

      <div className="dayoff-summary fade-in" style={{
        background: 'rgba(255,255,255,0.03)', 
        padding: '1.5rem', 
        borderRadius: '16px', 
        display: 'flex', 
        gap: '2rem', 
        marginBottom: '2rem',
        border: '1px solid rgba(255,255,255,0.08)',
        boxShadow: '0 4px 15px rgba(0,0,0,0.1)'
      }}>
                    <>
              <div style={{ flex: 1, textAlign: 'center' }}>
                <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--green)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                  <CheckCircle size={28} /> {monthApproved}
                </div>
                <div style={{ color: 'var(--text-secondary)', marginTop: '8px' }}>إجازات مستهلكة ({selectedMonth})</div>
              </div>
              <div style={{ width: '1px', background: 'rgba(255,255,255,0.1)' }}></div>
              <div style={{ flex: 1, textAlign: 'center' }}>
                <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--orange)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                  <Clock size={28} /> {monthPending}
                </div>
                <div style={{ color: 'var(--text-secondary)', marginTop: '8px' }}>طلبات معلقة</div>
              </div>
              <div style={{ width: '1px', background: 'rgba(255,255,255,0.1)' }}></div>
              <div style={{ flex: 1, textAlign: 'center' }}>
                <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--theme-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                  <CalendarIcon size={28} /> {remaining}
                </div>
                <div style={{ color: 'var(--text-secondary)', marginTop: '8px' }}>الرصيد المتبقي (من 4)</div>
              </div>
            </>
      </div>

      {activeTab === 'apply' && (
        <div className="advanced-radio-filter fade-in">
          <label className={`radio-pill ${daysFilter === 'all' ? 'active' : ''}`}>
            <input 
              type="radio" 
              name="daysFilter" 
              value="all" 
              checked={daysFilter === 'all'} 
              onChange={(e) => setDaysFilter(e.target.value)} 
            />
            <CalendarDays size={18} />
            <span>الكل (أيام الشهر بالكامل)</span>
          </label>
          <label className={`radio-pill ${daysFilter === 'available' ? 'active' : ''}`}>
            <input 
              type="radio" 
              name="daysFilter" 
              value="available" 
              checked={daysFilter === 'available'} 
              onChange={(e) => setDaysFilter(e.target.value)} 
            />
            <CheckCircle size={18} />
            <span>الأيام المتاحة للتقديم فقط</span>
          </label>
        </div>
      )}

      {activeTab === 'apply' && loading ? (
        <div style={{ textAlign: 'center', marginTop: '3rem' }}>
          <div className="spinning" style={{ display: 'inline-block' }}><Clock size={30} /></div>
          <p>جاري التحميل...</p>
        </div>
      ) : activeTab === 'apply' && (
        <div className="dayoff-grid">
          {days.filter(d => daysFilter === 'all' ? true : d.canApply).map((day, idx) => (
            <div className={`dayoff-card ${day.isPast ? 'past-day' : ''}`} key={idx} style={{ opacity: day.isPast ? 0.6 : 1 }}>
              <div className="day-name">{day.dayName}</div>
              <div className="day-date">
                <CalendarIcon size={14} /> {day.date}
              </div>
              
              <div className="stats-container">
                <div className="stat-box" title="طلبات الإجازة المعلقة">
                  <div className="stat-number text-orange">{day.totalPending}</div>
                  <div className="stat-label">معلق</div>
                </div>
                <div className="stat-box" title="الذين حصلوا على الموافقة">
                  <div className="stat-number text-green">{day.totalApproved}</div>
                  <div className="stat-label">إجازة فعلية</div>
                </div>
              </div>

              <div style={{ marginTop: 'auto' }}>
                {day.userRequest ? (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
                    <div style={{ flex: 1 }}>{getStatusBadge(day.userRequest.status)}</div>
                    {day.userRequest.status === 'Pending' && (
                      <button 
                        className="btn-cancel-req" 
                        onClick={() => handleCancelRequest(day.userRequest.id)} 
                        title="إلغاء الطلب"
                      >
                        <X size={18} />
                      </button>
                    )}
                  </div>
                ) : (
                  <button 
                    className="btn-apply" 
                    onClick={() => openModal(day)}
                    disabled={!day.canApply}
                    title={!day.canApply ? 'يجب التقديم قبل الإجازة بيومين على الأقل' : ''}
                  >
                    <Send size={18} /> تقديم على إجازة
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'history' && !loading && (
        <div className="dayoff-grid">
          {userRequests.filter(req => req.date.startsWith(selectedMonth)).length === 0 ? (
            <p style={{ color: 'var(--text-secondary)' }}>ليس لديك أي إجازات مسجلة في هذا الشهر.</p>
          ) : (
            userRequests.filter(req => req.date.startsWith(selectedMonth)).map((req, idx) => (
              <div className="dayoff-card" key={idx}>
                <div className="day-name">{req.dayName}</div>
                <div className="day-date">
                  <CalendarIcon size={14} /> {req.date}
                </div>
                <div style={{ margin: '1rem 0', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                  <strong>السبب:</strong> {req.reason || 'لا يوجد'}
                </div>
                <div style={{ marginTop: 'auto' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
                    <div style={{ flex: 1 }}>{getStatusBadge(req.status)}</div>
                    {req.status === 'Pending' && (
                      <button 
                        className="btn-cancel-req" 
                        onClick={() => handleCancelRequest(req.id)} 
                        title="إلغاء الطلب"
                      >
                        <X size={18} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {modalOpen && selectedDay && (
        <div className="do-modal-overlay" onClick={() => setModalOpen(false)}>
          <div className="do-modal-content" onClick={e => e.stopPropagation()}>
            <div className="do-modal-header">
              <h3>تقديم إجازة - {selectedDay.dayName}</h3>
              <button className="btn-close" onClick={() => setModalOpen(false)}>
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit}>
              {monthApproved >= 4 && (
                <div style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b', padding: '1rem', borderRadius: '12px', border: '1px solid rgba(245, 158, 11, 0.3)', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <AlertTriangle size={28} style={{ flexShrink: 0 }} />
                  <div>
                    <h4 style={{ margin: '0 0 0.3rem 0', fontWeight: 'bold' }}>تنبيه: إجازة غير مدفوعة</h4>
                    <p style={{ margin: 0, fontSize: '0.9rem', lineHeight: '1.4' }}>أنت على وشك طلب إجازة غير مدفوعة نظراً لاستهلاك كل أيام الإجازات (4/4) لهذا الشهر.</p>
                  </div>
                </div>
              )}
              <div className="do-form-group">
                <label>تاريخ الإجازة:</label>
                <div style={{ color: 'var(--text-primary)', padding: '0.8rem', background: 'var(--glass-bg)', border: '1px solid var(--border-color)', borderRadius: '8px' }}>
                  {selectedDay.date}
                </div>
              </div>

              <div className="do-form-group">
                <label>سبب الإجازة (اختياري):</label>
                <textarea 
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="اكتب سبب طلبك هنا إن وجد..."
                />
              </div>

              <button type="submit" className="btn-submit" disabled={submitting}>
                {submitting ? 'جاري الإرسال...' : (monthApproved >= 4 ? 'تأكيد طلب إجازة غير مدفوعة' : 'تأكيد الطلب')}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default DayOff;
