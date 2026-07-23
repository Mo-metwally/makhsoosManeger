import React, { useState, useEffect } from 'react';
import { CalendarDays, Calendar as CalendarIcon, Users, CheckCircle, Clock, XCircle, Send, X, AlertTriangle } from 'lucide-react';
import api from '../services/api';
import "./DayOff.scss";
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
          <CalendarDays size={32} className="dayoff-style-1" />
          <span>الإجازات</span>
        </h1>
        <div className="dayoff-filters dayoff-style-2" >
          <input 
            type="month" 
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="dayoff-style-3"
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

      <div className="dayoff-summary fade-in dayoff-style-4" >
                    <>
              <div className="dayoff-style-5">
                <div className="dayoff-style-6">
                  <CheckCircle size={28} /> {monthApproved}
                </div>
                <div className="dayoff-style-7">إجازات مستهلكة ({selectedMonth})</div>
              </div>
              <div className="dayoff-style-8"></div>
              <div className="dayoff-style-9">
                <div className="dayoff-style-10">
                  <Clock size={28} /> {monthPending}
                </div>
                <div className="dayoff-style-11">طلبات معلقة</div>
              </div>
              <div className="dayoff-style-12"></div>
              <div className="dayoff-style-13">
                <div className="dayoff-style-14">
                  <CalendarIcon size={28} /> {remaining}
                </div>
                <div className="dayoff-style-15">الرصيد المتبقي (من 4)</div>
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
        <div className="dayoff-style-16">
          <div className="spinning dayoff-style-17" ><Clock size={30} /></div>
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

              <div className="dayoff-style-18">
                {day.userRequest ? (
                  <div className="dayoff-style-19">
                    <div className="dayoff-style-20">{getStatusBadge(day.userRequest.status)}</div>
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
            <p className="dayoff-style-21">ليس لديك أي إجازات مسجلة في هذا الشهر.</p>
          ) : (
            userRequests.filter(req => req.date.startsWith(selectedMonth)).map((req, idx) => (
              <div className="dayoff-card" key={idx}>
                <div className="day-name">{req.dayName}</div>
                <div className="day-date">
                  <CalendarIcon size={14} /> {req.date}
                </div>
                <div className="dayoff-style-22">
                  <strong>السبب:</strong> {req.reason || 'لا يوجد'}
                </div>
                <div className="dayoff-style-23">
                  <div className="dayoff-style-24">
                    <div className="dayoff-style-25">{getStatusBadge(req.status)}</div>
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
                <div className="dayoff-style-26">
                  <AlertTriangle size={28} className="dayoff-style-27" />
                  <div>
                    <h4 className="dayoff-style-28">تنبيه: إجازة غير مدفوعة</h4>
                    <p className="dayoff-style-29">أنت على وشك طلب إجازة غير مدفوعة نظراً لاستهلاك كل أيام الإجازات (4/4) لهذا الشهر.</p>
                  </div>
                </div>
              )}
              <div className="do-form-group">
                <label>تاريخ الإجازة:</label>
                <div className="dayoff-style-30">
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
