import React, { useState, useEffect } from 'react';
import { CalendarDays, Calendar as CalendarIcon, Users, CheckCircle, Clock, XCircle, Send, X } from 'lucide-react';
import api from '../services/api';
import './DayOff.css';

const DayOff = () => {
  const [loading, setLoading] = useState(true);
  const [userRequests, setUserRequests] = useState([]);
  const [allRequests, setAllRequests] = useState([]);
  const [days, setDays] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedDay, setSelectedDay] = useState(null);
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState('apply'); // 'apply' or 'history'

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

  const generateDays = (uRequests = [], aRequests = []) => {
    const arabicDays = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
    const generatedDays = [];
    
    // Generate days to the end of the current month
    const today = new Date();
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    const daysInMonthLeft = endOfMonth.getDate() - today.getDate() + 1; // including today
    
    for (let i = 0; i < daysInMonthLeft; i++) {
      const d = new Date();
      d.setDate(d.getDate() + i);
      const dateStr = d.toISOString().split('T')[0];
      const dayName = arabicDays[d.getDay()];
      
      // Check if user requested this day
      const userReq = uRequests.find(r => r.date === dateStr);
      
      // Count stats
      const dayAllRequests = aRequests.filter(r => r.date === dateStr);
      const totalPending = dayAllRequests.filter(r => r.status === 'Pending').length;
      const totalApproved = dayAllRequests.filter(r => r.status === 'Approved').length;

      // Must be at least 2 days ahead to apply (e.g. today 8th -> earliest apply 10th)
      const canApply = i >= 2;

      generatedDays.push({
        date: dateStr,
        dayName,
        userRequest: userReq,
        totalPending,
        totalApproved,
        canApply
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
      fetchRequests(); // Refresh
    } catch (error) {
      alert(error.response?.data?.error || 'حدث خطأ أثناء التقديم');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelRequest = async (requestId) => {
    if (!window.confirm('هل أنت متأكد أنك تريد إلغاء هذا الطلب؟')) return;
    try {
      await api.delete(`/dayoff/${requestId}`);
      fetchRequests();
    } catch (error) {
      alert(error.response?.data?.error || 'حدث خطأ أثناء الإلغاء');
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

  return (
    <div className="dayoff-container fade-in">
      <div className="dayoff-header">
        <h1 className="dayoff-title">
          <CalendarDays size={32} className="text-blue-500" />
          <span>الإجازات</span>
        </h1>
        <div className="dayoff-filters">
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

      {activeTab === 'apply' && loading ? (
        <div style={{ textAlign: 'center', marginTop: '3rem' }}>
          <div className="spinning" style={{ display: 'inline-block' }}><Clock size={30} /></div>
          <p>جاري التحميل...</p>
        </div>
      ) : activeTab === 'apply' && (
        <div className="dayoff-grid">
          {days.map((day, idx) => (
            <div className="dayoff-card" key={idx}>
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
          {userRequests.length === 0 ? (
            <p style={{ color: 'var(--text-secondary)' }}>ليس لديك أي إجازات سابقة مسجلة.</p>
          ) : (
            userRequests.map((req, idx) => (
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
                {submitting ? 'جاري الإرسال...' : 'تأكيد الطلب'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default DayOff;
