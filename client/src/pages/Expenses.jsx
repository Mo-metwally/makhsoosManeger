import React, { useState, useEffect, useRef } from 'react';
import { CreditCard, Wallet, Filter, TrendingUp, X, Edit2, User, Clock, Calendar, Search, Users, ShoppingBag, FileText, ChevronDown, CheckCircle, DollarSign, PenTool, Trash2, Download } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../contexts/ToastContext';
import api from '../services/api';
import "./Expenses.scss";

const Expenses = () => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const userName = user ? (user.fullName || user.username) : 'غير معروف';

  const formatTime12Hour = (timeStr) => {
    if (!timeStr) return '';
    const [hours, minutes] = timeStr.split(':');
    const h = parseInt(hours, 10);
    const ampm = h >= 12 ? 'م' : 'ص';
    const h12 = h % 12 || 12;
    return `${h12}:${minutes} ${ampm}`;
  };

  const todayMonthKey = new Date().toISOString().slice(0, 7);
  const [selectedMonth, setSelectedMonth] = useState(todayMonthKey);
  const [filterMonthInput, setFilterMonthInput] = useState(todayMonthKey);
  const [currentPage, setCurrentPage] = useState(1);

  const isFirstOfMonth = (selectedMonth === todayMonthKey) && (new Date().getDate() === 1);
  const currentMonthName = new Date(selectedMonth + '-01').toLocaleString('ar-EG', { month: 'long', year: 'numeric' });

  const [activeTab, setActiveTab] = useState('budget'); // 'budget' or 'advances'
  const [advanceRequests, setAdvanceRequests] = useState([]);
  const [shiftInfo, setShiftInfo] = useState(null);

  useEffect(() => {
    api.get('/attendance/status')
      .then(res => {
        if (res.data && res.data.shift) {
          setShiftInfo(res.data.shift);
        }
      })
      .catch(err => console.error(err));
  }, []);

  const [monthlyExpense, setMonthlyExpense] = useState(0);
  const [openingBalance, setOpeningBalance] = useState(0);

  // Expense States
  const [expenses, setExpenses] = useState([]);
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [expenseType, setExpenseType] = useState('supplies'); // 'supplies' or 'advance'
  const [expenseAmount, setExpenseAmount] = useState('');
  const [expenseItem, setExpenseItem] = useState('');
  const [expenseEmployee, setExpenseEmployee] = useState('');
  const [expenseEmployeeId, setExpenseEmployeeId] = useState('');
  const [expenseNotes, setExpenseNotes] = useState('');
  const [editingExpenseId, setEditingExpenseId] = useState(null);

  const [allUsers, setAllUsers] = useState([]);
  const [employeeSearchQuery, setEmployeeSearchQuery] = useState('');
  const [isEmployeeDropdownOpen, setIsEmployeeDropdownOpen] = useState(false);
  const employeeDropdownRef = useRef(null);

  const [budgetIsActive, setBudgetIsActive] = useState(true);
  const [hasBudgetCard, setHasBudgetCard] = useState(true);

  // Load data for the selected month
  useEffect(() => {
    if (user && user.id) {
      api.get(`/budget/me?month=${selectedMonth}`)
        .then(res => {
          if (res.data) {
            setMonthlyExpense(res.data.totalBudget);
            setOpeningBalance(res.data.openingBalance);
            setBudgetIsActive(res.data.isActive !== false);
            setHasBudgetCard(!!res.data.id);
          }
        })
        .catch(err => console.error('Error fetching budget:', err));

      api.get(`/budget/expenses?month=${selectedMonth}`)
        .then(res => {
          if (Array.isArray(res.data)) setExpenses(res.data);
        })
        .catch(err => console.error('Error fetching expenses:', err));

      // Fetch users for employee advance selector
      api.get('/admin/users')
        .then(res => setAllUsers(res.data))
        .catch(err => console.error('Error fetching users:', err));

      fetchAdvanceRequests();
    }
  }, [selectedMonth, user, activeTab]);

  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, selectedMonth]);

  useEffect(() => {
    fetchData();
  }, [selectedMonth, activeTab]);

  const fetchAdvanceRequests = () => {
    if (user && (user.role === 'Admin' || user.role === 'SuperAdmin')) {
      api.get(`/advances/all?monthKey=${selectedMonth}`)
        .then(res => setAdvanceRequests(res.data))
        .catch(err => console.error('Error fetching advance requests:', err));
    }
  };

  const handleUpdateAdvanceStatus = (id, status) => {
    api.put(`/advances/${id}/status`, { status })
      .then(res => {
        // Refresh requests
        fetchAdvanceRequests();
        // If approved, refresh budget and expenses
        if (status === 'approved') {
          api.get(`/budget/expenses?month=${selectedMonth}`)
            .then(res2 => { if (Array.isArray(res2.data)) setExpenses(res2.data); });
        }
      })
      .catch(err => {
        showToast(err.response?.data?.error || 'حدث خطأ أثناء تحديث حالة الطلب', 'error');
        console.error('Error updating status:', err);
      });
  };

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (employeeDropdownRef.current && !employeeDropdownRef.current.contains(event.target)) {
        setIsEmployeeDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const [showBudgetModal, setShowBudgetModal] = useState(false);
  const [budgetInput, setBudgetInput] = useState('');
  const [budgetAction, setBudgetAction] = useState('add');

  const handleSaveBudget = () => {
    const val = parseFloat(budgetInput) || 0;
    if (val > 0) {
      const newTotal = (monthlyExpense > 0 && budgetAction === 'edit') ? val : monthlyExpense + val;
      const newOpeningBalance = openingBalance === 0 ? newTotal : openingBalance;

      api.post('/budget', {
        userId: user.id,
        monthKey: selectedMonth,
        totalBudget: newTotal,
        openingBalance: newOpeningBalance
      })
        .then(res => {
          setMonthlyExpense(res.data.totalBudget);
          setOpeningBalance(res.data.openingBalance);
        })
        .catch(err => console.error('Error saving budget:', err));
    }
    setBudgetInput('');
    setShowBudgetModal(false);
  };

  const handleSaveExpense = () => {
    const val = parseFloat(expenseAmount) || 0;
    if (val <= 0) return;

    const payload = {
      amount: val,
      type: expenseType,
      employeeName: expenseType === 'advance' ? expenseEmployee : '',
      employeeId: expenseType === 'advance' ? expenseEmployeeId : '',
      item: expenseItem,
      notes: expenseNotes,
      monthKey: selectedMonth
    };

    if (editingExpenseId) {
      api.put(`/budget/expenses/${editingExpenseId}`, payload)
        .then(res => {
          setExpenses(expenses.map(exp => exp.id === editingExpenseId ? res.data : exp));
          closeExpenseModal();
        })
        .catch(err => console.error('Error updating expense:', err));
    } else {
      api.post('/budget/expenses', payload)
        .then(res => {
          setExpenses([res.data, ...expenses]);
          closeExpenseModal();
        })
        .catch(err => console.error('Error saving expense:', err));
    }
  };

  const closeExpenseModal = () => {
    setShowExpenseModal(false);
    setExpenseAmount('');
    setExpenseItem('');
    setExpenseEmployee('');
    setExpenseEmployeeId('');
    setExpenseNotes('');
    setEditingExpenseId(null);
  };

  const handleEditExpense = (expense) => {
    setExpenseAmount(expense.amount.toString());
    setExpenseType(expense.type);
    if (expense.type === 'advance') {
      setExpenseEmployee(expense.employeeName || '');
      // Try to find employeeId from allUsers by matching name
      const foundUser = allUsers.find(u => u.fullName === expense.employeeName);
      setExpenseEmployeeId(foundUser ? foundUser.id : '');
    } else {
      setExpenseItem(expense.item || '');
    }
    setExpenseNotes(expense.notes || '');
    setEditingExpenseId(expense.id);
    setShowExpenseModal(true);
  };

  const handleDeleteExpense = (id) => {
    if (window.confirm('هل أنت متأكد من حذف هذه العملية واسترداد قيمتها للميزانية؟')) {
      api.delete(`/budget/expenses/${id}`)
        .then(() => {
          setExpenses(expenses.filter(exp => exp.id !== id));
        })
        .catch(err => {
          showToast('حدث خطأ أثناء الحذف', 'error');
          console.error(err);
        });
    }
  };

  const handleApplyFilter = () => {
    if (filterMonthInput) {
      setSelectedMonth(filterMonthInput);
    }
  };

  const totalMonthly = monthlyExpense;

  const safeExpenses = Array.isArray(expenses) ? expenses : [];
  const totalExpenses = safeExpenses.reduce((sum, exp) => sum + (exp.amount || 0), 0);
  const remaining = totalMonthly - totalExpenses;

  const getAdvanceStatusBadge = (status) => {
    switch (status) {
      case 'pending': return <span className="type-badge supplies-badge"><Clock size={14} /> قيد المراجعة</span>;
      case 'approved': return <span className="type-badge advance-badge"><CheckCircle size={14} /> مقبول (سلفة)</span>;
      case 'rejected': return <span className="type-badge expenses-style-1" ><X size={14} /> مرفوض</span>;
      case 'settled': return <span className="type-badge advance-badge expenses-style-2" ><CheckCircle size={14} /> مسدد</span>;
      default: return null;
    }
  };

  const exportMyExpensesToExcel = async () => {
    try {
      const XLSX = await import('xlsx-js-style');

      const wb = XLSX.utils.book_new();
      wb.Workbook = { Views: [{ RTL: true }] };

      const cardName = userName;
      const sName = shiftInfo ? shiftInfo.name : 'غير محدد';
      const tBudget = monthlyExpense;
      const opBalance = openingBalance;

      const wsData = [
        ['تقرير مصاريف البطاقة'],
        ['اسم المسؤول:', cardName],
        ['الوردية:', sName],
        ['شهر التقرير:', selectedMonth],
        ['مبلغ بداية المدة:', opBalance],
        ['إجمالي ميزانية الشهر:', tBudget],
        [],
        ['التاريخ', 'الوقت', 'النوع', 'التفاصيل / الاسم', 'المبلغ المخصوم']
      ];

      const expensesCount = safeExpenses.length;
      if (expensesCount === 0) {
        wsData.push(['', '', '', 'لا يوجد مصاريف', 0]);
      } else {
        safeExpenses.forEach(exp => {
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
      XLSX.writeFile(wb, `مصاريف_${cardName}_${sName}_${selectedMonth}.xlsx`);
    } catch (error) {
      console.error('Error exporting excel:', error);
      showToast('حدث خطأ أثناء تصدير الملف.', 'error');
    }
  };

  return (
    <div className="expenses-page">
      <header className="page-header">
        <div className="header-title">
          <Wallet className="header-icon" size={32} />
          <h1>إدارة المصروفات</h1>
        </div>
        <p>متابعة وتحليل المصروفات الشهرية والإضافية بشكل متقدم</p>
      </header>

      {/* Header Tabs */}
      <div className="admin-tabs-container">
        <button
          className={`admin-tab-btn ${activeTab === 'budget' ? 'active' : ''}`}
          onClick={() => setActiveTab('budget')}
        >
          <Wallet size={20} />
          الميزانية العامة
        </button>
        <button
          className={`admin-tab-btn ${activeTab === 'advances' ? 'active' : ''}`}
          onClick={() => setActiveTab('advances')}
        >
          <Users size={20} />
          طلبات السلف ({advanceRequests.filter(r => r.status === 'pending').length})
        </button>
        <button
          className={`admin-tab-btn ${activeTab === 'advances_log' ? 'active' : ''}`}
          onClick={() => setActiveTab('advances_log')}
        >
          <FileText size={20} />
          سجل السلف ({safeExpenses.filter(e => e.type === 'advance').length})
        </button>
        <button
          className={`admin-tab-btn ${activeTab === 'supplies_log' ? 'active' : ''}`}
          onClick={() => setActiveTab('supplies_log')}
        >
          <ShoppingBag size={20} />
          سجل المستلزمات ({safeExpenses.filter(e => e.type === 'supplies').length})
        </button>
      </div>

      <div className="expenses-filter-section">
        <Filter size={20} className="theme-color" />
        <label>عرض بيانات شهر:</label>
        <input
          type="month"
          value={filterMonthInput}
          onChange={(e) => setFilterMonthInput(e.target.value)}
          className="month-filter-input"
        />
        <button className="apply-filter-btn" onClick={handleApplyFilter}>
          تطبيق
        </button>
      </div>

      {(activeTab === 'budget' || activeTab === 'advances_log' || activeTab === 'supplies_log') ? (
        <>
          {activeTab === 'budget' && (
            hasBudgetCard ? (
              <section className="expenses-hero-section expenses-style-3" >

              <div style={{
                position: 'absolute',
                top: '-15px',
                left: '20px',
                padding: '0.5rem 1.2rem',
                borderRadius: '25px',
                fontWeight: 'bold',
                fontSize: '0.9rem',
                color: '#fff',
                background: budgetIsActive ? '#22c55e90' : '#ef4444',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                boxShadow: '0 4px 15px rgba(0,0,0,0.3)',
                zIndex: 10,
                border: '2px solid var(--bg-secondary)'
              }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#fff', animation: budgetIsActive ? 'pulse 2s infinite' : 'none' }}></div>
                STATUS: {budgetIsActive ? 'ACTIVE' : 'INACTIVE'}
              </div>

              {/* User Info Bar */}
              <div className="expenses-style-4">
                <div className="expenses-style-5">
                  {user.cardUses && (
                    <div className="expenses-style-6">
                      <strong>استخدامات البطاقة:</strong> {user.cardUses}
                    </div>
                  )}
                </div>
                <div className="expenses-style-7">
                  <div className="expenses-style-8">
                    <button
                      onClick={() => openUsesModal(admin)}
                      className="expenses-style-9"
                      onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(59, 130, 246, 0.25)' }}
                      onMouseOut={(e) => { e.currentTarget.style.background = 'rgba(59, 130, 246, 0.15)' }}
                      disabled
                    >
                      عدد استخدامات البطاقة
                      <strong> ({safeExpenses.length})</strong>

                    </button>
                  </div>

                  <button
                    onClick={exportMyExpensesToExcel}
                    className="expenses-style-10"
                    onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(16, 185, 129, 0.25)' }}
                    onMouseOut={(e) => { e.currentTarget.style.background = 'rgba(16, 185, 129, 0.15)' }}
                  >
                    <Download size={18} />
                    تحميل تقرير المصاريف
                  </button>

                </div>
              </div>
              <div className="user-info-bar">
                <div className="info-item">
                  <User size={18} className="info-icon" />
                  <span className="info-label">صاحب الحساب:</span>
                  <span className="info-value">{userName}</span>
                </div>
                {shiftInfo ? (
                  <>
                    <div className="info-item">
                      <Calendar size={18} className="info-icon" />
                      <span className="info-label">الوردية:</span>
                      <span className="info-value">{shiftInfo.name}</span>
                    </div>
                    <div className="info-item">
                      <Clock size={18} className="info-icon" />
                      <span className="info-label">ساعات العمل:</span>
                      <span className="info-value" dir="ltr">{shiftInfo.endTime} - {shiftInfo.startTime}</span>
                    </div>
                  </>
                ) : (
                  <div className="info-item">
                    <span className="info-label">الوردية:</span>
                    <span className="info-value text-muted">غير محددة</span>
                  </div>
                )}
              </div>

              <div className="expenses-main-row">
                <div className="expenses-inputs-container expenses-style-11" >

                  <div className="opening-balance-badge">
                    <span className="badge-label">مبلغ بداية المدة ({currentMonthName}):</span>
                    <span className="badge-value">{openingBalance.toLocaleString()} <small>ج.م</small></span>
                  </div>

                  <div className="input-card">
                    <div className="input-card-header">
                      <div className="expenses-style-12">
                        <CreditCard className="card-icon theme-color" size={24} />
                        <h3>إجمالي ميزانية الشهر</h3>
                      </div>
                      {user.role === 'SuperAdmin' && (
                        <button className="edit-btn" onClick={() => setShowBudgetModal(true)} title="تعديل الميزانية">
                          <Edit2 size={16} />
                        </button>
                      )}
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
                      <div className="name">{userName}</div>
                    </div>
                    <div className="visa-expires">
                      <span>STATUS</span>
                      <div className="date" style={{ color: budgetIsActive ? '#10b981' : '#ef4444' }}>
                        {budgetIsActive ? 'ACTIVE' : 'INACTIVE'}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="use-card-actions">
                {budgetIsActive && (
                  <button className="use-card-btn glow-hover" onClick={() => setShowExpenseModal(true)}>
                    <CreditCard size={20} />
                    <span>إستخدام البطاقة</span>
                  </button>
                )}
                <div className="card-usage-count">
                  تم استخدام البطاقة <span className="highlight-count">{safeExpenses.length}</span> مرات هذا الشهر
                </div>
              </div>

              </section>
            ) : (
              <div className="expenses-style-13">
                <CreditCard size={48} className="expenses-style-14" />
                <h3 className="expenses-style-15">لا يوجد بطاقة مصروفات للحساب في هذا الشهر</h3>
                <p className="expenses-style-16">يرجى التواصل مع الإدارة لإنشاء بطاقة مصروفات لك.</p>
              </div>
            )
          )}

          {(() => {
            const displayedExpenses = safeExpenses.filter(exp => {
              if (activeTab === 'advances_log') return exp.type === 'advance';
              if (activeTab === 'supplies_log') return exp.type === 'supplies';
              return true; 
            });

            if (displayedExpenses.length === 0) return (
              <div className="text-muted fade-in expenses-style-17" >
                لا توجد حركات مسجلة في هذا السجل.
              </div>
            );

            const EXP_ITEMS_PER_PAGE = 10;
            const totalExpPages = Math.ceil(displayedExpenses.length / EXP_ITEMS_PER_PAGE);
            const startIdx = (currentPage - 1) * EXP_ITEMS_PER_PAGE;
            const currentExpenses = displayedExpenses.slice(startIdx, startIdx + EXP_ITEMS_PER_PAGE);

            return (
              <section className="expenses-table-section fade-in">
                <div className="table-header-box">
                  <FileText size={24} className="theme-color" />
                  <h2>
                    {activeTab === 'advances_log' ? 'سجل السلف' :
                      activeTab === 'supplies_log' ? 'سجل المستلزمات' :
                        'حركات البطاقة (المصروفات)'}
                  </h2>
                </div>
                <div className="advanced-table-wrapper">
                  <table className="expenses-advanced-table">
                    <thead>
                      <tr>
                        <th>التاريخ واليوم</th>
                        <th>الوقت</th>
                        <th>النوع</th>
                        <th>التفاصيل / الاسم</th>
                        <th>المبلغ المخصوم</th>
                        {activeTab === 'budget' && <th>الإجراءات</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {currentExpenses.map(exp => (
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
                                <div className="expenses-style-18">
                                  <span>{exp.employeeName}</span>
                                  {exp.item && <small className="expenses-style-19">{exp.item}</small>}
                                  {exp.notes && <small className="expenses-style-20">{exp.notes}</small>}
                                </div>
                              ) : (
                                <div className="expenses-style-21">
                                  <span>{exp.item || 'مستلزمات'}</span>
                                  {exp.notes && <small className="expenses-style-22">{exp.notes}</small>}
                                </div>
                              )}
                            </span>
                          </td>
                          <td>
                            <span className="amount-cell negative-val expenses-style-23">
                              -{exp.amount.toLocaleString()} ج.م
                            </span>
                          </td>
                          {activeTab === 'budget' && (
                            <td>
                              <div className="action-buttons">
                                <button
                                  className="btn-icon text-theme expenses-style-24"
                                  onClick={() => handleEditExpense(exp)}
                                >
                                  <Edit2 size={16} />
                                </button>
                                <button
                                  className="edit-btn expenses-style-25"
                                  
                                  onClick={() => handleDeleteExpense(exp.id)}
                                  title="حذف"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            </td>)}
                        </tr>
                      ))}
                      {totalExpPages > 1 && (
                        <tr>
                          <td colSpan={activeTab === 'budget' ? "6" : "5"}>
                            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '15px', padding: '10px' }}>
                              <button 
                                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                disabled={currentPage === 1}
                                style={{ padding: '6px 16px', borderRadius: '6px', background: currentPage === 1 ? 'var(--theme-border)' : 'var(--theme-color)', color: currentPage === 1 ? 'var(--text-secondary)' : '#000', border: 'none', cursor: currentPage === 1 ? 'not-allowed' : 'pointer', fontWeight: 'bold' }}
                              >
                                السابق
                              </button>
                              <span style={{ color: 'var(--text-color)', fontWeight: 'bold' }}>
                                صفحة {currentPage} من {totalExpPages}
                              </span>
                              <button 
                                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalExpPages))}
                                disabled={currentPage === totalExpPages}
                                style={{ padding: '6px 16px', borderRadius: '6px', background: currentPage === totalExpPages ? 'var(--theme-border)' : 'var(--theme-color)', color: currentPage === totalExpPages ? 'var(--text-secondary)' : '#000', border: 'none', cursor: currentPage === totalExpPages ? 'not-allowed' : 'pointer', fontWeight: 'bold' }}
                              >
                                التالي
                              </button>
                            </div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </section>
            );
          })()}
        </>
      ) : activeTab === 'advances' ? (
        /* Advances Tab */
        <section className="expenses-table-section fade-in">
          <div className="table-header-box">
            <Users size={24} className="theme-color" />
            <h2>إدارة طلبات السلف للموظفين</h2>
          </div>
          {advanceRequests.length === 0 ? (
            <div className="text-muted expenses-style-26" >لا توجد طلبات سلف مسجلة هذا الشهر.</div>
          ) : (
            <div className="advanced-table-wrapper">
              <table className="expenses-advanced-table">
                <thead>
                  <tr>
                    <th>الموظف</th>
                    <th>التاريخ</th>
                    <th>القيمة</th>
                    <th>السبب</th>
                    <th>الحالة</th>
                    <th>الإجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {advanceRequests.map(req => (
                    <tr key={req.id}>
                      <td>
                        <div className="expenses-style-27">
                          {req.Requester?.fullName || req.Requester?.username}
                        </div>
                      </td>
                      <td>
                        <div className="date-cell">
                          <Calendar size={14} />
                          {new Date(req.date).toLocaleDateString('ar-EG')}
                        </div>
                      </td>
                      <td>
                        <span className="amount-cell expenses-style-28" >
                          {req.amount.toLocaleString()} ج.م
                        </span>
                      </td>
                      <td>
                        <span className="details-text text-muted">{req.reason || '---'}</span>
                      </td>
                      <td>
                        {getAdvanceStatusBadge(req.status)}
                      </td>
                      <td>
                        {req.status === 'pending' && (
                          <div className="expenses-style-29">
                            <button
                              className="apply-filter-btn expenses-style-30"
                              
                              onClick={() => handleUpdateAdvanceStatus(req.id, 'approved')}
                            >
                              موافقة
                            </button>
                            <button
                              className="apply-filter-btn expenses-style-31"
                              
                              onClick={() => handleUpdateAdvanceStatus(req.id, 'rejected')}
                            >
                              رفض
                            </button>
                          </div>
                        )}
                        {req.status === 'approved' && (
                          <button
                            className="apply-filter-btn expenses-style-32"
                            
                            onClick={() => handleUpdateAdvanceStatus(req.id, 'settled')}
                          >
                            <CheckCircle size={14} className="expenses-style-33" />
                            تم السداد والتسوية
                          </button>
                        )}
                        {(req.status === 'settled' || req.status === 'rejected') && (
                          <span className="text-muted expenses-style-34" >لا يوجد إجراء</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      ) : null}

      {/* Budget Edit/Add Modal */}
      {showBudgetModal && (
        <div className="modal-overlay fade-in">
          <div className="budget-modal">
            <div className="modal-header">
              <h3>{monthlyExpense === 0 ? 'إعداد ميزانية الشهر الجديد' : 'تعديل الميزانية'}</h3>
              {(!isFirstOfMonth || monthlyExpense > 0) && (
                <button className="close-btn" onClick={() => setShowBudgetModal(false)}>
                  <X size={20} />
                </button>
              )}
            </div>
            <div className="modal-body">
              {monthlyExpense === 0 && isFirstOfMonth && (
                <div className="modal-alert">
                  يرجى إدخال ميزانية هذا الشهر للتمكن من استخدام الصفحة.
                </div>
              )}

              {monthlyExpense > 0 && (
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
              )}

              <div className="input-group">
                <label>
                  {monthlyExpense === 0
                    ? 'الميزانية الكلية للشهر:'
                    : (budgetAction === 'add' ? 'القيمة المراد إضافتها للميزانية:' : 'الميزانية الكلية الجديدة:')}
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
                {monthlyExpense === 0 ? 'حفظ الميزانية' : 'تأكيد العملية'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Expense Modal */}
      {showExpenseModal && (
        <div className="modal-overlay fade-in">
          <div className="expense-modal">
            <div className="modal-header">
              <div className="expenses-style-35">
                <CreditCard size={24} className="theme-color" />
                <h3>تسجيل استخدام البطاقة</h3>
              </div>
              <button className="close-btn" onClick={closeExpenseModal}>
                <X size={20} />
              </button>
            </div>

            <div className="modal-body">
              <div className="expense-type-cards">
                <div
                  className={`type-card ${expenseType === 'advance' ? 'active' : ''}`}
                  onClick={() => setExpenseType('advance')}
                >
                  <Users size={24} />
                  <span>سلفة موظف</span>
                </div>
                <div
                  className={`type-card ${expenseType === 'supplies' ? 'active' : ''}`}
                  onClick={() => setExpenseType('supplies')}
                >
                  <ShoppingBag size={24} />
                  <span>مستلزمات</span>
                </div>
              </div>

              <div className="input-group">
                <label>القيمة (ج.م):</label>
                <div className="input-with-icon">
                  <DollarSign size={18} className="input-icon" />
                  <input
                    type="number"
                    placeholder="أدخل المبلغ المخصوم..."
                    value={expenseAmount}
                    onChange={(e) => setExpenseAmount(e.target.value)}
                    className="glass-input"
                  />
                </div>
              </div>

              {expenseType === 'advance' && (
                <div className="input-group slide-down">
                  <label>اسم الموظف:</label>
                  <div className="advanced-select-container" ref={employeeDropdownRef}>
                    <div
                      className={`advanced-select-trigger ${isEmployeeDropdownOpen ? 'open' : ''}`}
                      onClick={() => setIsEmployeeDropdownOpen(!isEmployeeDropdownOpen)}
                    >
                      <User size={18} className="theme-color" />
                      <span className="selected-value">
                        {expenseEmployee || 'اختر الموظف...'}
                      </span>
                      <ChevronDown size={18} className="dropdown-icon" />
                    </div>

                    {isEmployeeDropdownOpen && (
                      <div className="advanced-select-dropdown slide-down">
                        <div className="dropdown-search">
                          <Search size={16} />
                          <input
                            type="text"
                            placeholder="ابحث عن موظف..."
                            value={employeeSearchQuery}
                            onChange={(e) => setEmployeeSearchQuery(e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                            autoFocus
                          />
                        </div>
                        <div className="dropdown-options">
                          {allUsers
                            .filter(u => (u.fullName || '').toLowerCase().includes(employeeSearchQuery.toLowerCase()))
                            .map(u => (
                              <div
                                key={u.id}
                                className={`dropdown-option ${expenseEmployee === u.fullName ? 'selected' : ''}`}
                                onClick={() => {
                                  setExpenseEmployee(u.fullName);
                                  setExpenseEmployeeId(u.id);
                                  setIsEmployeeDropdownOpen(false);
                                  setEmployeeSearchQuery('');
                                }}
                              >
                                {u.fullName}
                                {expenseEmployee === u.fullName && <CheckCircle size={16} className="theme-color" />}
                              </div>
                            ))}
                          {allUsers.filter(u => (u.fullName || '').toLowerCase().includes(employeeSearchQuery.toLowerCase())).length === 0 && (
                            <div className="dropdown-no-results">لا توجد نتائج</div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {expenseType === 'advance' && (
                <div className="input-group slide-down">
                  <label>ملاحظة (اختياري):</label>
                  <div className="input-with-icon">
                    <FileText size={18} className="input-icon" />
                    <input
                      type="text"
                      placeholder="سبب السلفة..."
                      value={expenseNotes}
                      onChange={(e) => setExpenseNotes(e.target.value)}
                      className="glass-input"
                    />
                  </div>
                </div>
              )}

              {expenseType === 'supplies' && (
                <>
                  <div className="input-group slide-down">
                    <label>السلعة / المستلزمات:</label>
                    <div className="input-with-icon">
                      <ShoppingBag size={18} className="input-icon" />
                      <input
                        type="text"
                        placeholder="مثل: ورق طباعة، أدوات نظافة..."
                        value={expenseItem}
                        onChange={(e) => setExpenseItem(e.target.value)}
                        className="glass-input"
                      />
                    </div>
                  </div>
                  <div className="input-group slide-down">
                    <label>ملاحظات (اختياري):</label>
                    <div className="input-with-icon">
                      <FileText size={18} className="input-icon" />
                      <input
                        type="text"
                        placeholder="تفاصيل إضافية..."
                        value={expenseNotes}
                        onChange={(e) => setExpenseNotes(e.target.value)}
                        className="glass-input"
                      />
                    </div>
                  </div>
                </>
              )}

              <button
                className="expense-submit-btn"
                onClick={handleSaveExpense}
                disabled={!expenseAmount || (expenseType === 'advance' ? !expenseEmployee : !expenseItem)}
              >
                <CheckCircle size={18} /> حفظ الخصم
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default Expenses;
