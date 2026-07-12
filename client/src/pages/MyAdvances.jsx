import React, { useState, useEffect } from 'react';
import { Wallet, PlusCircle, Clock, CheckCircle, XCircle, DollarSign, Calendar, X, Send } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import './MyAdvances.css';
import './Expenses.css'; // For advanced table styles

const MyAdvances = () => {
  const { user } = useAuth();
  const [requests, setRequests] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');

  const todayMonthKey = new Date().toISOString().slice(0, 7);
  const [selectedMonth, setSelectedMonth] = useState(todayMonthKey);

  useEffect(() => {
    fetchRequests();
    // eslint-disable-next-line
  }, [selectedMonth]);

  const fetchRequests = () => {
    api.get(`/advances/me?monthKey=${selectedMonth}`)
      .then(res => setRequests(res.data))
      .catch(err => console.error('Error fetching advance requests:', err));
  };

  const formatTime12Hour = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    let h = d.getHours();
    const minutes = d.getMinutes().toString().padStart(2, '0');
    const ampm = h >= 12 ? 'م' : 'ص';
    h = h % 12 || 12;
    return `${h}:${minutes} ${ampm}`;
  };

  const handleRequestSubmit = () => {
    const val = parseFloat(amount);
    if (!val || val <= 0) return;

    api.post('/advances', {
      amount: val,
      reason,
      monthKey: selectedMonth
    })
      .then(res => {
        setRequests([res.data, ...requests]);
        setShowModal(false);
        setAmount('');
        setReason('');
      })
      .catch(err => console.error('Error submitting request:', err));
  };

  const totalPending = requests.filter(r => r.status === 'pending').reduce((sum, r) => sum + r.amount, 0);
  const totalApproved = requests.filter(r => r.status === 'approved').reduce((sum, r) => sum + r.amount, 0);
  const totalRejected = requests.filter(r => r.status === 'rejected').reduce((sum, r) => sum + r.amount, 0);

  const getStatusBadge = (status) => {
    switch (status) {
      case 'pending': return <span className="status-badge pending"><Clock size={14} /> قيد المراجعة</span>;
      case 'approved': return <span className="status-badge approved"><CheckCircle size={14} /> مقبول (دين)</span>;
      case 'rejected': return <span className="status-badge rejected"><XCircle size={14} /> مرفوض</span>;
      case 'settled': return <span className="status-badge settled"><CheckCircle size={14} /> تم السداد</span>;
      default: return null;
    }
  };

  return (
    <div className="my-advances-page fade-in">
      <div className="header-section">
        <div className="header-title">
          <Wallet className="theme-color" size={32} />
          <h1>محفظتي</h1>
        </div>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <input 
            type="month" 
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            style={{ padding: '0.6rem 1rem', borderRadius: '12px', border: '1px solid var(--border-color)', background: 'var(--glass-bg)', color: 'var(--text-primary)', outline: 'none' }}
          />
          <button className="new-request-btn glow-hover" onClick={() => setShowModal(true)}>
            <PlusCircle size={20} />
            <span>طلب سلفة جديدة</span>
          </button>
        </div>
      </div>

      <div className="stats-row">
        <div className="stat-card stat-card-pending">
          <div className="stat-icon"><Clock size={24} /></div>
          <div className="stat-info">
            <h3>طلبات معلقة</h3>
            <p>{totalPending.toLocaleString()} ج.م</p>
          </div>
        </div>
        <div className="stat-card stat-card-approved">
          <div className="stat-icon"><DollarSign size={24} /></div>
          <div className="stat-info">
            <h3>مقبولة (إجمالي الديون)</h3>
            <p>{totalApproved.toLocaleString()} ج.م</p>
          </div>
        </div>
        <div className="stat-card stat-card-rejected">
          <div className="stat-icon"><XCircle size={24} /></div>
          <div className="stat-info">
            <h3>طلبات مرفوضة</h3>
            <p>{totalRejected.toLocaleString()} ج.م</p>
          </div>
        </div>
      </div>

      <div className="requests-container">
        <h2 style={{ marginBottom: '1.5rem', color: 'var(--text-primary)' }}>سجل الطلبات ({new Date(selectedMonth + '-01').toLocaleString('ar-EG', { month: 'long', year: 'numeric' })})</h2>
        <div className="advanced-table-wrapper fade-in" style={{background: 'var(--glass-bg)', border: 'var(--glass-border)', borderRadius: '16px', padding: '1rem'}}>
          <table className="expenses-advanced-table">
            <thead>
              <tr>
                <th>التاريخ واليوم</th>
                <th>الوقت</th>
                <th>القيمة</th>
                <th>السبب</th>
                <th>الحالة</th>
              </tr>
            </thead>
            <tbody>
              {requests.length === 0 ? (
                <tr>
                  <td colSpan="5" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                    لا توجد طلبات سلف مسجلة لهذا الشهر.
                  </td>
                </tr>
              ) : (
                requests.map(req => (
                  <tr key={req.id}>
                    <td>
                      <div className="date-cell">
                        <Calendar size={14}/>
                        <span>{new Date(req.date).toLocaleDateString('ar-EG', { weekday: 'long', year: 'numeric', month: 'short', day: 'numeric' })}</span>
                      </div>
                    </td>
                    <td>
                      <div className="time-cell">
                        <Clock size={14}/>
                        <span dir="ltr">{formatTime12Hour(req.createdAt)}</span>
                      </div>
                    </td>
                    <td>
                      <span className="amount-cell" style={{ color: 'var(--text-primary)', fontWeight: 'bold' }}>
                        {req.amount.toLocaleString()} ج.م
                      </span>
                    </td>
                    <td>
                      <span className="details-text">
                        {req.reason || 'بدون تفاصيل'}
                      </span>
                    </td>
                    <td>
                      {getStatusBadge(req.status)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="modal-overlay fade-in">
          <div className="advance-modal">
            <div className="modal-header-advanced">
              <div>
                <div className="header-icon-wrapper">
                  <Wallet size={30} color="#fff" />
                </div>
                <h3>تقديم طلب سلفة</h3>
                <p>قم بملء البيانات لتقديم طلب سلفة جديدة لمديرك.</p>
              </div>
              <button className="close-btn" onClick={() => setShowModal(false)} style={{background: 'rgba(255,255,255,0.1)', borderRadius:'50%', padding:'0.5rem', alignSelf:'flex-start'}}>
                <X size={20} color="#fff"/>
              </button>
            </div>
            
            <div className="modal-body-advanced">
              <div className="input-group">
                <label style={{color: 'var(--text-secondary)', marginBottom: '0.5rem', display: 'block', fontSize: '0.95rem'}}>قيمة السلفة المطلوبة (ج.م)</label>
                <div className="input-with-icon-advanced">
                  <DollarSign size={20} className="input-icon-advanced" />
                  <input
                    type="number"
                    placeholder="مثال: 500"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="glass-input-advanced"
                    autoFocus
                  />
                </div>
              </div>
              
              <div className="input-group">
                <label style={{color: 'var(--text-secondary)', marginBottom: '0.5rem', display: 'block', fontSize: '0.95rem'}}>سبب السلفة (اختياري)</label>
                <textarea
                  placeholder="اكتب سبب طلبك هنا لتسهيل الموافقة..."
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="glass-input-advanced glass-textarea-advanced"
                />
              </div>

              <button className="submit-advanced-btn" onClick={handleRequestSubmit}>
                <Send size={20} />
                <span>إرسال الطلب</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyAdvances;
