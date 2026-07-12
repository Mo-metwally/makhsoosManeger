import React, { useState, useEffect } from 'react';
import { CreditCard, Wallet, Filter, TrendingUp, X, Edit2, User as UserIcon, Clock, Calendar, FileText, ShoppingBag, Users, ChevronDown, ChevronUp, Download } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import './Expenses.css'; // Reuse styles

const ExpensesAdd = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Protect route
  useEffect(() => {
    if (user && user.role !== 'SuperAdmin') {
      navigate('/expenses');
    }
  }, [user, navigate]);

  const todayMonthKey = new Date().toISOString().slice(0, 7);
  const [selectedMonth, setSelectedMonth] = useState(todayMonthKey);

  const formatTime12Hour = (timeStr) => {
    if (!timeStr) return '';
    const [hours, minutes] = timeStr.split(':');
    const h = parseInt(hours, 10);
    const ampm = h >= 12 ? 'م' : 'ص';
    const h12 = h % 12 || 12;
    return `${h12}:${minutes} ${ampm}`;
  };

  const [filterMonthInput, setFilterMonthInput] = useState(todayMonthKey);
  const currentMonthName = new Date(selectedMonth + '-01').toLocaleString('ar-EG', { month: 'long', year: 'numeric' });

  const [admins, setAdmins] = useState([]);
  const [shifts, setShifts] = useState([]);
  const [filterShiftInput, setFilterShiftInput] = useState('all');
  const [filterSearchInput, setFilterSearchInput] = useState('');

  const [expandedTables, setExpandedTables] = useState({});
  const [selectedShift, setSelectedShift] = useState('all');
  const [isShiftDropdownOpen, setIsShiftDropdownOpen] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');

  // Modal State
  const [showBudgetModal, setShowBudgetModal] = useState(false);
  const [budgetInput, setBudgetInput] = useState('');
  const [budgetAction, setBudgetAction] = useState('add');
  const [activeAdminId, setActiveAdminId] = useState(null);

  useEffect(() => {
    fetchAdminsData();
    fetchShiftsData();
    // eslint-disable-next-line
  }, [selectedMonth]);

  const fetchShiftsData = () => {
    api.get('/shifts')
      .then(res => setShifts(res.data))
      .catch(err => console.error('Error fetching shifts:', err));
  };

  const fetchAdminsData = () => {
    api.get(`/budgets/admins?month=${selectedMonth}`)
      .then(res => setAdmins(res.data))
      .catch(err => console.error('Error fetching admins:', err));
  };

  const [showUsesModal, setShowUsesModal] = useState(false);
  const [usesInput, setUsesInput] = useState('');
  const [activeUsesAdminId, setActiveUsesAdminId] = useState(null);

  const openUsesModal = (admin) => {
    setActiveUsesAdminId(admin.id);
    setUsesInput(admin.cardUses || '');
    setShowUsesModal(true);
  };

  const handleSaveUses = async () => {
    try {
      await api.put(`/admin/users/${activeUsesAdminId}`, { cardUses: usesInput });
      setAdmins(admins.map(a => a.id === activeUsesAdminId ? { ...a, cardUses: usesInput } : a));
      setShowUsesModal(false);
    } catch (err) {
      alert('خطأ في حفظ استخدامات البطاقة');
    }
  };

  const handleApplyFilter = () => {
    if (filterMonthInput) {
      setSelectedMonth(filterMonthInput);
    }
    setSelectedShift(filterShiftInput);
    setSearchQuery(filterSearchInput);
  };

  const getSelectedShiftName = () => {
    if (filterShiftInput === 'all') return 'الكل';
    const s = shifts.find(x => x.id === filterShiftInput);
    return s ? s.name : 'الكل';
  };

  const openBudgetModal = (adminId) => {
    setActiveAdminId(adminId);
    setBudgetInput('');
    setBudgetAction('add');
    setShowBudgetModal(true);
  };

  const handleSaveBudget = () => {
    const val = parseFloat(budgetInput) || 0;
    if (val > 0 && activeAdminId) {
      const targetAdmin = admins.find(a => a.id === activeAdminId);
      const currentBudget = targetAdmin.Budgets && targetAdmin.Budgets.length > 0 ? targetAdmin.Budgets[0] : null;

      const currentTotal = currentBudget ? currentBudget.totalBudget : 0;
      const currentOpening = currentBudget ? currentBudget.openingBalance : 0;

      const newTotal = (currentTotal > 0 && budgetAction === 'edit') ? val : currentTotal + val;
      const newOpening = currentOpening === 0 ? newTotal : currentOpening;

      api.post('/budgets', {
        userId: activeAdminId,
        monthKey: selectedMonth,
        totalBudget: newTotal,
        openingBalance: newOpening
      })
        .then(res => {
          fetchAdminsData(); // Refresh list to get updated budgets
        })
        .catch(err => console.error('Error saving budget:', err));
    }
    setBudgetInput('');
    setShowBudgetModal(false);
    setActiveAdminId(null);
  };

  const exportCardExpensesToExcel = async (admin, budgetData, expenses, userShift) => {
    try {
      const XLSX = await import('xlsx-js-style');

      const wb = XLSX.utils.book_new();
      wb.Workbook = { Views: [{ RTL: true }] };

      const cardName = admin.fullName || admin.username;
      const shiftName = userShift ? userShift.name : 'غير محدد';
      const totalBudget = budgetData ? budgetData.totalBudget : 0;
      const openingBalance = budgetData ? budgetData.openingBalance : 0;

      const wsData = [
        ['تقرير مصاريف البطاقة'],
        ['اسم المسؤول:', cardName],
        ['الوردية:', shiftName],
        ['شهر التقرير:', selectedMonth],
        ['مبلغ بداية المدة:', openingBalance],
        ['إجمالي ميزانية الشهر:', totalBudget],
        [],
        ['التاريخ', 'الوقت', 'النوع', 'التفاصيل / الاسم', 'المبلغ المخصوم']
      ];

      const expensesCount = expenses.length;
      if (expensesCount === 0) {
        wsData.push(['', '', '', 'لا يوجد مصاريف', 0]);
      } else {
        expenses.forEach(exp => {
          const typeStr = exp.type === 'advance' ? 'سلفة موظف' : 'مستلزمات';

          let detailsStr = '';
          if (exp.type === 'advance') {
            detailsStr = [exp.employeeName, exp.item, exp.notes].filter(Boolean).join(' - ');
          } else {
            detailsStr = [exp.item || 'مستلزمات', exp.notes].filter(Boolean).join(' - ');
          }

          wsData.push([
            exp.date || '',
            formatTime12Hour(exp.time) || '',
            typeStr,
            detailsStr,
            exp.amount || 0
          ]);
        });
      }

      const lastExpRow = expensesCount === 0 ? 9 : 8 + expensesCount;
      const sumRow = lastExpRow + 2;

      wsData.push([]);
      wsData.push(['', '', '', 'إجمالي المصاريف:', { f: `SUM(E9:E${lastExpRow})` }]);
      wsData.push(['', '', '', 'المتبقي من الرصيد:', { f: `B6-E${sumRow}` }]);

      const ws = XLSX.utils.aoa_to_sheet(wsData);

      // Basic styling
      const headerStyle = { font: { bold: true, color: { rgb: "FFFFFF" } }, fill: { fgColor: { rgb: "4F46E5" } }, alignment: { horizontal: "center" } };

      ['A8', 'B8', 'C8', 'D8', 'E8'].forEach(cell => {
        if (ws[cell]) ws[cell].s = headerStyle;
      });

      if (ws['A1']) ws['A1'].s = { font: { bold: true, sz: 14 } };

      ws['!cols'] = [{ wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 40 }, { wch: 15 }];

      XLSX.utils.book_append_sheet(wb, ws, "المصاريف");
      XLSX.writeFile(wb, `مصاريف_${cardName}_${shiftName}_${selectedMonth}.xlsx`);
    } catch (error) {
      console.error('Error exporting excel:', error);
      alert('حدث خطأ أثناء تصدير الملف.');
    }
  };

  return (
    <div className="expenses-page">
      <header className="page-header">
        <div className="header-title">
          <Wallet className="header-icon" size={32} />
          <h1>إدارة الميزانيات المالية</h1>
        </div>
        <p>متابعة وتخصيص الميزانيات الشهرية لجميع المشرفين والمديرين</p>
      </header>

      <div className="advanced-filter-card">
        <div className="filter-header-row">
          <div className="filter-title">
            <Filter size={22} className="theme-color" />
            <span>تصفية وتحديد الميزانيات</span>
          </div>
          <button className="advanced-apply-btn" onClick={handleApplyFilter}>
            تطبيق الفرز
          </button>
        </div>

        <div className="filter-controls-row">
          <div className="filter-control-group">
            <label>عرض بيانات شهر</label>
            <input
              type="month"
              value={filterMonthInput}
              onChange={(e) => setFilterMonthInput(e.target.value)}
              className="advanced-filter-input"
            />
          </div>

          <div className="filter-control-group">
            <label>تحديد الوردية</label>
            <div className="advanced-select-container" style={{ minWidth: '100%', width: '100%' }}>
              <div
                className="advanced-select-header"
                style={{ padding: '0.8rem 1.2rem', borderRadius: '10px', background: 'rgba(0,0,0,0.25)', border: '1px solid rgba(255, 255, 255, 0.1)' }}
                onClick={() => setIsShiftDropdownOpen(!isShiftDropdownOpen)}
              >
                <span>{getSelectedShiftName()}</span>
                <div className={`chevron-icon ${isShiftDropdownOpen ? 'open' : ''}`}>▼</div>
              </div>
              {isShiftDropdownOpen && (
                <>
                  <div className="dropdown-overlay" onClick={() => setIsShiftDropdownOpen(false)}></div>
                  <div className="advanced-select-dropdown fade-in">
                    <div
                      className={`advanced-select-option ${filterShiftInput === 'all' ? 'selected' : ''}`}
                      onClick={() => { setFilterShiftInput('all'); setIsShiftDropdownOpen(false); }}
                    >
                      الكل
                    </div>
                    {shifts.map(shift => (
                      <div
                        key={shift.id}
                        className={`advanced-select-option ${filterShiftInput === shift.id ? 'selected' : ''}`}
                        onClick={() => { setFilterShiftInput(shift.id); setIsShiftDropdownOpen(false); }}
                      >
                        {shift.name}
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="filter-control-group">
            <label>البحث بالاسم</label>
            <input
              type="text"
              placeholder="اكتب اسم المسؤول..."
              value={filterSearchInput}
              onChange={(e) => setFilterSearchInput(e.target.value)}
              className="advanced-filter-input"
            />
          </div>
        </div>
      </div>

      <div className="admin-expenses-list" style={{ display: 'flex', flexDirection: 'column', gap: '4rem' }}>
        {admins.filter(admin => {
          if (selectedShift !== 'all') {
            const userShift = admin.Shifts && admin.Shifts.length > 0 ? admin.Shifts[0] : null;
            if (!userShift || userShift.id !== selectedShift) return false;
          }
          if (searchQuery.trim() !== '') {
            const name = (admin.fullName || admin.username || '').toLowerCase();
            if (!name.includes(searchQuery.toLowerCase())) return false;
          }
          return true;
        }).map(admin => {
          const budgetData = admin.Budgets && admin.Budgets.length > 0 ? admin.Budgets[0] : null;
          const userShift = admin.Shifts && admin.Shifts.length > 0 ? admin.Shifts[0] : null;
          const expenses = budgetData && budgetData.Expenses ? budgetData.Expenses : [];
          const monthlyExpense = budgetData ? budgetData.totalBudget : 0;
          const openingBalance = budgetData ? budgetData.openingBalance : 0;
          const totalExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0);
          const remaining = monthlyExpense - totalExpenses;

          return (
            <section key={admin.id} className="expenses-hero-section">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '1rem' }}>
                <div style={{ flex: 1 }}>
                  {admin.cardUses && (
                    <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '0.5rem' }}>
                      <strong>استخدامات البطاقة:</strong> {admin.cardUses}
                    </div>
                  )}
                  <button
                    onClick={() => openUsesModal(admin)}
                    style={{
                      direction: 'rtl',
                      background: 'rgba(59, 130, 246, 0.15)',
                      color: 'var(--theme-color)',
                      border: '1px solid rgba(59, 130, 246, 0.3)',
                      padding: '0.4rem 0.8rem',
                      borderRadius: '8px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      cursor: 'pointer',
                      fontWeight: 'bold',
                      transition: 'all 0.3s ease',
                      fontSize: '0.9rem'
                    }}
                    onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(59, 130, 246, 0.25)' }}
                    onMouseOut={(e) => { e.currentTarget.style.background = 'rgba(59, 130, 246, 0.15)' }}
                    disabled
                  >
                    عدد استخدامات البطاقة
                    <strong> ({expenses.length})</strong>

                  </button>
                </div>
                <button
                  onClick={() => exportCardExpensesToExcel(admin, budgetData, expenses, userShift)}
                  style={{
                    background: 'rgba(16, 185, 129, 0.15)',
                    color: 'var(--green)',
                    border: '1px solid rgba(16, 185, 129, 0.3)',
                    padding: '0.5rem 1rem',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    cursor: 'pointer',
                    fontWeight: 'bold',
                    transition: 'all 0.3s ease'
                  }}
                  onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(16, 185, 129, 0.25)' }}
                  onMouseOut={(e) => { e.currentTarget.style.background = 'rgba(16, 185, 129, 0.15)' }}
                >
                  <Download size={18} />
                  تحميل تقرير المصاريف
                </button>
              </div>
              <div className="user-info-bar">
                <div className="info-item">
                  <UserIcon size={18} className="info-icon" />
                  <span className="info-label">صاحب الحساب:</span>
                  <span className="info-value">{admin.fullName || admin.username}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">الصلاحية:</span>
                  <span className="info-value text-muted">{admin.role === 'SuperAdmin' ? 'مدير' : 'مسؤول'}</span>
                </div>
                {userShift && (
                  <>
                    <div className="info-item">
                      <Calendar size={18} className="info-icon" />
                      <span className="info-label">الوردية:</span>
                      <span className="info-value">{userShift.name}</span>
                    </div>
                    <div className="info-item">
                      <Clock size={18} className="info-icon" />
                      <span className="info-label">ساعات العمل:</span>
                      <span className="info-value" dir="ltr">{userShift.endTime} - {userShift.startTime}</span>
                    </div>
                  </>
                )}
              </div>

              <div className="expenses-main-row">
                <div className="expenses-inputs-container" style={{ flexDirection: 'column', alignItems: 'stretch', justifyContent: 'center' }}>

                  <div className="opening-balance-badge">
                    <span className="badge-label">مبلغ بداية المدة ({currentMonthName}):</span>
                    <span className="badge-value">{openingBalance.toLocaleString()} <small>ج.م</small></span>
                  </div>

                  <div className="input-card">
                    <div className="input-card-header">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <CreditCard className="card-icon theme-color" size={24} />
                        <h3>إجمالي ميزانية الشهر</h3>
                      </div>
                      <button className="edit-btn" onClick={() => openBudgetModal(admin.id)} title="تعديل الميزانية">
                        <Edit2 size={16} />
                      </button>
                    </div>
                    <div className="input-wrapper">
                      <div className="glass-input readonly-display">
                        {monthlyExpense.toLocaleString()}
                      </div>
                      <span className="input-currency">ج.م</span>
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
                    <div className="visa-label">إجمالي المصاريف المتبقية</div>
                    <div className={`visa-balance ${remaining < 0 ? 'negative' : ''}`}>
                      <span className="amount">{remaining.toLocaleString()}</span>
                      <span className="currency">EGP</span>
                    </div>
                  </div>

                  <div className="visa-bottom">
                    <div className="visa-holder">
                      <span>CARD HOLDER</span>
                      <div className="name">{admin.fullName || admin.username}</div>
                    </div>
                    <div className="visa-expires">
                      <span>STATUS</span>
                      <div className="date">{remaining >= 0 ? 'ACTIVE' : 'WARNING'}</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Expenses Table for Admin */}
              {expenses.length > 0 && (
                <div className="expenses-table-section fade-in" style={{ marginTop: '1.5rem', background: 'transparent', padding: 0, border: 'none' }}>
                  <div
                    className="table-header-box"
                    style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', background: 'var(--glass-bg)', padding: '1rem', borderRadius: '12px', border: 'var(--glass-border)' }}
                    onClick={() => setExpandedTables(prev => ({ ...prev, [admin.id]: !prev[admin.id] }))}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <FileText size={20} className="theme-color" />
                      <h4 style={{ margin: 0, color: 'var(--text-primary)' }}>حركات المصروفات لـ {admin.fullName || admin.username} ({expenses.length})</h4>
                    </div>
                    {expandedTables[admin.id] ? <ChevronUp size={20} className="text-muted" /> : <ChevronDown size={20} className="text-muted" />}
                  </div>

                  {expandedTables[admin.id] && (
                    <div className="advanced-table-wrapper fade-in" style={{ background: 'var(--glass-bg)', border: 'var(--glass-border)', borderRadius: '16px', padding: '1rem' }}>
                      <table className="expenses-advanced-table">
                        <thead>
                          <tr>
                            <th>التاريخ واليوم</th>
                            <th>الوقت</th>
                            <th>النوع</th>
                            <th>التفاصيل / الاسم</th>
                            <th>المبلغ المخصوم</th>
                          </tr>
                        </thead>
                        <tbody>
                          {expenses.map(exp => (
                            <tr key={exp.id}>
                              <td>
                                <div className="date-cell">
                                  <Calendar size={14} />
                                  <span>{new Date(exp.date).toLocaleDateString('ar-EG', { weekday: 'long', year: 'numeric', month: 'short', day: 'numeric' })}</span>
                                </div>
                              </td>
                              <td>
                                <div className="time-cell">
                                  <Clock size={14} />
                                  <span dir="ltr">{formatTime12Hour(exp.time)}</span>
                                </div>
                              </td>
                              <td>
                                <div className={`type-badge ${exp.type === 'advance' ? 'advance-badge' : 'supplies-badge'}`}>
                                  {exp.type === 'advance' ? <Users size={12} /> : <ShoppingBag size={12} />}
                                  <span>{exp.type === 'advance' ? 'سلفة موظف' : 'مستلزمات'}</span>
                                </div>
                              </td>
                              <td>
                                <span className="details-text">
                                  {exp.type === 'advance' ? (
                                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                                      <span>{exp.employeeName}</span>
                                      {exp.item && <small style={{ color: 'var(--text-secondary)' }}>{exp.item}</small>}
                                      {exp.notes && <small style={{ color: 'var(--text-secondary)' }}>{exp.notes}</small>}
                                    </div>
                                  ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                                      <span>{exp.item || 'مستلزمات'}</span>
                                      {exp.notes && <small style={{ color: 'var(--text-secondary)' }}>{exp.notes}</small>}
                                    </div>
                                  )}
                                </span>
                              </td>
                              <td>
                                <span className="amount-cell negative-val" style={{ fontSize: '0.95rem' }}>
                                  -{exp.amount.toLocaleString()} ج.م
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </section>
          );
        })}
      </div>

      {showBudgetModal && (
        <div className="modal-overlay fade-in">
          <div className="budget-modal">
            <div className="modal-header">
              <h3>تعديل ميزانية المستخدم</h3>
              <button className="close-btn" onClick={() => setShowBudgetModal(false)}>
                <X size={20} />
              </button>
            </div>
            <div className="modal-body">
              <div className="modal-tabs">
                <button
                  className={`tab-btn ${budgetAction === 'add' ? 'active' : ''}`}
                  onClick={() => setBudgetAction('add')}
                >
                  إضافة مبلغ للميزانية
                </button>
                <button
                  className={`tab-btn ${budgetAction === 'edit' ? 'active' : ''}`}
                  onClick={() => setBudgetAction('edit')}
                >
                  تعديل المبلغ بالكامل
                </button>
              </div>

              <div className="input-group">
                <label>
                  {budgetAction === 'add' ? 'القيمة المراد إضافتها للميزانية:' : 'الميزانية الكلية الجديدة:'}
                </label>
                <input
                  type="number"
                  value={budgetInput}
                  onChange={e => setBudgetInput(e.target.value)}
                  className="premium-input modal-input"
                  placeholder="0"
                  autoFocus
                />
              </div>
              <button
                className="save-btn"
                onClick={handleSaveBudget}
                disabled={!budgetInput || budgetInput <= 0}
              >
                تأكيد العملية
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Uses Modal */}
      {showUsesModal && (
        <div className="budget-modal-overlay fade-in" onClick={() => setShowUsesModal(false)}>
          <div className="budget-modal-content" onClick={e => e.stopPropagation()}>
            <div className="budget-modal-header">
              <h3>تحديد إستخدامات البطاقة</h3>
              <button className="close-btn" onClick={() => setShowUsesModal(false)}><X size={24} /></button>
            </div>
            <div className="budget-modal-body">
              <label>الأغراض المسموح الصرف عليها (مثال: بنزين، بوفيه، إلخ):</label>
              <textarea
                value={usesInput}
                onChange={(e) => setUsesInput(e.target.value)}
                placeholder="اكتب استخدامات البطاقة هنا..."
                style={{ width: '100%', minHeight: '100px', padding: '1rem', borderRadius: '12px', background: 'var(--glass-bg)', color: 'var(--text-primary)', border: '1px solid var(--border-color)', outline: 'none', resize: 'vertical' }}
              />
            </div>
            <div className="budget-modal-footer">
              <button className="btn-cancel" onClick={() => setShowUsesModal(false)}>إلغاء</button>
              <button className="btn-confirm" onClick={handleSaveUses}>حفظ</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExpensesAdd;
