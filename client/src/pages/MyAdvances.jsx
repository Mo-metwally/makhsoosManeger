import React, { useState, useEffect } from 'react';
import { Wallet, PlusCircle, Clock, CheckCircle, XCircle, DollarSign, Calendar, X, Send, Trash2, Edit } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import './MyAdvances.css';
import './Expenses.css'; // For advanced table styles

import { useParams } from 'react-router-dom';

const MyAdvances = () => {
  const { user } = useAuth();
  const { userId } = useParams();
  const [requests, setRequests] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [baseSalary, setBaseSalary] = useState(0);
  const [baseEarnings, setBaseEarnings] = useState(0);
  const [systemRecords, setSystemRecords] = useState([]);
  const [detailedStats, setDetailedStats] = useState({ absentCount: 0, absentPenalty: 0, lateMins: 0, latePenalty: 0 });
  const [showDeductionsModal, setShowDeductionsModal] = useState(false);
  const [totalDeductions, setTotalDeductions] = useState(0);
  const [totalAdditions, setTotalAdditions] = useState(0);
  const [viewedUserName, setViewedUserName] = useState('');
  const [adjustments, setAdjustments] = useState([]);
  const [editingAdjustment, setEditingAdjustment] = useState(null);
  const [showEditAdjustmentModal, setShowEditAdjustmentModal] = useState(false);
  const [editAdjType, setEditAdjType] = useState('Addition');
  const [editAdjAmount, setEditAdjAmount] = useState('');
  const [editAdjReason, setEditAdjReason] = useState('');
  const [adjCurrentPage, setAdjCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const todayMonthKey = new Date().toISOString().slice(0, 7);
  const [selectedMonth, setSelectedMonth] = useState(todayMonthKey);

  useEffect(() => {
    fetchRequests();
    // eslint-disable-next-line
  }, [selectedMonth]);

  const fetchRequests = () => {
    const endpoint = userId ? `/advances/user/${userId}?monthKey=${selectedMonth}` : `/advances/me?monthKey=${selectedMonth}`;
    api.get(endpoint)
      .then(res => {
        setRequests(res.data.requests || []);

        if (res.data.userProfile) {
          setViewedUserName(res.data.userProfile.name);
        }

        const salary = res.data.salary || 0;
        setBaseSalary(salary);

        const stats = res.data.stats || { absentCount: 0, dayOffWorkCount: 0 };
        
        // Calculate counts locally in case backend isn't restarted
        let localPresentCount = 0;
        let localDayOffCount = 0;
        if (res.data.logs) {
          res.data.logs.forEach(log => {
            if (log.status === 'Present' || log.status === 'Late') localPresentCount++;
            if (log.status === 'DayOff') localDayOffCount++;
          });
        }

        const workingHours = res.data.workingHours || 8;
        const absencePenaltyMultiplier = Number(localStorage.getItem('absencePenaltyMultiplier') || '2');
        const dayOffWorkMultiplier = Number(localStorage.getItem('dayOffWorkMultiplier') || '1.5');
        const allowedDelayMinutes = Number(localStorage.getItem('allowedDelayMinutes') || '15');
        const enableLatePenalty = localStorage.getItem('enableLatePenalty') !== 'false';
        const dailyRate = salary / 30;
        
        const earnings = (localPresentCount + localDayOffCount) * dailyRate;
        setBaseEarnings(Math.round(earnings));

        let calculatedLateMins = 0;
        if (enableLatePenalty && res.data.logs && res.data.shiftStartTime) {
          res.data.logs.forEach(log => {
            if ((log.status === 'Present' || log.status === 'DayOffWork' || log.status === 'Late') && log.checkInTime) {
              const checkInDate = new Date(log.checkInTime);
              const [startHour, startMin] = res.data.shiftStartTime.split(':').map(Number);

              const shiftStart = new Date(checkInDate);
              shiftStart.setHours(startHour, startMin, 0, 0);

              if (checkInDate > shiftStart) {
                const diffMs = checkInDate - shiftStart;
                const diffMins = Math.floor(diffMs / 60000);
                const actualDelayMins = diffMins - allowedDelayMinutes;
                if (actualDelayMins > 0) {
                  calculatedLateMins += actualDelayMins;
                }
              }
            }
          });
        }

        const absentPenalty = stats.absentCount * absencePenaltyMultiplier * dailyRate;
        const latePenalty = calculatedLateMins * (dailyRate / workingHours / 60);

        let autoDeductions = Math.round(absentPenalty + latePenalty);
        let autoAdditions = Math.round(stats.dayOffWorkCount * dailyRate * dayOffWorkMultiplier);

        let manualAdds = 0;
        let manualDeds = 0;

        let adjs = res.data.adjustments || [];
        // Sort by newest first
        adjs = adjs.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        setAdjustments(adjs);
        setAdjCurrentPage(1); // Reset page on new fetch

        adjs.forEach(adj => {
          if (adj.type === 'Addition') manualAdds += Number(adj.amount);
          if (adj.type === 'Deduction') manualDeds += Number(adj.amount);
        });

        const records = [];
        if (res.data.logs) {
          res.data.logs.forEach(log => {
            if (log.status === 'Absent') {
              records.push({
                id: `absent-${log.id}`,
                date: log.date,
                type: 'absent',
                amount: absencePenaltyMultiplier * dailyRate,
                text: 'خصم غياب'
              });
            } else if (log.status === 'DayOffWork') {
              records.push({
                id: `add-${log.id}`,
                date: log.date,
                type: 'addition',
                amount: dayOffWorkMultiplier * dailyRate,
                text: 'إضافي عمل في الإجازة'
              });
            }
          });
        }
        setSystemRecords(records);

        setDetailedStats({
          absentCount: stats.absentCount,
          absentPenalty: Math.round(absentPenalty),
          lateMins: calculatedLateMins,
          latePenalty: Math.round(latePenalty),
          dayOffWorkCount: stats.dayOffWorkCount,
          presentCount: localPresentCount,
          dayOffCount: localDayOffCount,
          autoAdditions: Math.round(autoAdditions),
          autoDeductions: Math.round(autoDeductions),
          manualAdditions: manualAdds,
          manualDeductions: manualDeds
        });

        setTotalDeductions(autoDeductions + manualDeds);
        setTotalAdditions(autoAdditions + manualAdds);
      })
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
      .catch(err => {
        console.error('Error submitting advance request:', err);
        alert('حدث خطأ أثناء إرسال الطلب');
      });
  };

  const handleDeleteAdjustment = async (id) => {
    if (!window.confirm('هل أنت متأكد من حذف هذا التعديل اليدوي؟')) return;
    try {
      await api.delete(`/salary-adjustments/delete/${id}`);
      fetchRequests();
    } catch (err) {
      console.error('Error deleting adjustment:', err);
      alert('حدث خطأ أثناء الحذف');
    }
  };

  const openEditAdjustment = (adj) => {
    setEditingAdjustment(adj);
    setEditAdjType(adj.type);
    setEditAdjAmount(adj.amount);
    setEditAdjReason(adj.reason || '');
    setShowEditAdjustmentModal(true);
  };

  const handleUpdateAdjustment = async (e) => {
    e.preventDefault();
    try {
      await api.put(`/salary-adjustments/edit/${editingAdjustment.id}`, {
        type: editAdjType,
        amount: editAdjAmount,
        reason: editAdjReason
      });
      setShowEditAdjustmentModal(false);
      fetchRequests();
    } catch (err) {
      console.error('Error updating adjustment:', err);
      alert('حدث خطأ أثناء التحديث');
    }
  };

  const totalPending = requests.filter(r => r.status === 'pending').reduce((sum, r) => sum + r.amount, 0);
  const totalApproved = requests.filter(r => r.status === 'approved').reduce((sum, r) => sum + r.amount, 0);
  const totalRejected = requests.filter(r => r.status === 'rejected').reduce((sum, r) => sum + r.amount, 0);
  const totalSettled = requests.filter(r => r.status === 'settled').reduce((sum, r) => sum + r.amount, 0);

  // Pagination for adjustments
  const indexOfLastAdj = adjCurrentPage * itemsPerPage;
  const indexOfFirstAdj = indexOfLastAdj - itemsPerPage;
  const currentAdjustments = adjustments.slice(indexOfFirstAdj, indexOfLastAdj);
  const totalAdjPages = Math.ceil(adjustments.length / itemsPerPage);

  const paginateAdj = (pageNumber) => setAdjCurrentPage(pageNumber);

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
          <h1>{userId && viewedUserName ? `محفظة ${viewedUserName}` : 'محفظتي'}</h1>
        </div>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            style={{ padding: '0.6rem 1rem', borderRadius: '12px', border: '1px solid var(--border-color)', background: 'var(--glass-bg)', color: 'var(--text-primary)', outline: 'none' }}
          />
          {!userId && (
            <button className="add-expense-btn" onClick={() => setShowModal(true)}>
              <PlusCircle size={20} />
              <span>طلب سلفة جديدة</span>
            </button>
          )}
        </div>
      </div>

      <section className="expenses-hero-section" style={{ position: 'relative', marginTop: '2rem', marginBottom: '2rem' }}>
        <div className="expenses-main-row">
          <div className="expenses-inputs-container" style={{ flexDirection: 'column', alignItems: 'stretch', justifyContent: 'center' }}>
            <div className="opening-balance-badge" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', marginBottom: '1rem' }}>
              <span className="badge-label" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <DollarSign size={20} />
                الراتب الأساسي:
              </span>
              <span className="badge-value">
                {baseSalary.toLocaleString()} <small>ج.م</small>
              </span>
            </div>

            <div className="input-card" style={{ borderRight: '4px solid #10b981' }}>
              <div className="input-card-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <h3 style={{ color: '#10b981', margin: 0 }}>إجمالي الإضافي</h3>
                </div>
              </div>
              <div className="input-wrapper">
                <div className="glass-input readonly-display">
                  {totalAdditions.toLocaleString()}
                </div>
                <span className="input-currency">ج.م</span>
              </div>
            </div>

            <div className="opening-balance-badge" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', marginBottom: '1rem', background: 'transparent', border: 'none', padding: '0' }}>
              <span className="badge-label" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)' }}>
                إحصائيات الحضور:
              </span>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                <span style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', padding: '0.3rem 0.8rem', borderRadius: '20px', fontSize: '0.85rem', fontWeight: 'bold' }}>
                  حضور: {detailedStats.presentCount}
                </span>
                <span style={{ background: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6', padding: '0.3rem 0.8rem', borderRadius: '20px', fontSize: '0.85rem', fontWeight: 'bold' }}>
                  إجازات: {detailedStats.dayOffCount}
                </span>
                <span style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', padding: '0.3rem 0.8rem', borderRadius: '20px', fontSize: '0.85rem', fontWeight: 'bold' }}>
                  غياب: {detailedStats.absentCount}
                </span>
              </div>
            </div>
          </div>

          <div className="visa-card-widget">
            <div className="visa-glow"></div>
            <div className="visa-top">
              <div className="visa-chip">
                <div className="chip-line"></div>
                <div className="chip-line"></div>
                <div className="chip-line"></div>
              </div>
              <div className="visa-logo">MAKHSOOS</div>
            </div>
            <div className="visa-middle">
              <div className="visa-label">صافي الراتب المتوقع</div>
              <div className={`visa-balance ${(baseEarnings + totalAdditions - totalDeductions - totalApproved) < 0 ? 'negative' : ''}`}>
                <span className="amount">{Math.round(baseEarnings + totalAdditions - totalDeductions - totalApproved).toLocaleString()}</span>
                <span className="currency">EGP</span>
              </div>
            </div>
            <div className="visa-bottom">
              <div className="visa-holder">
                <span>CARD HOLDER</span>
                <div className="name">{user.fullName || user.username}</div>
              </div>
              <div className="visa-expires">
                <span>STATUS</span>
                <div className="date" style={{ color: '#10b981' }}>
                  ACTIVE
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="stats-row">
        <div
          className="stat-card stat-card-clickable"
          style={{ border: '1px solid rgba(239, 68, 68, 0.3)', cursor: 'pointer', transition: 'all 0.3s ease' }}
          onClick={() => setShowDeductionsModal(true)}
        >
          <div className="stat-icon" style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444' }}><DollarSign size={24} /></div>
          <div className="stat-info">
            <h3 style={{ color: '#ef4444' }}>إجمالي الخصميات</h3>
            <p style={{ color: '#ef4444' }}>{totalDeductions.toLocaleString()} ج.م</p>
          </div>
        </div>
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
        <div className="stat-card stat-card-settled" style={{ background: 'rgba(34, 197, 94, 0.1)', border: '1px solid rgba(34, 197, 94, 0.3)' }}>
          <div className="stat-icon" style={{ background: 'rgba(34, 197, 94, 0.2)', color: '#22c55e' }}><CheckCircle size={24} /></div>
          <div className="stat-info">
            <h3 style={{ color: '#22c55e' }}>سلف مسددة (تم التسوية)</h3>
            <p style={{ color: '#22c55e' }}>{totalSettled.toLocaleString()} ج.م</p>
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

      {adjustments.length > 0 && (
        <div className="table-container" style={{ marginTop: '2rem', marginBottom: '2rem' }}>
          <div className="advanced-table-wrapper fade-in" style={{ background: 'var(--glass-bg)', border: 'var(--glass-border)', borderRadius: '16px', padding: '1.5rem' }}>
            <h3 style={{ marginBottom: '1.5rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Edit size={24} className="theme-color" />
              سجل التعديلات اليدوية (مكافآت / جزاءات)
            </h3>
            <table className="expenses-advanced-table">
              <thead>
                <tr>
                  <th style={{ textAlign: 'center' }}>التاريخ والوقت</th>
                  <th style={{ textAlign: 'center' }}>النوع</th>
                  <th style={{ textAlign: 'center' }}>المبلغ</th>
                  <th style={{ textAlign: 'center' }}>السبب</th>
                  {(user?.role === 'Admin' || user?.role === 'SuperAdmin') && <th style={{ textAlign: 'center' }}>إجراءات</th>}
                </tr>
              </thead>
              <tbody>
                {currentAdjustments.map(adj => (
                  <tr key={adj.id}>
                    <td style={{ textAlign: 'center', whiteSpace: 'nowrap' }} dir="ltr">
                      {new Date(adj.createdAt).toLocaleString('ar-EG', { dateStyle: 'short', timeStyle: 'short' })}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      {adj.type === 'Addition' ? (
                        <span className="status-badge approved"><CheckCircle size={14} /> إضافي (مكافأة)</span>
                      ) : (
                        <span className="status-badge rejected"><XCircle size={14} /> خصم (جزاء)</span>
                      )}
                    </td>
                    <td style={{ textAlign: 'center', color: adj.type === 'Addition' ? '#10b981' : '#ef4444', fontWeight: 'bold' }}>
                      <span dir="ltr">{adj.type === 'Addition' ? '+' : '-'}{adj.amount.toLocaleString()}</span> ج.م
                    </td>
                    <td style={{ textAlign: 'center' }}>{adj.reason || 'بدون سبب'}</td>
                    {(user?.role === 'Admin' || user?.role === 'SuperAdmin') && (
                      <td style={{ textAlign: 'center' }}>
                        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                          <button
                            style={{ background: 'transparent', border: 'none', color: '#3b82f6', cursor: 'pointer', padding: '0.2rem' }}
                            onClick={() => openEditAdjustment(adj)}
                            title="تعديل"
                          >
                            <Edit size={18} />
                          </button>
                          <button
                            style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '0.2rem' }}
                            onClick={() => handleDeleteAdjustment(adj.id)}
                            title="حذف"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>

            {totalAdjPages > 1 && (
              <div className="pagination" style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', marginTop: '1.5rem' }}>
                {Array.from({ length: totalAdjPages }, (_, i) => (
                  <button
                    key={i + 1}
                    onClick={() => paginateAdj(i + 1)}
                    style={{
                      background: adjCurrentPage === i + 1 ? 'var(--primary-color)' : 'rgba(255,255,255,0.05)',
                      color: '#fff',
                      border: '1px solid rgba(255,255,255,0.1)',
                      padding: '0.5rem 1rem',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      transition: 'all 0.3s ease'
                    }}
                  >
                    {i + 1}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      <div className="table-container">
        <h2 style={{ marginBottom: '1.5rem', color: 'var(--text-primary)' }}>سجل الطلبات ({new Date(selectedMonth + '-01').toLocaleString('ar-EG', { month: 'long', year: 'numeric' })})</h2>
        <div className="advanced-table-wrapper fade-in" style={{ background: 'var(--glass-bg)', border: 'var(--glass-border)', borderRadius: '16px', padding: '1rem' }}>
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
              {systemRecords.map(rec => (
                <tr key={rec.id} style={{ background: rec.type === 'absent' ? 'rgba(239, 68, 68, 0.05)' : 'rgba(16, 185, 129, 0.05)' }}>
                  <td>
                    <div className="date-cell">
                      <Calendar size={14} />
                      <span>{new Date(rec.date).toLocaleDateString('ar-EG', { weekday: 'long', year: 'numeric', month: 'short', day: 'numeric' })}</span>
                    </div>
                  </td>
                  <td>
                    <div className="time-cell">
                      <span>---</span>
                    </div>
                  </td>
                  <td>
                    <span className="amount-cell" style={{ color: rec.type === 'absent' ? '#ef4444' : '#10b981', fontWeight: 'bold' }}>
                      {Math.round(rec.amount).toLocaleString()} ج.م
                    </span>
                  </td>
                  <td>
                    <span className="details-text" style={{ color: rec.type === 'absent' ? '#ef4444' : '#10b981' }}>
                      {rec.text}
                    </span>
                  </td>
                  <td>
                    <span className="status-badge" style={{ background: rec.type === 'absent' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)', color: rec.type === 'absent' ? '#ef4444' : '#10b981' }}>
                      {rec.type === 'absent' ? 'خصم نظام' : 'إضافة نظام'}
                    </span>
                  </td>
                </tr>
              ))}

              {detailedStats.latePenalty > 0 && (
                <tr style={{ background: 'rgba(245, 158, 11, 0.05)' }}>
                  <td>
                    <div className="date-cell">
                      <Clock size={14} />
                      <span>إجمالي الشهر</span>
                    </div>
                  </td>
                  <td>
                    <div className="time-cell">
                      <span>---</span>
                    </div>
                  </td>
                  <td>
                    <span className="amount-cell" style={{ color: '#f59e0b', fontWeight: 'bold' }}>
                      {detailedStats.latePenalty.toLocaleString()} ج.م
                    </span>
                  </td>
                  <td>
                    <span className="details-text" style={{ color: '#f59e0b' }}>
                      خصم تأخير ({detailedStats.lateMins} دقيقة)
                    </span>
                  </td>
                  <td>
                    <span className="status-badge" style={{ background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b' }}>
                      خصم نظام
                    </span>
                  </td>
                </tr>
              )}

              {requests.length === 0 && systemRecords.length === 0 && detailedStats.latePenalty === 0 ? (
                <tr>
                  <td colSpan="5" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                    لا توجد سجلات مسجلة لهذا الشهر.
                  </td>
                </tr>
              ) : (
                requests.map(req => (
                  <tr key={req.id}>
                    <td>
                      <div className="date-cell">
                        <Calendar size={14} />
                        <span>{new Date(req.date).toLocaleDateString('ar-EG', { weekday: 'long', year: 'numeric', month: 'short', day: 'numeric' })}</span>
                      </div>
                    </td>
                    <td>
                      <div className="time-cell">
                        <Clock size={14} />
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
        <div className="modal-overlay active">
          <div className="advance-modal">
            <div className="modal-header-advanced">
              <div>
                <div className="header-icon-wrapper">
                  <Wallet size={30} color="#fff" />
                </div>
                <h3>تقديم طلب سلفة</h3>
                <p>قم بملء البيانات لتقديم طلب سلفة جديدة لمديرك.</p>
              </div>
              <button className="close-btn" onClick={() => setShowModal(false)} style={{ background: 'rgba(255,255,255,0.1)', borderRadius: '50%', padding: '0.5rem', alignSelf: 'flex-start' }}>
                <X size={20} color="#fff" />
              </button>
            </div>

            <div className="modal-body-advanced">
              <div className="input-group">
                <label style={{ color: 'var(--text-secondary)', marginBottom: '0.5rem', display: 'block', fontSize: '0.95rem' }}>قيمة السلفة المطلوبة (ج.م)</label>
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
                <label style={{ color: 'var(--text-secondary)', marginBottom: '0.5rem', display: 'block', fontSize: '0.95rem' }}>سبب السلفة (اختياري)</label>
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
      {showDeductionsModal && (
        <div className="modal-overlay active">
          <div className="modal-content glass-modal" style={{ maxWidth: '400px' }}>
            <div className="modal-header">
              <h3 style={{ color: '#ef4444', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <DollarSign size={20} /> تفاصيل الخصميات
              </h3>
              <button className="close-btn" onClick={() => setShowDeductionsModal(false)}><X size={20} /></button>
            </div>

            <div className="modal-body">
              <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '12px', padding: '1rem', marginBottom: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', paddingBottom: '1rem', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)' }}>
                    <Calendar size={18} />
                    <span>خصم الغياب ({detailedStats.absentCount} يوم)</span>
                  </div>
                  <strong style={{ color: '#ef4444' }}>{detailedStats.absentPenalty} ج.م</strong>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)' }}>
                    <Clock size={18} />
                    <span>خصم التأخير ({detailedStats.lateMins} دقيقة)</span>
                  </div>
                  <strong style={{ color: '#ef4444' }}>{detailedStats.latePenalty} ج.م</strong>
                </div>
              </div>

              <div style={{ background: 'rgba(239, 68, 68, 0.1)', padding: '1rem', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: 'var(--text-primary)', fontWeight: 'bold' }}>الإجمالي</span>
                <strong style={{ color: '#ef4444', fontSize: '1.2rem' }}>{totalDeductions} ج.م</strong>
              </div>
            </div>
          </div>
        </div>
      )}

      {showEditAdjustmentModal && editingAdjustment && (
        <div className="modal-overlay active">
          <div className="modal-content glass-modal" style={{ maxWidth: '400px' }}>
            <div className="modal-header">
              <h3>تعديل {editAdjType === 'Addition' ? 'المكافأة' : 'الخصم'}</h3>
              <button className="close-btn" onClick={() => setShowEditAdjustmentModal(false)}><X size={20} /></button>
            </div>
            <div className="modal-body">
              <form onSubmit={handleUpdateAdjustment} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label style={{ color: 'var(--text-secondary)', marginBottom: '0.5rem', display: 'block' }}>النوع</label>
                  <select
                    value={editAdjType}
                    onChange={(e) => setEditAdjType(e.target.value)}
                    style={{ width: '100%', padding: '0.8rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.2)', color: '#fff', outline: 'none' }}
                  >
                    <option value="Addition">إضافي (مكافأة)</option>
                    <option value="Deduction">خصم (جزاء)</option>
                  </select>
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label style={{ color: 'var(--text-secondary)', marginBottom: '0.5rem', display: 'block' }}>المبلغ (ج.م)</label>
                  <input
                    type="number"
                    value={editAdjAmount}
                    onChange={(e) => setEditAdjAmount(e.target.value)}
                    style={{ width: '100%', padding: '0.8rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.2)', color: '#fff', outline: 'none' }}
                    required
                    min="1"
                  />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label style={{ color: 'var(--text-secondary)', marginBottom: '0.5rem', display: 'block' }}>السبب</label>
                  <input
                    type="text"
                    value={editAdjReason}
                    onChange={(e) => setEditAdjReason(e.target.value)}
                    style={{ width: '100%', padding: '0.8rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.2)', color: '#fff', outline: 'none' }}
                  />
                </div>
                <button type="submit" className="submit-advanced-btn" style={{ marginTop: '1rem', width: '100%' }}>
                  حفظ التعديل
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default MyAdvances;
