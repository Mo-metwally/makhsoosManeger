import React, { useState, useEffect } from 'react';
import { Wallet, PlusCircle, Clock, CheckCircle, XCircle, DollarSign, Calendar } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import './MyAdvances.css'; // Let's create this

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

  const getStatusBadge = (status) => {
    switch (status) {
      case 'pending': return <span className="status-badge pending"><Clock size={14}/> قيد المراجعة</span>;
      case 'approved': return <span className="status-badge approved"><CheckCircle size={14}/> مقبول (دين)</span>;
      case 'rejected': return <span className="status-badge rejected"><XCircle size={14}/> مرفوض</span>;
      case 'settled': return <span className="status-badge settled"><CheckCircle size={14}/> تم السداد</span>;
      default: return null;
    }
  };

  return (
    <div className="my-advances-page fade-in">
      <div className="header-section">
        <div className="header-title">
          <Wallet className="theme-color" size={32} />
          <h1>محفظة سلفياتي</h1>
        </div>
        <button className="new-request-btn glow-hover" onClick={() => setShowModal(true)}>
          <PlusCircle size={20} />
          <span>طلب سلفة جديدة</span>
        </button>
      </div>

      <div className="stats-row">
        <div className="stat-card">
          <div className="stat-icon pending-icon"><Clock size={24}/></div>
          <div className="stat-info">
            <h3>طلبات معلقة</h3>
            <p>{totalPending.toLocaleString()} ج.م</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon approved-icon"><DollarSign size={24}/></div>
          <div className="stat-info">
            <h3>إجمالي الديون (سلف مقبولة)</h3>
            <p>{totalApproved.toLocaleString()} ج.م</p>
          </div>
        </div>
      </div>

      <div className="requests-container">
        <h2>سجل الطلبات ({new Date(selectedMonth + '-01').toLocaleString('ar-EG', { month: 'long', year: 'numeric' })})</h2>
        {requests.length === 0 ? (
          <div className="no-data">لا توجد طلبات سلف مسجلة لهذا الشهر.</div>
        ) : (
          <div className="requests-grid">
            {requests.map(req => (
              <div key={req.id} className="request-card">
                <div className="req-header">
                  <div className="req-amount">{req.amount.toLocaleString()} ج.م</div>
                  {getStatusBadge(req.status)}
                </div>
                <div className="req-body">
                  <p><strong>السبب:</strong> {req.reason || 'بدون تفاصيل'}</p>
                </div>
                <div className="req-footer">
                  <span className="req-date"><Calendar size={14}/> {new Date(req.date).toLocaleDateString('ar-EG')}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showModal && (
        <div className="modal-overlay fade-in">
          <div className="advance-modal">
            <div className="modal-header">
              <h3>تقديم طلب سلفة</h3>
              <button className="close-btn" onClick={() => setShowModal(false)}><XCircle size={20}/></button>
            </div>
            <div className="modal-body">
              <div className="input-group">
                <label>قيمة السلفة المطلوبة (ج.م):</label>
                <div className="input-with-icon">
                  <DollarSign size={18} className="input-icon" />
                  <input 
                    type="number" 
                    placeholder="مثال: 500" 
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="glass-input"
                  />
                </div>
              </div>
              <div className="input-group">
                <label>سبب السلفة (اختياري):</label>
                <textarea 
                  placeholder="اكتب هنا..." 
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="glass-input glass-textarea"
                />
              </div>
              <button 
                className="submit-request-btn"
                onClick={handleRequestSubmit}
                disabled={!amount || amount <= 0}
              >
                إرسال الطلب
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyAdvances;
