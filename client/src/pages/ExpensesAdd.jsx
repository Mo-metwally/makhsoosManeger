import React, { useState, useEffect } from 'react';
import { CreditCard, Wallet, Filter, TrendingUp, X, Edit2, User as UserIcon, Clock, Calendar, FileText, ShoppingBag, Users, ChevronDown, ChevronUp, Download, Trash2, Power } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useToast } from '../contexts/ToastContext';
import "./Expenses.scss"; // Reuse styles

const ExpensesAdd = () => {
  const { user } = useAuth();
  const { showToast } = useToast();
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

  const [filterStatusInput, setFilterStatusInput] = useState('active');
  const [selectedStatus, setSelectedStatus] = useState('active');
  const [isStatusDropdownOpen, setIsStatusDropdownOpen] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');

  // Modal State
  const [showBudgetModal, setShowBudgetModal] = useState(false);
  const [showDeleteCardModal, setShowDeleteCardModal] = useState(false);
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

  const [showCreateCardModal, setShowCreateCardModal] = useState(false);
  const [selectedCreateCardAdmin, setSelectedCreateCardAdmin] = useState('');
  const [isCreateCardDropdownOpen, setIsCreateCardDropdownOpen] = useState(false);

  const [cardToDelete, setCardToDelete] = useState(null);

  const [showHardDeleteModal, setShowHardDeleteModal] = useState(false);
  const [cardToHardDelete, setCardToHardDelete] = useState(null);

  const handleDeleteCard = async () => {
    if (!cardToDelete) return;
    try {
      await api.delete(`/budgets/${cardToDelete}`);
      showToast('تم إيقاف البطاقة بنجاح', 'success');
      setShowDeleteCardModal(false);
      setCardToDelete(null);
      fetchAdminsData();
    } catch (error) {
      console.error('Error deleting card:', error);
      showToast('حدث خطأ أثناء الإيقاف', 'error');
    }
  };

  const handleHardDeleteCard = async () => {
    if (!cardToHardDelete) return;
    try {
      await api.delete(`/budgets/${cardToHardDelete}/hard`);
      showToast('تم الحذف النهائي بنجاح', 'success');
      setShowHardDeleteModal(false);
      setCardToHardDelete(null);
      fetchAdminsData();
    } catch (error) {
      console.error('Error hard deleting card:', error);
      showToast('حدث خطأ أثناء الحذف النهائي', 'error');
    }
  };

  const handleActivateCard = async (budgetId) => {
    try {
      await api.put(`/budgets/${budgetId}/activate`);
      showToast('تم تنشيط البطاقة بنجاح', 'success');
      fetchAdminsData();
    } catch (error) {
      console.error('Error activating card:', error);
      showToast('حدث خطأ أثناء تنشيط البطاقة', 'error');
    }
  };

  const handleCreateCard = async () => {
    if (!selectedCreateCardAdmin) {
      showToast('يرجى اختيار حساب أولاً', 'warning');
      return;
    }
    try {
      await api.post('/budgets', {
        userId: selectedCreateCardAdmin,
        monthKey: selectedMonth,
        totalBudget: 0,
        openingBalance: 0
      });
      showToast('تم إنشاء البطاقة بنجاح', 'success');
      setShowCreateCardModal(false);
      setSelectedCreateCardAdmin('');
      fetchAdminsData();
    } catch (error) {
      console.error('Error creating card:', error);
      showToast('حدث خطأ أثناء إنشاء البطاقة', 'error');
    }
  };

  const handleSaveUses = async () => {
    try {
      await api.put(`/admin/users/${activeUsesAdminId}`, { cardUses: usesInput });
      setAdmins(admins.map(a => a.id === activeUsesAdminId ? { ...a, cardUses: usesInput } : a));
      setShowUsesModal(false);
    } catch (err) {
      showToast('خطأ في حفظ استخدامات البطاقة', 'error');
    }
  };

  const handleApplyFilter = () => {
    if (filterMonthInput) {
      setSelectedMonth(filterMonthInput);
    }
    setSelectedShift(filterShiftInput);
    setSearchQuery(filterSearchInput);
    setSelectedStatus(filterStatusInput);
  };

  const getSelectedShiftName = () => {
    if (filterShiftInput === 'all') return 'الكل';
    const shift = shifts.find(s => s.id === filterShiftInput);
    return shift ? shift.name : 'الكل';
  };

  const getSelectedStatusName = () => {
    if (filterStatusInput === 'all') return 'الكل';
    if (filterStatusInput === 'active') return 'نشط';
    if (filterStatusInput === 'inactive') return 'غير نشط';
    return 'نشط';
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
      showToast('حدث خطأ أثناء تصدير الملف.', 'error');
    }
  };

  return (
    <div className="expenses-page">
      <header className="page-header">
        <div className="expensesadd-style-1">
          <div>
            <div className="header-title">
              <Wallet className="header-icon" size={32} />
              <h1>إدارة الميزانيات المالية</h1>
            </div>
            <p>متابعة وتخصيص الميزانيات الشهرية لجميع المشرفين والمديرين</p>
          </div>

        </div>
      </header>

      <div className="advanced-filter-card">
        <div className="filter-header-row">
          <div className="filter-title">
            <Filter size={22} className="theme-color" />
            <span>تصفية وتحديد الميزانيات</span>
          </div>
          <div className="expensesadd-style-2">
            <button className="advanced-apply-btn expensesadd-style-3" onClick={() => setShowCreateCardModal(true)} >
              <CreditCard size={18} />
              إنشاء بطاقة
            </button>
            <button className="advanced-apply-btn" onClick={handleApplyFilter}>
              تطبيق الفرز
            </button>
          </div>
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
            <div className="advanced-select-container expensesadd-style-4" >
              <div
                className="advanced-select-header expensesadd-style-5"
                
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
            <label>حالة البطاقة</label>
            <div className="advanced-select-container expensesadd-style-6" >
              <div
                className="advanced-select-header expensesadd-style-7"
                
                onClick={() => setIsStatusDropdownOpen(!isStatusDropdownOpen)}
              >
                <span>{getSelectedStatusName()}</span>
                <div className={`chevron-icon ${isStatusDropdownOpen ? 'open' : ''}`}>▼</div>
              </div>
              {isStatusDropdownOpen && (
                <>
                  <div className="dropdown-overlay" onClick={() => setIsStatusDropdownOpen(false)}></div>
                  <div className="advanced-select-dropdown fade-in">
                    <div
                      className={`advanced-select-option ${filterStatusInput === 'all' ? 'selected' : ''}`}
                      onClick={() => { setFilterStatusInput('all'); setIsStatusDropdownOpen(false); }}
                    >
                      الكل
                    </div>
                    <div
                      className={`advanced-select-option ${filterStatusInput === 'active' ? 'selected' : ''}`}
                      onClick={() => { setFilterStatusInput('active'); setIsStatusDropdownOpen(false); }}
                    >
                      نشط
                    </div>
                    <div
                      className={`advanced-select-option ${filterStatusInput === 'inactive' ? 'selected' : ''}`}
                      onClick={() => { setFilterStatusInput('inactive'); setIsStatusDropdownOpen(false); }}
                    >
                      غير نشط
                    </div>
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

      <div className="admin-expenses-list expensesadd-style-8" >
        {admins.filter(admin => {
          if (selectedShift !== 'all') {
            const userShift = admin.Shifts && admin.Shifts.length > 0 ? admin.Shifts[0] : null;
            if (!userShift || userShift.id !== selectedShift) return false;
          }
          if (searchQuery.trim() !== '') {
            const name = (admin.fullName || admin.username || '').toLowerCase();
            if (!name.includes(searchQuery.toLowerCase())) return false;
          }

          // Filter by Status
          const budgetData = admin.Budgets && admin.Budgets.length > 0 ? admin.Budgets[0] : null;
          if (!budgetData) return false; // Doesn't have any card

          if (selectedStatus === 'active' && budgetData.isActive === false) return false;
          if (selectedStatus === 'inactive' && budgetData.isActive !== false) return false;

          return true;
        }).map(admin => {
          const budgetData = admin.Budgets && admin.Budgets.length > 0 ? admin.Budgets[0] : null;
          const userShift = admin.Shifts && admin.Shifts.length > 0 ? admin.Shifts[0] : null;
          const expenses = budgetData && budgetData.Expenses ? budgetData.Expenses : [];
          const monthlyExpense = budgetData ? budgetData.totalBudget : 0;
          const openingBalance = budgetData ? budgetData.openingBalance : 0;
          const totalExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0);
          const remaining = monthlyExpense - totalExpenses;
          const isActive = budgetData ? budgetData.isActive !== false : false;

          return (
            <section key={admin.id} className="expenses-hero-section expensesadd-style-9" >
              <div style={{
                position: 'absolute',
                top: '-15px',
                left: '20px',
                padding: '0.5rem 1.2rem',
                borderRadius: '25px',
                fontWeight: 'bold',
                fontSize: '0.9rem',
                color: '#fff',
                background: isActive ? '#22c55e90' : '#ef4444',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                boxShadow: '0 4px 15px rgba(0,0,0,0.3)',
                zIndex: 10,
                border: '2px solid var(--bg-secondary)'
              }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#fff', animation: isActive ? 'pulse 2s infinite' : 'none' }}></div>
                STATUS: {isActive ? 'ACTIVE' : 'INACTIVE'}
              </div>

              <div className="expensesadd-style-10">
                <div className="expensesadd-style-11">
                  {admin.cardUses && (
                    <div className="expensesadd-style-12">
                      <strong>استخدامات البطاقة:</strong> {admin.cardUses}
                    </div>
                  )}
                  <button
                    onClick={() => openUsesModal(admin)}
                    className="expensesadd-style-13"
                    onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(59, 130, 246, 0.25)' }}
                    onMouseOut={(e) => { e.currentTarget.style.background = 'rgba(59, 130, 246, 0.15)' }}
                    disabled
                  >
                    عدد استخدامات البطاقة
                    <strong> ({expenses.length})</strong>

                  </button>
                </div>
                <div className="expensesadd-style-14">
                  {budgetData && budgetData.isActive !== false && (
                    <button
                      onClick={() => { setCardToDelete(budgetData.id); setShowDeleteCardModal(true); }}
                      className="expensesadd-style-15"
                      onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(239, 68, 68, 0.25)' }}
                      onMouseOut={(e) => { e.currentTarget.style.background = 'rgba(239, 68, 68, 0.15)' }}
                    >
                      <Trash2 size={18} />
                      إيقاف البطاقة
                    </button>
                  )}
                  <button
                    onClick={() => exportCardExpensesToExcel(admin, budgetData, expenses, userShift)}
                    className="expensesadd-style-16"
                    onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(16, 185, 129, 0.25)' }}
                    onMouseOut={(e) => { e.currentTarget.style.background = 'rgba(16, 185, 129, 0.15)' }}
                  >
                    <Download size={18} />
                    تحميل تقرير المصاريف
                  </button>
                  {budgetData && budgetData.isActive === false && (
                    <>
                      <button
                        onClick={() => handleActivateCard(budgetData.id)}
                        className="expensesadd-style-17"
                        onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(59, 130, 246, 0.25)' }}
                        onMouseOut={(e) => { e.currentTarget.style.background = 'rgba(59, 130, 246, 0.15)' }}
                      >
                        <Power size={18} />
                        تنشيط البطاقة
                      </button>

                      <button
                        onClick={() => { setCardToHardDelete(budgetData.id); setShowHardDeleteModal(true); }}
                        className="expensesadd-style-18"
                        onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(220, 38, 38, 0.25)' }}
                        onMouseOut={(e) => { e.currentTarget.style.background = 'rgba(220, 38, 38, 0.15)' }}
                      >
                        <Trash2 size={18} />
                        حذف نهائي
                      </button>
                    </>
                  )}
                </div>
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
                <div className="expenses-inputs-container expensesadd-style-19" >

                  <div className="opening-balance-badge">
                    <span className="badge-label">مبلغ بداية المدة ({currentMonthName}):</span>
                    <span className="badge-value">{openingBalance.toLocaleString()} <small>ج.م</small></span>
                  </div>

                  <div className="input-card">
                    <div className="input-card-header">
                      <div className="expensesadd-style-20">
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
                      <div className="date" style={{ color: isActive ? '#10b981' : '#ef4444' }}>
                        {isActive ? 'ACTIVE' : 'INACTIVE'}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Expenses Table for Admin */}
              {expenses.length > 0 && (
                <div className="expenses-table-section fade-in expensesadd-style-21" >
                  <div
                    className="table-header-box expensesadd-style-22"
                    
                    onClick={() => setExpandedTables(prev => ({ ...prev, [admin.id]: !prev[admin.id] }))}
                  >
                    <div className="expensesadd-style-23">
                      <FileText size={20} className="theme-color" />
                      <h4 className="expensesadd-style-24">حركات المصروفات لـ {admin.fullName || admin.username} ({expenses.length})</h4>
                    </div>
                    {expandedTables[admin.id] ? <ChevronUp size={20} className="text-muted" /> : <ChevronDown size={20} className="text-muted" />}
                  </div>

                  {expandedTables[admin.id] && (
                    <div className="advanced-table-wrapper fade-in expensesadd-style-25" >
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
                                    <div className="expensesadd-style-26">
                                      <span>{exp.employeeName}</span>
                                      {exp.item && <small className="expensesadd-style-27">{exp.item}</small>}
                                      {exp.notes && <small className="expensesadd-style-28">{exp.notes}</small>}
                                    </div>
                                  ) : (
                                    <div className="expensesadd-style-29">
                                      <span>{exp.item || 'مستلزمات'}</span>
                                      {exp.notes && <small className="expensesadd-style-30">{exp.notes}</small>}
                                    </div>
                                  )}
                                </span>
                              </td>
                              <td>
                                <span className="amount-cell negative-val expensesadd-style-31" >
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
        <div className="modal-overlay fade-in" onClick={() => setShowUsesModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>تحديد إستخدامات البطاقة</h3>
              <button className="close-btn" onClick={() => setShowUsesModal(false)}><X size={24} /></button>
            </div>
            <div className="modal-body">
              <label>الأغراض المسموح الصرف عليها (مثال: بنزين، بوفيه، إلخ):</label>
              <textarea
                value={usesInput}
                onChange={(e) => setUsesInput(e.target.value)}
                placeholder="اكتب استخدامات البطاقة هنا..."
                className="expensesadd-style-32"
              />
            </div>
            <div className="modal-footer">
              <button className="cancel-btn" onClick={() => setShowUsesModal(false)}>إلغاء</button>
              <button className="save-btn" onClick={handleSaveUses}>حفظ</button>
            </div>
          </div>
        </div>
      )}

      {/* Create Card Modal */}
      {showCreateCardModal && (
        <div className="modal-overlay fade-in expensesadd-style-33" onClick={() => setShowCreateCardModal(false)} >
          <div className="modal-content expensesadd-style-34" onClick={e => e.stopPropagation()} >
            <div className="modal-header">
              <h3>إنشاء بطاقة</h3>
              <button className="close-btn" onClick={() => setShowCreateCardModal(false)}><X size={20} /></button>
            </div>
            <div className="modal-body">
              <div className="form-group expensesadd-style-35" >
                <label className="expensesadd-style-36">اختر الحساب (المدير / المشرف)</label>
                <div
                  className="advanced-select-container expensesadd-style-37"
                  
                  onClick={() => setIsCreateCardDropdownOpen(!isCreateCardDropdownOpen)}
                >
                  <span style={{ color: selectedCreateCardAdmin ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                    {selectedCreateCardAdmin
                      ? admins.find(a => a.id === selectedCreateCardAdmin)?.fullName
                      : '-- اختر الحساب --'}
                  </span>
                  {isCreateCardDropdownOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                </div>

                {isCreateCardDropdownOpen && (
                  <div className="advanced-select-dropdown expensesadd-style-38" >
                    {admins.map(admin => {
                      const shiftName = admin.Shifts && admin.Shifts.length > 0 ? admin.Shifts[0].name : 'بدون وردية';
                      const hasActiveCard = admin.Budgets && admin.Budgets.length > 0 && admin.Budgets[0].isActive !== false;
                      const hasInactiveCard = admin.Budgets && admin.Budgets.length > 0 && admin.Budgets[0].isActive === false;
                      return (
                        <div
                          key={admin.id}
                          className="advanced-select-option expensesadd-style-39"
                          
                          onClick={() => {
                            setSelectedCreateCardAdmin(admin.id);
                            setIsCreateCardDropdownOpen(false);
                          }}
                        >
                          <div className="expensesadd-style-40">
                            <span style={{ fontWeight: 'bold', fontSize: '1rem', color: '#fff', textDecoration: hasInactiveCard ? 'line-through' : 'none', opacity: hasInactiveCard ? 0.7 : 1 }}>{admin.fullName}</span>
                            <span className="expensesadd-style-41">الوردية: {shiftName}</span>
                          </div>
                          {hasActiveCard && (
                            <CreditCard size={20} className="expensesadd-style-42" title="يمتلك بطاقة نشطة" />
                          )}
                          {hasInactiveCard && (
                            <div className="expensesadd-style-43" title="البطاقة متوقفة (غير نشطة)">
                              <CreditCard size={20} className="expensesadd-style-44" />
                              <div className="expensesadd-style-45"></div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
            <div className="modal-footer">
              <button className="cancel-btn" onClick={() => setShowCreateCardModal(false)}>إلغاء</button>
              <button className="save-btn" onClick={handleCreateCard}>إنشاء</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Card Modal (Soft Delete) */}
      {showDeleteCardModal && (
        <div className="modal-overlay fade-in expensesadd-style-46" onClick={() => setShowDeleteCardModal(false)} >
          <div className="modal-content expensesadd-style-47" onClick={e => e.stopPropagation()} >
            <div className="modal-header">
              <h3 className="expensesadd-style-48">إيقاف البطاقة</h3>
              <button className="close-btn" onClick={() => setShowDeleteCardModal(false)}><X size={20} /></button>
            </div>
            <div className="modal-body">
              <p className="expensesadd-style-49">
                هل أنت متأكد من إيقاف هذه البطاقة؟
                <br /><small className="expensesadd-style-50">(سيتم حفظ المعاملات ولن تحذف، وستتحول البطاقة لحالة "غير نشط")</small>
              </p>
            </div>
            <div className="modal-footer">
              <button className="cancel-btn" onClick={() => setShowDeleteCardModal(false)}>إلغاء</button>
              <button className="save-btn expensesadd-style-51" onClick={handleDeleteCard} >تأكيد الإيقاف</button>
            </div>
          </div>
        </div>
      )}

      {/* Hard Delete Card Modal */}
      {showHardDeleteModal && (
        <div className="modal-overlay fade-in expensesadd-style-52" onClick={() => setShowHardDeleteModal(false)} >
          <div className="modal-content expensesadd-style-53" onClick={e => e.stopPropagation()} >
            <div className="modal-header">
              <h3 className="expensesadd-style-54">حذف البطاقة نهائياً</h3>
              <button className="close-btn" onClick={() => setShowHardDeleteModal(false)}><X size={20} /></button>
            </div>
            <div className="modal-body">
              <div className="expensesadd-style-55">
                <p className="expensesadd-style-56">
                  ⚠️ تحذير شديد الأهمية ⚠️<br />
                  سيتم حذف هذه البطاقة وجميع المصروفات والمعاملات المرتبطة بها نهائياً ولا يمكن التراجع عن هذا الإجراء!
                </p>
              </div>
              <p className="expensesadd-style-57">
                نصيحة: تأكد من <strong>تحميل تقرير المصاريف</strong> (Excel) للاحتفاظ بنسخة من البيانات قبل الحذف.
              </p>
            </div>
            <div className="modal-footer">
              <button className="cancel-btn" onClick={() => setShowHardDeleteModal(false)}>إلغاء</button>
              <button className="save-btn expensesadd-style-58" onClick={handleHardDeleteCard} >حذف نهائي للبيانات</button>
            </div>
          </div>
        </div>
      )}

      {showDeleteCardModal && (
        <div className="modal-overlay fade-in expensesadd-style-59" onClick={() => setShowDeleteCardModal(false)} >
          <div className="modal-content expensesadd-style-60" onClick={e => e.stopPropagation()} >
            <div className="modal-header">
              <h3 className="expensesadd-style-61">حذف البطاقة</h3>
              <button className="close-btn" onClick={() => setShowDeleteCardModal(false)}><X size={20} /></button>
            </div>
            <div className="modal-body">
              <p className="expensesadd-style-62">
                هل أنت متأكد من حذف هذه البطاقة؟
                <br /><small className="expensesadd-style-63">(سيتم حفظ المعاملات ولن تحذف)</small>
              </p>
            </div>
            <div className="modal-footer">
              <button className="cancel-btn" onClick={() => setShowDeleteCardModal(false)}>إلغاء</button>
              <button className="save-btn expensesadd-style-64" onClick={handleDeleteCard} >تأكيد الحذف</button>
            </div>
          </div>
        </div>
      )
      }
    </div>

  );
};

/* Delete Card Modal */


export default ExpensesAdd;
