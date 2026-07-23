import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { DollarSign, Search, Calendar, ChevronDown, CheckCircle, Clock, Edit, Eye, User, TrendingUp, TrendingDown, Award, Trash2, X } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import AvatarIcon from '../components/AvatarIcon';
import "./EmployeesAccounts.scss";
import { useToast } from '../contexts/ToastContext';

const EmployeesAccounts = () => {
  const date = new Date();
  const todayMonthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  
  const [searchParams, setSearchParams] = useSearchParams();
  const initialMonth = searchParams.get('monthKey') || todayMonthKey;

  const [selectedMonth, setSelectedMonth] = useState(initialMonth);
  const [loading, setLoading] = useState(true);
  const [accounts, setAccounts] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedRow, setExpandedRow] = useState(null);
  const [showAdjustmentModal, setShowAdjustmentModal] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [adjustmentType, setAdjustmentType] = useState('Addition');
  const [adjustmentAmount, setAdjustmentAmount] = useState('');
  const [adjustmentReason, setAdjustmentReason] = useState('');
  const [editingAdjustmentId, setEditingAdjustmentId] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [filterType, setFilterType] = useState('active');
  const [settlementModal, setSettlementModal] = useState({ isOpen: false, account: null });
  const { showToast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (selectedMonth) {
      setSearchParams({ monthKey: selectedMonth }, { replace: true });
    }
    fetchData();
  }, [selectedMonth]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch users, advances, and logs concurrently
      const [usersRes, advancesRes, logsRes, settingsRes, adjustmentsRes, settlementsRes] = await Promise.all([
        api.get('/admin/users'),
        api.get('/advances/all', { params: { monthKey: selectedMonth } }),
        api.get('/attendance/all-logs', { params: { monthKey: selectedMonth } }),
        api.get('/settings'),
        api.get('/salary-adjustments/all', { params: { monthKey: selectedMonth } }),
        api.get('/settlements', { params: { monthKey: selectedMonth } }).catch(() => ({ data: [] }))
      ]);

      const users = Array.isArray(usersRes.data) ? usersRes.data.filter(u => u.Shifts && u.Shifts.length > 0) : [];
      const advances = Array.isArray(advancesRes.data) ? advancesRes.data : (advancesRes.data?.advances || []);
      const logs = Array.isArray(logsRes.data) ? logsRes.data : (logsRes.data?.logs || []);
      const adjustments = Array.isArray(adjustmentsRes.data) ? adjustmentsRes.data : [];
      const settlements = Array.isArray(settlementsRes.data) ? settlementsRes.data : [];

      const settingsMap = {};
      if (settingsRes.data && Array.isArray(settingsRes.data)) {
        settingsRes.data.forEach(s => settingsMap[s.key] = s.value);
      }

      const absencePenaltyMultiplier = Number(settingsMap.absencePenaltyMultiplier || localStorage.getItem('absencePenaltyMultiplier') || '2');
      const dayOffWorkMultiplier = Number(settingsMap.dayOffWorkMultiplier || localStorage.getItem('dayOffWorkMultiplier') || '1.5');
      const allowedDelayMinutes = Number(settingsMap.allowedDelayMinutes || localStorage.getItem('allowedDelayMinutes') || '15');
      const enableLatePenalty = (settingsMap.enableLatePenalty || localStorage.getItem('enableLatePenalty')) !== 'false';
      const workingHours = 8; // Default, can be fetched if needed

      // Build stats per user
      const userStats = {};
      users.forEach(u => {
        let userBaseSalary = Number(u.baseSalary);
        if (!userBaseSalary && u.Shifts && u.Shifts.length > 0) {
          userBaseSalary = Number(u.Shifts[0].baseSalary);
        }
        userStats[u.id] = {
          user: u,
          baseSalary: userBaseSalary || 0,
          dailyRate: (userBaseSalary || 0) / 30,
          presentCount: 0,
          dayOffCount: 0,
          absentCount: 0,
          dayOffWorkCount: 0,
          lateMins: 0,
          totalAdvances: 0,
          totalAdvances: 0,
          manualAdditions: 0,
          manualDeductions: 0,
          settlementStatus: 'Active',
          settledAt: null,
          details: []
        };
      });

      settlements.forEach(s => {
        if (userStats[s.userId]) {
          userStats[s.userId].settlementStatus = s.status;
          userStats[s.userId].settledAt = s.settledAt;
        }
      });

      // Calculate Advances
      advances.forEach(adv => {
        const uId = adv.userId || adv.Requester?.id;
        if (adv.status === 'approved' && userStats[uId]) {
          userStats[uId].totalAdvances += Number(adv.amount);
        }
      });

      // Calculate Attendance
      logs.forEach(log => {
        const uId = log.userId || log.User?.id;
        if (!userStats[uId]) return;

        const dailyRate = userStats[uId].dailyRate;

        if (log.status === 'Absent') {
          userStats[uId].absentCount += 1;
          userStats[uId].details.push({
            id: `absent-${log.id}`,
            type: 'Deduction',
            category: 'غياب',
            amount: Math.round(absencePenaltyMultiplier * dailyRate),
            date: log.date,
            time: '',
            reason: 'غياب'
          });
        } else if (log.status === 'DayOffWork') {
          userStats[uId].dayOffWorkCount += 1;
          userStats[uId].details.push({
            id: `dayoffwork-${log.id}`,
            type: 'Addition',
            category: 'إضافي عمل',
            amount: Math.round(dayOffWorkMultiplier * dailyRate),
            date: log.date,
            time: '',
            reason: 'عمل في يوم إجازة'
          });
        } else if (log.status === 'Present') {
          userStats[uId].presentCount += 1;
        } else if (log.status === 'DayOff') {
          userStats[uId].dayOffCount += 1;
        }

        // Late calculation
        if ((log.status === 'Present' || log.status === 'DayOffWork' || log.status === 'Late') && log.checkInTime && log.Shift?.startTime) {
          const checkInDate = new Date(log.checkInTime);
          const [startHour, startMin] = log.Shift.startTime.split(':').map(Number);

          const shiftStart = new Date(checkInDate);
          shiftStart.setHours(startHour, startMin, 0, 0);

          if (checkInDate > shiftStart) {
            const diffMs = checkInDate - shiftStart;
            const diffMins = Math.floor(diffMs / 60000);
            const actualDelayMins = diffMins - allowedDelayMinutes;

            if (enableLatePenalty && actualDelayMins > 0) {
              userStats[uId].lateMins += actualDelayMins;
              userStats[uId].details.push({
                id: `late-${log.id}`,
                type: 'Deduction',
                category: 'تأخير',
                amount: Math.round(actualDelayMins * (dailyRate / workingHours / 60)),
                date: log.date,
                time: checkInDate.toLocaleTimeString('ar-EG', { timeStyle: 'short' }),
                reason: `تأخير ${actualDelayMins} دقيقة`
              });
            }
          }
        }
      });

      // Calculate Adjustments
      adjustments.forEach(adj => {
        if (userStats[adj.userId]) {
          if (adj.type === 'Addition') {
            userStats[adj.userId].manualAdditions += Number(adj.amount);
          } else if (adj.type === 'Deduction') {
            userStats[adj.userId].manualDeductions += Number(adj.amount);
          }
          userStats[adj.userId].details.push({
            id: `adj-${adj.id}`,
            type: adj.type,
            category: adj.type === 'Addition' ? 'مكافأة يدوية' : 'خصم يدوي',
            amount: adj.amount,
            date: new Date(adj.createdAt).toISOString().split('T')[0],
            time: new Date(adj.createdAt).toLocaleTimeString('ar-EG', { timeStyle: 'short' }),
            reason: adj.reason || 'بدون سبب'
          });
        }
      });

      // Finalize accounts
      const finalAccounts = Object.values(userStats).map(stat => {
        const dailyRate = stat.baseSalary / 30;

        const baseEarnings = (stat.presentCount + stat.dayOffCount) * dailyRate;
        const absentPenalty = stat.absentCount * absencePenaltyMultiplier * dailyRate;
        const latePenalty = stat.lateMins * (dailyRate / workingHours / 60);

        const autoDeductions = Math.round(absentPenalty + latePenalty);
        const totalDeductions = autoDeductions + stat.manualDeductions;

        const autoAdditions = Math.round(stat.dayOffWorkCount * dailyRate * dayOffWorkMultiplier);
        const totalAdditions = autoAdditions + stat.manualAdditions;

        const netSalary = Math.round(baseEarnings + totalAdditions - totalDeductions - stat.totalAdvances);

        const sortedDetails = stat.details.sort((a, b) => {
          if (a.date !== b.date) return new Date(b.date) - new Date(a.date);
          return 0;
        });

        return {
          id: stat.user.id,
          name: stat.user.fullName || stat.user.username,
          username: stat.user.username,
          avatar: stat.user.avatar,
          monthlySalary: stat.baseSalary,
          baseEarnings: Math.round(baseEarnings),
          presentCount: stat.presentCount,
          dayOffCount: stat.dayOffCount,
          autoAdditions,
          manualAdditions: stat.manualAdditions,
          totalAdditions,
          autoDeductions,
          manualDeductions: stat.manualDeductions,
          totalDeductions,
          totalAdvances: stat.totalAdvances,
          netSalary,
          settlementStatus: stat.settlementStatus,
          settledAt: stat.settledAt,
          details: sortedDetails,
          absentCount: stat.absentCount,
          lateMins: stat.lateMins,
          user: stat.user
        };
      });

      // Sort by net salary descending
      finalAccounts.sort((a, b) => b.netSalary - a.netSalary);

      setAccounts(finalAccounts);
    } catch (err) {
      console.error('Error fetching data:', err);
      showToast('حدث خطأ أثناء تحميل الحسابات', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleEditClick = (acc) => {
    setSelectedAccount(acc);
    setAdjustmentType('Addition');
    setAdjustmentAmount('');
    setAdjustmentReason('');
    setEditingAdjustmentId(null);
    setShowAdjustmentModal(true);
  };

  const handleEditAdjustmentRow = (e, acc, det) => {
    e.stopPropagation();
    setSelectedAccount(acc);
    setAdjustmentType(det.type);
    setAdjustmentAmount(det.amount);

    if (!det.id.startsWith('adj-')) {
      setAdjustmentReason(`تعديل على: ${det.category} (${det.date})`);
      setEditingAdjustmentId('AUTO_OFFSET_' + det.id);
    } else {
      setAdjustmentReason(det.reason || '');
      setEditingAdjustmentId(det.id.replace('adj-', ''));
    }

    setShowAdjustmentModal(true);
  };

  const handleDeleteAdjustmentRow = async (e, det) => {
    e.stopPropagation();

    if (!det.id.startsWith('adj-')) {
      const isConfirmed = window.confirm('هذه عملية تلقائية ناتجة من الحضور والانصراف. حذفها سيقوم بإضافة عملية تعويضية يدوية لإلغاء تأثيرها. هل تريد الاستمرار؟');
      if (!isConfirmed) return;

      try {
        await api.post('/salary-adjustments/add', {
          userId: selectedAccount ? selectedAccount.id : det.userId,
          monthKey: selectedMonth,
          type: det.type === 'Addition' ? 'Deduction' : 'Addition',
          amount: det.amount,
          reason: `إلغاء تعويضي لـ: ${det.category} (${det.date})`
        });
        showToast('تم إضافة عملية الإلغاء بنجاح', 'success');
        fetchData();
      } catch (err) {
        showToast('حدث خطأ أثناء التعويض', 'error');
      }
      return;
    }

    if (!window.confirm('هل أنت متأكد من حذف هذا التعديل؟')) return;
    try {
      await api.delete(`/salary-adjustments/delete/${det.id.replace('adj-', '')}`);
      showToast('تم حذف التعديل بنجاح', 'success');
      fetchData();
    } catch (err) {
      console.error('Error deleting adjustment:', err);
      showToast('حدث خطأ أثناء الحذف', 'error');
    }
  };

  const handleSubmitAdjustment = async (e) => {
    e.preventDefault();
    if (!adjustmentAmount || Number(adjustmentAmount) <= 0) {
      showToast('يرجى إدخال مبلغ صحيح', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingAdjustmentId && !editingAdjustmentId.toString().startsWith('AUTO_OFFSET_')) {
        await api.put(`/salary-adjustments/edit/${editingAdjustmentId}`, {
          type: adjustmentType,
          amount: adjustmentAmount,
          reason: adjustmentReason
        });
        showToast('تم تعديل العملية بنجاح', 'success');
      } else {
        await api.post('/salary-adjustments/add', {
          userId: selectedAccount.id,
          monthKey: selectedMonth,
          type: adjustmentType,
          amount: Number(adjustmentAmount),
          reason: adjustmentReason
        });
        showToast('تمت إضافة العملية بنجاح', 'success');
      }

      setShowAdjustmentModal(false);
      setEditingAdjustmentId(null);
      fetchData(); // Refresh data
    } catch (error) {
      console.error('Error adding adjustment:', error);
      showToast('حدث خطأ أثناء حفظ التعديل', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleSettlement = async (status) => {
    try {
      await api.post('/settlements/toggle', {
        userId: settlementModal.account.id,
        monthKey: selectedMonth,
        status: status,
        accountDetails: {
          netSalary: settlementModal.account.netSalary,
          baseEarnings: settlementModal.account.baseEarnings,
          totalAdditions: settlementModal.account.totalAdditions,
          totalDeductions: settlementModal.account.totalDeductions,
          totalAdvances: settlementModal.account.totalAdvances,
          presentCount: settlementModal.account.presentCount,
          dayOffCount: settlementModal.account.dayOffCount,
          absentCount: settlementModal.account.absentCount,
          walletNumber: settlementModal.account.user?.walletNumber || 'غير محدد',
          walletType: settlementModal.account.user?.walletType || 'غير محدد',
          employeeEmail: settlementModal.account.user?.email,
          employeeName: settlementModal.account.name
        }
      });
      showToast('تم تحديث حالة التسوية بنجاح', 'success');
      setSettlementModal({ isOpen: false, account: null });
      fetchData(); // Reload data
    } catch (err) {
      console.error(err);
      showToast('حدث خطأ أثناء التحديث', 'error');
    }
  };

  const filteredAccounts = accounts.filter(acc => {
    if (filterType === 'settled' && acc.settlementStatus !== 'Settled') return false;
    if (filterType === 'active' && acc.settlementStatus === 'Settled') return false;
    return true;
  }).filter(acc =>
    acc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    acc.username.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalNetSalaries = filteredAccounts.reduce((sum, acc) => sum + acc.netSalary, 0);

  return (
    <div className="employees-accounts-page fade-in">

      {/* Top Header */}
      <div className="employeesaccounts-style-1">
        <div className="employeesaccounts-style-2">
          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="employeesaccounts-style-3"
          />
          <div className="employeesaccounts-style-4">
            <Search size={18} className="employeesaccounts-style-5" />
            <input
              type="text"
              placeholder="بحث باسم الموظف..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="employeesaccounts-style-6"
            />
          </div>
        </div>
        <div className="employeesaccounts-style-7">
          <h1 className="employeesaccounts-style-8">حسابات الموظفين</h1>
          <DollarSign color="var(--theme-color)" size={36} className="employeesaccounts-style-9" />
        </div>
      </div>

      {/* Advanced Summary Card */}
      <div className="employeesaccounts-style-10">
        <div className="employeesaccounts-style-11">
          <span className="employeesaccounts-style-12">{totalNetSalaries.toLocaleString()}</span>
          <span className="employeesaccounts-style-13">ج.م</span>
        </div>
        <div className="employeesaccounts-style-14">
          <h2 className="employeesaccounts-style-15">إجمالي الرواتب الصافية المطلوبة</h2>
          <p className="employeesaccounts-style-16">هذا الرقم يمثل المجموع الكلي للرواتب المتوقع دفعها للموظفين أعلاه بعد كل الخصومات والإضافات والسلف.</p>
        </div>
      </div>

      {/* Filter Tabs (Moved below summary as requested) */}
      <div className="employeesaccounts-style-17">
        <button
          onClick={() => setFilterType('all')}
          style={{ flex: 1, padding: '1rem', borderRadius: '12px', border: 'none', cursor: 'pointer', background: filterType === 'all' ? 'linear-gradient(135deg, var(--theme-color) 0%, rgba(245, 158, 11, 0.8) 100%)' : 'transparent', color: filterType === 'all' ? '#000' : 'var(--text-secondary)', fontWeight: 'bold', fontSize: '1.1rem', transition: 'all 0.3s', boxShadow: filterType === 'all' ? '0 5px 15px rgba(245, 158, 11, 0.3)' : 'none' }}
        >
          الكل
        </button>
        <button
          onClick={() => setFilterType('active')}
          style={{ flex: 1, padding: '1rem', borderRadius: '12px', border: 'none', cursor: 'pointer', background: filterType === 'active' ? 'linear-gradient(135deg, var(--theme-color) 0%, rgba(245, 158, 11, 0.8) 100%)' : 'transparent', color: filterType === 'active' ? '#000' : 'var(--text-secondary)', fontWeight: 'bold', fontSize: '1.1rem', transition: 'all 0.3s', boxShadow: filterType === 'active' ? '0 5px 15px rgba(245, 158, 11, 0.3)' : 'none' }}
        >
          حسابات جارية
        </button>
        <button
          onClick={() => setFilterType('settled')}
          style={{ flex: 1, padding: '1rem', borderRadius: '12px', border: 'none', cursor: 'pointer', background: filterType === 'settled' ? 'linear-gradient(135deg, var(--theme-color) 0%, rgba(245, 158, 11, 0.8) 100%)' : 'transparent', color: filterType === 'settled' ? '#000' : 'var(--text-secondary)', fontWeight: 'bold', fontSize: '1.1rem', transition: 'all 0.3s', boxShadow: filterType === 'settled' ? '0 5px 15px rgba(245, 158, 11, 0.3)' : 'none' }}
        >
          تم التسوية
        </button>
      </div>

      <div className="accounts-table-container">
        {loading ? (
          <div className="loading-state">جاري حساب البيانات المالية...</div>
        ) : (
          <table className="accounts-table">
            <thead>
              <tr>
                <th>الموظف</th>
                <th>أيام الحضور</th>
                <th>المستحق (بناءً على الحضور)</th>
                <th>الإضافي</th>
                <th>الخصميات</th>
                <th>السلف (ديون)</th>
                <th>الصافي المتوقع</th>
                <th>الإجراءات</th>
              </tr>
            </thead>
            <tbody>
              {filteredAccounts.length === 0 ? (
                <tr>
                  <td colSpan="8" className="employeesaccounts-style-18">
                    لا يوجد موظفين لعرض حساباتهم
                  </td>
                </tr>
              ) : (
                filteredAccounts.map((acc, index) => (
                  <React.Fragment key={acc.id}>
                    <tr
                      className="account-row clickable-row"
                      onClick={() => setExpandedRow(expandedRow === acc.id ? null : acc.id)}
                      style={{ cursor: 'pointer', animationDelay: `${index * 0.05}s` }}
                    >
                      <td>
                        <div className="emp-info-wrapper">
                          <div className="emp-avatar advanced-avatar">
                            <AvatarIcon name={acc.avatar || 'User'} size={24} color="var(--text-primary)" />
                          </div>
                          <div className="emp-info">
                            <strong>{acc.name}</strong>
                            <span className="emp-username">@{acc.username}</span>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className="attendance-days">
                          <span className="days-count employeesaccounts-style-19" >{acc.presentCount}</span>
                          <span className="days-label employeesaccounts-style-20" >يوم</span>
                        </div>
                      </td>
                      <td>
                        <div className="base-salary-info">
                          <span className="base-salary">{acc.baseEarnings.toLocaleString()} ج.م</span>
                        </div>
                      </td>
                      <td>
                        <span className="additions" style={{ color: acc.totalAdditions > 0 ? '#10b981' : 'inherit' }}>
                          {acc.totalAdditions > 0 ? '+' : ''}{acc.totalAdditions.toLocaleString()} ج.م
                        </span>
                      </td>
                      <td>
                        <div className="deductions-info">
                          <span className="deductions-amount" style={{ color: acc.totalDeductions > 0 ? '#ef4444' : 'inherit' }}>
                            {acc.totalDeductions > 0 ? '-' : ''}{acc.totalDeductions.toLocaleString()} ج.م
                          </span>
                        </div>
                      </td>
                      <td>
                        <span className="advances" style={{ color: acc.totalAdvances > 0 ? '#f59e0b' : 'inherit' }}>
                          {acc.totalAdvances > 0 ? '-' : ''}{acc.totalAdvances.toLocaleString()} ج.م
                        </span>
                      </td>
                      <td>
                        <span className={`net-salary ${acc.netSalary < 0 ? 'negative' : 'positive'}`}>
                          {acc.netSalary.toLocaleString()} ج.م
                        </span>
                      </td>
                      <td>
                        <div className="action-buttons">
                          <button
                            className="action-btn"
                            style={{ background: acc.settlementStatus === 'Settled' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(59, 130, 246, 0.15)', color: acc.settlementStatus === 'Settled' ? '#10b981' : '#3b82f6', border: '1px solid currentColor', borderRadius: '8px', padding: '0.4rem', cursor: 'pointer', transition: 'all 0.3s' }}
                            onClick={(e) => { e.stopPropagation(); setSettlementModal({ isOpen: true, account: acc }); }}
                            title={acc.settlementStatus === 'Settled' ? "تم التسوية (اضغط للتعديل)" : "إجراء تسوية"}
                          >
                            <CheckCircle size={22} style={{ opacity: acc.settlementStatus === 'Settled' ? 1 : 0.5 }} />
                          </button>
                          <button
                            className="action-btn edit-btn2"
                            onClick={(e) => { e.stopPropagation(); handleEditClick(acc); }}
                            title="تعديل الحساب (إضافة خصم أو إضافي)"
                          >
                            <Edit size={22} />
                          </button>
                          <button
                            className="action-btn view-btn"
                            onClick={(e) => { e.stopPropagation(); navigate(`/my-advances/${acc.id}?monthKey=${selectedMonth}`); }}
                            title="عرض التفاصيل المالية"
                          >
                            <Eye size={22} />
                          </button>
                        </div>
                      </td>
                    </tr>
                    {expandedRow === acc.id && acc.details.length > 0 && (
                      <tr className="expanded-details-row">
                        <td colSpan="8" className="employeesaccounts-style-21">
                          <div className="employeesaccounts-style-22">
                            <h4 className="employeesaccounts-style-23">
                              تفاصيل العمليات لهذا الشهر
                            </h4>
                            <div className="employeesaccounts-style-24">
                              <table className="employeesaccounts-style-25">
                                <thead className="employeesaccounts-style-26">
                                  <tr>
                                    <th className="employeesaccounts-style-27">التاريخ</th>
                                    <th className="employeesaccounts-style-28">الوقت</th>
                                    <th className="employeesaccounts-style-29">التصنيف</th>
                                    <th className="employeesaccounts-style-30">النوع</th>
                                    <th className="employeesaccounts-style-31">المبلغ</th>
                                    <th className="employeesaccounts-style-32">السبب</th>
                                    <th className="employeesaccounts-style-33">إجراءات</th>
                                  </tr>
                                </thead>
                                <tbody className="employeesaccounts-style-34">
                                  {acc.details.map(det => {
                                    const isAuto = !det.id.startsWith('adj-');
                                    return (
                                      <tr key={det.id}  className="hover-row employeesaccounts-style-35">
                                        <td className="employeesaccounts-style-36">{det.date}</td>
                                        <td className="employeesaccounts-style-37">{det.time || '-'}</td>
                                        <td className="employeesaccounts-style-38">{det.category}</td>
                                        <td className="employeesaccounts-style-39">
                                          <span style={{
                                            background: det.type === 'Addition' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                                            color: det.type === 'Addition' ? '#10b981' : '#ef4444',
                                            padding: '0.3rem 0.8rem', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 'bold',
                                            display: 'inline-block'
                                          }}>
                                            {det.type === 'Addition' ? 'إضافي' : 'خصم'} {isAuto ? '(تلقائي)' : ''}
                                          </span>
                                        </td>
                                        <td style={{ padding: '0.8rem', textAlign: 'center', fontWeight: 'bold', color: det.type === 'Addition' ? '#10b981' : '#ef4444' }}>
                                          <span dir="ltr">{det.type === 'Addition' ? '+' : '-'}{det.amount.toLocaleString()}</span> ج.م
                                        </td>
                                        <td className="employeesaccounts-style-40">{det.reason}</td>
                                        <td className="employeesaccounts-style-41">
                                          {isAuto ? (
                                            <div className="employeesaccounts-style-42">
                                              <button
                                                
                                                onClick={(e) => handleEditAdjustmentRow(e, acc, det)}
                                                title="تعديل قيمة العملية التلقائية"
                                                className="hover-bg-blue employeesaccounts-style-43"
                                              >
                                                <Edit size={18} />
                                              </button>
                                              <button
                                                
                                                onClick={(e) => handleDeleteAdjustmentRow(e, det)}
                                                title="إلغاء العملية التلقائية"
                                                className="hover-bg-red employeesaccounts-style-44"
                                              >
                                                <Trash2 size={18} />
                                              </button>
                                            </div>
                                          ) : (
                                            <div className="employeesaccounts-style-45">
                                              <button
                                                
                                                onClick={(e) => handleEditAdjustmentRow(e, acc, det)}
                                                title="تعديل"
                                                className="hover-bg-blue employeesaccounts-style-46"
                                              >
                                                <Edit size={18} />
                                              </button>
                                              <button
                                                
                                                onClick={(e) => handleDeleteAdjustmentRow(e, det)}
                                                title="حذف"
                                                className="hover-bg-red employeesaccounts-style-47"
                                              >
                                                <Trash2 size={18} />
                                              </button>
                                            </div>
                                          )}
                                        </td>
                                      </tr>
                                    )
                                  })}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                    {expandedRow === acc.id && acc.details.length === 0 && (
                      <tr className="expanded-details-row">
                        <td colSpan="8" className="employeesaccounts-style-48">
                          <div className="employeesaccounts-style-49">
                            لا توجد تفاصيل أو عمليات مسجلة لهذا الموظف في هذا الشهر.
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>

      {showAdjustmentModal && selectedAccount && (
        <div className="modal-overlay active">
          <div className="modal-content advanced-modal">
            <div className="modal-header">
              <h2>تعديل حساب: {selectedAccount.name}</h2>
              <button className="close-btn" onClick={() => setShowAdjustmentModal(false)}>×</button>
            </div>

            <div className="account-details-grid">
              <div className="detail-box">
                <span className="detail-label">الإضافي التلقائي</span>
                <span className="detail-value positive">{selectedAccount.autoAdditions} ج.م</span>
              </div>
              <div className="detail-box">
                <span className="detail-label">الخصم التلقائي</span>
                <span className="detail-value negative">{selectedAccount.autoDeductions} ج.م</span>
              </div>
              <div className="detail-box">
                <span className="detail-label">إضافي يدوي</span>
                <span className="detail-value positive">{selectedAccount.manualAdditions} ج.م</span>
              </div>
              <div className="detail-box">
                <span className="detail-label">خصم يدوي</span>
                <span className="detail-value negative">{selectedAccount.manualDeductions} ج.م</span>
              </div>
            </div>

            <form onSubmit={handleSubmitAdjustment} className="adjustment-form">
              <div className="form-group">
                <label>نوع التعديل</label>
                <div className="type-toggle">
                  <button
                    type="button"
                    className={`toggle-btn ${adjustmentType === 'Addition' ? 'active-add' : ''}`}
                    onClick={() => setAdjustmentType('Addition')}
                  >
                    إضافي (مكافأة)
                  </button>
                  <button
                    type="button"
                    className={`toggle-btn ${adjustmentType === 'Deduction' ? 'active-deduct' : ''}`}
                    onClick={() => setAdjustmentType('Deduction')}
                  >
                    خصم (جزاء)
                  </button>
                </div>
              </div>

              <div className="form-group">
                <label>المبلغ (ج.م)</label>
                <input
                  type="number"
                  value={adjustmentAmount}
                  onChange={(e) => setAdjustmentAmount(e.target.value)}
                  placeholder="أدخل المبلغ..."
                  required
                  min="1"
                />
              </div>

              <div className="form-group">
                <label>السبب أو ملاحظات (اختياري)</label>
                <textarea
                  value={adjustmentReason}
                  onChange={(e) => setAdjustmentReason(e.target.value)}
                  placeholder="سبب الخصم أو المكافأة..."
                  rows="3"
                ></textarea>
              </div>

              <button type="submit" className="submit-btn" disabled={isSubmitting}>
                {isSubmitting ? 'جاري الحفظ...' : 'حفظ التعديل'}
              </button>
            </form>
          </div>
        </div>
      )}
      {/* Settlement Modal */}
      {settlementModal.isOpen && settlementModal.account && (
        <div className="employeesaccounts-style-50">
          <div className="employeesaccounts-style-51">
            <h3 className="employeesaccounts-style-52">
              <CheckCircle size={24} className="text-blue" />
              تأكيد التسوية المالية
            </h3>
            <p className="employeesaccounts-style-53">
              الموظف: <strong>{settlementModal.account.name}</strong>
            </p>
            <div className="employeesaccounts-style-54">
              <div className="employeesaccounts-style-55">
                <span className="employeesaccounts-style-56">صافي المستحقات:</span>
                <strong className="employeesaccounts-style-57">{settlementModal.account.netSalary.toLocaleString()} ج.م</strong>
              </div>
              <div className="employeesaccounts-style-58">
                <span className="employeesaccounts-style-59">نوع حساب الاستلام:</span>
                <strong style={{ color: settlementModal.account.user?.walletType === 'InstaPay' ? '#a855f7' : 'var(--theme-color)' }}>
                  {settlementModal.account.user?.walletType === 'InstaPay' ? 'انستا باي (InstaPay)' : 'محفظة إلكترونية (كاش)'}
                </strong>
              </div>
              <div className="employeesaccounts-style-60">
                <span className="employeesaccounts-style-61">
                  {settlementModal.account.user?.walletType === 'InstaPay' ? 'عنوان / رقم انستا باي:' : 'رقم المحفظة الإلكترونية:'}
                </span>
                <strong className="employeesaccounts-style-62">
                  {settlementModal.account.user?.walletNumber || settlementModal.account.user?.phone || 'غير مسجل'}
                </strong>
              </div>
            </div>

            <p className="employeesaccounts-style-63">
              {settlementModal.account.settlementStatus === 'Settled'
                ? 'هذا الحساب تم تسويته بالفعل. هل تريد إلغاء التسوية وإعادته كحساب جاري؟'
                : 'هل أنت متأكد من تسوية هذا الحساب؟ لن يظهر في الحسابات الجارية بعد الآن إلا إذا قمت بإلغاء التسوية.'}
            </p>

            <div className="employeesaccounts-style-64">
              {settlementModal.account.settlementStatus !== 'Settled' ? (
                <button
                  onClick={() => handleToggleSettlement('Settled')}
                  className="employeesaccounts-style-65"
                >
                  تأكيد التسوية
                </button>
              ) : (
                <button
                  onClick={() => handleToggleSettlement('Active')}
                  className="employeesaccounts-style-66"
                >
                  إلغاء التسوية
                </button>
              )}
              <button
                onClick={() => setSettlementModal({ isOpen: false, account: null })}
                className="employeesaccounts-style-67"
              >
                تراجع
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default EmployeesAccounts;
