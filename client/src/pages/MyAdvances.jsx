import React, { useState, useEffect } from 'react';
import { Wallet, PlusCircle, Clock, CheckCircle, XCircle, DollarSign, Calendar, X, Send, Trash2, Edit, AlertTriangle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { useParams, useSearchParams } from 'react-router-dom';
import api from '../services/api';
import "./MyAdvances.scss";
import "./Expenses.scss"; // For advanced table styles

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
  const [showAddModal, setShowAddModal] = useState(false);

  const [searchParams, setSearchParams] = useSearchParams();
  const date = new Date();
  const todayMonthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  const initialMonth = searchParams.get('monthKey') || todayMonthKey;

  const [selectedMonth, setSelectedMonth] = useState(initialMonth);
  const [isDataLoaded, setIsDataLoaded] = useState(false);

  useEffect(() => {
    if (selectedMonth) {
      setSearchParams({ monthKey: selectedMonth }, { replace: true });
    }
    fetchRequests();
    // eslint-disable-next-line
  }, [selectedMonth]);

  const fetchRequests = () => {
    setIsDataLoaded(false);
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
        setIsDataLoaded(true);
      })
      .catch(err => {
        console.error('Error fetching advance requests:', err);
        setIsDataLoaded(true);
      });
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
        <div className="myadvances-style-1">
          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="myadvances-style-2"
          />
          {!userId && (
            <button className="add-expense-btn" onClick={() => setShowModal(true)}>
              <PlusCircle size={20} />
              <span>طلب سلفة جديدة</span>
            </button>
          )}
        </div>
      </div>

      {isDataLoaded && baseSalary === 0 && (
        <div className="myadvances-style-3">
          <AlertTriangle color="#ef4444" size={32} className="myadvances-style-4" />
          <div>
            <h3 className="myadvances-style-5">تنبيه هام: البيانات المالية غير مكتملة</h3>
            <p className="myadvances-style-6">
              يجب تسجيل البيانات المالية الخاصة بالحساب (مثل الراتب الأساسي) حتى يعمل النظام بشكل صحيح وتتمكن من رؤية تفاصيل مستحقاتك بدقة. يرجى مراجعة الإدارة لاستكمال إعداد الحساب.
            </p>
          </div>
        </div>
      )}

      <section className="expenses-hero-section myadvances-style-7" >
        <div className="expenses-main-row">
          <div className="expenses-inputs-container myadvances-style-8" >
            <div className="opening-balance-badge myadvances-style-9" >
              <span className="badge-label myadvances-style-10" >
                <DollarSign size={20} />
                الراتب الأساسي:
              </span>
              <span className="badge-value">
                {baseSalary.toLocaleString()} <small>ج.م</small>
              </span>
            </div>

            <div className="input-card myadvances-style-11" >
              <div className="input-card-header">
                <div className="myadvances-style-12">
                  <h3 className="myadvances-style-13">إجمالي الإضافي</h3>
                </div>
              </div>
              <div className="input-wrapper">
                <div className="glass-input readonly-display">
                  {totalAdditions.toLocaleString()}
                </div>
                <span className="input-currency">ج.م</span>
              </div>
            </div>

            <div className="opening-balance-badge myadvances-style-14" >
              <span className="badge-label myadvances-style-15" >
                إحصائيات الحضور:
              </span>
              <div className="myadvances-style-16">
                <span className="myadvances-style-17">
                  حضور: {detailedStats.presentCount}
                </span>
                <span className="myadvances-style-18">
                  إجازات: {detailedStats.dayOffCount}
                </span>
                <span className="myadvances-style-19">
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
                <div className="date myadvances-style-20" >
                  ACTIVE
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="stats-row">
        <div
          className="stat-card stat-card-clickable myadvances-style-21"
          
          onClick={() => setShowDeductionsModal(true)}
        >
          <div className="stat-icon myadvances-style-22" ><DollarSign size={24} /></div>
          <div className="stat-info">
            <h3 className="myadvances-style-23">إجمالي الخصميات</h3>
            <p className="myadvances-style-24">{totalDeductions.toLocaleString()} ج.م</p>
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
        <div className="stat-card stat-card-settled myadvances-style-25" >
          <div className="stat-icon myadvances-style-26" ><CheckCircle size={24} /></div>
          <div className="stat-info">
            <h3 className="myadvances-style-27">سلف مسددة (تم التسوية)</h3>
            <p className="myadvances-style-28">{totalSettled.toLocaleString()} ج.م</p>
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
        <div className="table-container myadvances-style-29" >
          <div className="advanced-table-wrapper fade-in myadvances-style-30" >
            <h3 className="myadvances-style-31">
              <Edit size={24} className="theme-color" />
              سجل التعديلات اليدوية (مكافآت / جزاءات)
            </h3>
            <table className="expenses-advanced-table">
              <thead>
                <tr>
                  <th className="myadvances-style-32">التاريخ والوقت</th>
                  <th className="myadvances-style-33">النوع</th>
                  <th className="myadvances-style-34">المبلغ</th>
                  <th className="myadvances-style-35">السبب</th>
                  {(user?.role === 'Admin' || user?.role === 'SuperAdmin') && <th className="myadvances-style-36">إجراءات</th>}
                </tr>
              </thead>
              <tbody>
                {currentAdjustments.map(adj => (
                  <tr key={adj.id}>
                    <td className="myadvances-style-37" dir="ltr">
                      {new Date(adj.createdAt).toLocaleString('ar-EG', { dateStyle: 'short', timeStyle: 'short' })}
                    </td>
                    <td className="myadvances-style-38">
                      {adj.type === 'Addition' ? (
                        <span className="status-badge approved"><CheckCircle size={14} /> إضافي (مكافأة)</span>
                      ) : (
                        <span className="status-badge rejected"><XCircle size={14} /> خصم (جزاء)</span>
                      )}
                    </td>
                    <td style={{ textAlign: 'center', color: adj.type === 'Addition' ? '#10b981' : '#ef4444', fontWeight: 'bold' }}>
                      <span dir="ltr">{adj.type === 'Addition' ? '+' : '-'}{adj.amount.toLocaleString()}</span> ج.م
                    </td>
                    <td className="myadvances-style-39">{adj.reason || 'بدون سبب'}</td>
                    {(user?.role === 'Admin' || user?.role === 'SuperAdmin') && (
                      <td className="myadvances-style-40">
                        <div className="myadvances-style-41">
                          <button
                            className="myadvances-style-42"
                            onClick={() => openEditAdjustment(adj)}
                            title="تعديل"
                          >
                            <Edit size={18} />
                          </button>
                          <button
                            className="myadvances-style-43"
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
              <div className="pagination myadvances-style-44" >
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
        <h2 className="myadvances-style-45">سجل الطلبات ({new Date(selectedMonth + '-01').toLocaleString('ar-EG', { month: 'long', year: 'numeric' })})</h2>
        <div className="advanced-table-wrapper fade-in myadvances-style-46" >
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
                <tr className="myadvances-style-47">
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
                    <span className="amount-cell myadvances-style-48" >
                      {detailedStats.latePenalty.toLocaleString()} ج.م
                    </span>
                  </td>
                  <td>
                    <span className="details-text myadvances-style-49" >
                      خصم تأخير ({detailedStats.lateMins} دقيقة)
                    </span>
                  </td>
                  <td>
                    <span className="status-badge myadvances-style-50" >
                      خصم نظام
                    </span>
                  </td>
                </tr>
              )}

              {requests.length === 0 && systemRecords.length === 0 && detailedStats.latePenalty === 0 ? (
                <tr>
                  <td colSpan="5" className="myadvances-style-51">
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
                      <span className="amount-cell myadvances-style-52" >
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
              <button className="close-btn myadvances-style-53" onClick={() => setShowModal(false)} >
                <X size={20} color="#fff" />
              </button>
            </div>

            <div className="modal-body-advanced">
              <div className="input-group">
                <label className="myadvances-style-54">قيمة السلفة المطلوبة (ج.م)</label>
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
                <label className="myadvances-style-55">سبب السلفة (اختياري)</label>
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
          <div className="modal-content glass-modal myadvances-style-56" >
            <div className="modal-header">
              <h3 className="myadvances-style-57">
                <DollarSign size={20} /> تفاصيل الخصميات
              </h3>
              <button className="close-btn" onClick={() => setShowDeductionsModal(false)}><X size={20} /></button>
            </div>

            <div className="modal-body">
              <div className="myadvances-style-58">
                <div className="myadvances-style-59">
                  <div className="myadvances-style-60">
                    <Calendar size={18} />
                    <span>خصم الغياب ({detailedStats.absentCount} يوم)</span>
                  </div>
                  <strong className="myadvances-style-61">{detailedStats.absentPenalty} ج.م</strong>
                </div>

                <div className="myadvances-style-62">
                  <div className="myadvances-style-63">
                    <Clock size={18} />
                    <span>خصم التأخير ({detailedStats.lateMins} دقيقة)</span>
                  </div>
                  <strong className="myadvances-style-64">{detailedStats.latePenalty} ج.م</strong>
                </div>
              </div>

              <div className="myadvances-style-65">
                <span className="myadvances-style-66">الإجمالي</span>
                <strong className="myadvances-style-67">{totalDeductions} ج.م</strong>
              </div>
            </div>
          </div>
        </div>
      )}

      {showEditAdjustmentModal && editingAdjustment && (
        <div className="modal-overlay active">
          <div className="modal-content glass-modal myadvances-style-68" >
            <div className="modal-header">
              <h3>تعديل {editAdjType === 'Addition' ? 'المكافأة' : 'الخصم'}</h3>
              <button className="close-btn" onClick={() => setShowEditAdjustmentModal(false)}><X size={20} /></button>
            </div>
            <div className="modal-body">
              <form onSubmit={handleUpdateAdjustment} className="myadvances-style-69">
                <div className="form-group myadvances-style-70" >
                  <label className="myadvances-style-71">النوع</label>
                  <select
                    value={editAdjType}
                    onChange={(e) => setEditAdjType(e.target.value)}
                    className="myadvances-style-72"
                  >
                    <option value="Addition">إضافي (مكافأة)</option>
                    <option value="Deduction">خصم (جزاء)</option>
                  </select>
                </div>
                <div className="form-group myadvances-style-73" >
                  <label className="myadvances-style-74">المبلغ (ج.م)</label>
                  <input
                    type="number"
                    value={editAdjAmount}
                    onChange={(e) => setEditAdjAmount(e.target.value)}
                    className="myadvances-style-75"
                    required
                    min="1"
                  />
                </div>
                <div className="form-group myadvances-style-76" >
                  <label className="myadvances-style-77">السبب</label>
                  <input
                    type="text"
                    value={editAdjReason}
                    onChange={(e) => setEditAdjReason(e.target.value)}
                    className="myadvances-style-78"
                  />
                </div>
                <button type="submit" className="submit-advanced-btn myadvances-style-79" >
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
