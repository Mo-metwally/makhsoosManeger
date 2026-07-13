import React, { useState, useEffect, useMemo, useRef } from 'react';
import { FileSpreadsheet, Archive, PhoneCall, Activity, ClipboardList, DownloadCloud, Info, Loader2, Search, ChevronDown, Check } from 'lucide-react';
import api from '../services/api';
import { exportAdminData } from '../utils/exportExcel';
import { applyFiltersAndSort, parseArabicDate } from '../utils/filterAndSort';
import AdminGuard from '../components/AdminGuard';
import { useToast } from '../contexts/ToastContext';
import { useAuth } from '../context/AuthContext';

const HandleAdminExport = () => {
  const { showToast } = useToast();
  const { user } = useAuth();
  const [exportType, setExportType] = useState('all_zip');
  const [timeFilter, setTimeFilter] = useState('month');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  const [shifts, setShifts] = useState([]);
  const [selectedShift, setSelectedShift] = useState('all');

  const [isShiftDropdownOpen, setIsShiftDropdownOpen] = useState(false);
  const [shiftSearchQuery, setShiftSearchQuery] = useState('');
  const dropdownRef = useRef(null);

  const [allCalls, setAllCalls] = useState([]);
  const [allLogs, setAllLogs] = useState([]);
  const [allPerf, setAllPerf] = useState([]);
  const [allExpenses, setAllExpenses] = useState([]);
  const [loading, setLoading] = useState(true);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsShiftDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const shiftOptions = useMemo(() => {
    const options = [];
    if (user?.role === 'SuperAdmin') {
      options.push({ value: 'all', label: 'جميع الورديات (الكل)' });
    }
    shifts.forEach(s => options.push({ value: s.id.toString(), label: s.name }));
    return options.filter(opt => opt.label.toLowerCase().includes(shiftSearchQuery.toLowerCase()));
  }, [shifts, user, shiftSearchQuery]);

  const selectedShiftLabel = useMemo(() => {
    if (selectedShift === 'all') return 'جميع الورديات (الكل)';
    const s = shifts.find(x => x.id.toString() === selectedShift);
    return s ? s.name : 'اختر الوردية';
  }, [selectedShift, shifts]);

  useEffect(() => {
    document.title = "تحميل التقارير الشاملة | مخصوص";
    const fetchData = async () => {
      try {
        setLoading(true);
        const [resData, resShifts] = await Promise.all([
          api.get('/data/admin/all'),
          api.get('/shifts')
        ]);

        const { calls, inactivity, performance, expenses } = resData.data;
        setAllCalls(calls || []);

        // Map inactivity logs to include userName if User object exists
        const mappedLogs = (inactivity || []).map(log => ({
          ...log,
          userName: log.User ? (log.User.fullName || log.User.username) : 'غير معروف'
        }));
        setAllLogs(mappedLogs);

        setAllPerf(performance || []);
        setAllExpenses(expenses || []);

        const fetchedShifts = resShifts.data || [];
        let allowedShifts = [];
        if (user?.role === 'SuperAdmin') {
          allowedShifts = fetchedShifts;
        } else {
          allowedShifts = fetchedShifts.filter(s => s.Users && s.Users.some(u => u.id === user.id));
        }
        setShifts(allowedShifts);
        if (allowedShifts.length > 0) {
          setSelectedShift(user?.role === 'SuperAdmin' ? 'all' : allowedShifts[0].id.toString());
        }
      } catch (err) {
        showToast('فشل في تحميل البيانات من قاعدة البيانات', 'error');
      } finally {
        setLoading(false);
      }
    };
    if (user) {
      fetchData();
    }
  }, [showToast, user]);

  const previewData = useMemo(() => {
    let shiftUserIds = null;
    if (selectedShift !== 'all') {
      const shiftObj = shifts.find(s => s.id.toString() === selectedShift);
      if (shiftObj && shiftObj.Users) {
        shiftUserIds = shiftObj.Users.map(u => u.id);
      }
    }

    const finalFilters = { timeFilter, customStartDate, customEndDate, supervisorFilter: 'all', searchQuery: '', sortBy: 'date_desc' };

    if (timeFilter === 'custom' && (!customStartDate || !customEndDate)) {
      return { callsCount: 0, logsCount: 0, perfCount: 0, expCount: 0, filteredCalls: [], filteredLogs: [], filteredPerf: [], filteredExpenses: [] };
    }

    let filteredCalls = applyFiltersAndSort(allCalls, finalFilters, false);
    let filteredLogs = applyFiltersAndSort(allLogs, finalFilters, true);

    const mapDateForPerf = allPerf.map(l => ({ ...l, createdAt: l.createdAt || parseArabicDate(l.date) }));
    let filteredPerf = applyFiltersAndSort(mapDateForPerf, finalFilters, true);

    const mapDateForExp = allExpenses.map(l => ({ ...l, createdAt: l.createdAt || parseArabicDate(l.date) }));
    let filteredExpenses = applyFiltersAndSort(mapDateForExp, finalFilters, true);

    if (shiftUserIds) {
      filteredCalls = filteredCalls.filter(c => shiftUserIds.includes(c.userId));
      filteredLogs = filteredLogs.filter(c => shiftUserIds.includes(c.userId));
      filteredPerf = filteredPerf.filter(c => shiftUserIds.includes(c.userId));
      filteredExpenses = filteredExpenses.filter(c => shiftUserIds.includes(c.userId));
    }

    return {
      callsCount: filteredCalls.length,
      logsCount: filteredLogs.length,
      perfCount: filteredPerf.length,
      expCount: filteredExpenses.length,
      filteredCalls,
      filteredLogs,
      filteredPerf,
      filteredExpenses
    };
  }, [allCalls, allLogs, allPerf, allExpenses, timeFilter, customStartDate, customEndDate, selectedShift, shifts]);

  const handleExport = () => {
    if (timeFilter === 'custom' && (!customStartDate || !customEndDate)) {
      showToast('يجب تحديد تاريخ البداية والنهاية', 'error');
      return;
    }
    exportAdminData(exportType, previewData.filteredCalls, previewData.filteredLogs, previewData.filteredPerf, previewData.filteredExpenses);
  };

  return (
    <AdminGuard>
      <div className="home-container" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <header className="page-header" style={{ justifyContent: 'center', textAlign: 'center', width: '100%' }}>
          <div className="page-title-wrapper">
            <DownloadCloud size={28} className="title-icon text-blue" />
            <h1 className="page-title gradient-title">تصدير التقارير الشاملة</h1>
          </div>
        </header>

        {loading ? (
          <div className="dashboard-card" style={{ maxWidth: '1200px', width: '100%', margin: '2rem auto', padding: '5rem 2rem', textAlign: 'center' }}>
            <Loader2 className="spinning text-blue mx-auto" size={48} style={{ marginBottom: '1rem' }} />
            <h3 style={{ color: 'var(--text-secondary)' }}>جاري جلب البيانات من قاعدة البيانات...</h3>
          </div>
        ) : (
          <div className="dashboard-card" style={{ maxWidth: '1200px', width: '100%', margin: '2rem auto', padding: '3rem 2rem' }}>

            <h3 style={{ color: 'var(--text-primary)', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ width: '30px', height: '30px', borderRadius: '50%', background: 'rgba(34, 197, 94, 0.1)', color: '#22c55e', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>1</span>
              اختر الفترة الزمنية
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
              {['all', 'today', 'yesterday', 'week', 'month', 'custom'].map(type => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setTimeFilter(type)}
                  style={{
                    padding: '1rem',
                    borderRadius: '16px',
                    border: `2px solid ${timeFilter === type ? 'var(--theme-color)' : 'rgba(255,255,255,0.1)'}`,
                    backgroundColor: timeFilter === type ? 'var(--theme-color)' : 'rgba(0,0,0,0.2)',
                    color: timeFilter === type ? 'var(--btn-text-color, #ffffff)' : 'var(--text-secondary)',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    transform: timeFilter === type ? 'translateY(-2px)' : 'none',
                    boxShadow: timeFilter === type ? '0 10px 25px -5px rgba(59, 130, 246, 0.5)' : 'none',
                    gridColumn: type === 'custom' ? '1 / -1' : 'auto'
                  }}
                >
                  {type === 'all' && 'الكل (جميع الأيام)'}
                  {type === 'today' && 'اليوم'}
                  {type === 'yesterday' && 'الأمس'}
                  {type === 'week' && 'آخر 7 أيام'}
                  {type === 'month' && 'هذا الشهر'}
                  {type === 'custom' && 'فترة مخصصة (من - إلى)'}
                </button>
              ))}
            </div>

            {timeFilter === 'custom' && (
              <div style={{ display: 'flex', gap: '1.5rem', marginBottom: '2rem', background: 'rgba(0,0,0,0.2)', padding: '1.5rem', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)', animation: 'fadeIn 0.3s ease-out' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', marginBottom: '0.8rem', color: 'var(--text-secondary)', fontWeight: 'bold' }}>من تاريخ:</label>
                  <input
                    type="date"
                    value={customStartDate}
                    onChange={e => setCustomStartDate(e.target.value)}
                    className="search-input"
                    style={{ width: '100%', padding: '1rem', fontSize: '1rem' }}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', marginBottom: '0.8rem', color: 'var(--text-secondary)', fontWeight: 'bold' }}>إلى تاريخ:</label>
                  <input
                    type="date"
                    value={customEndDate}
                    onChange={e => setCustomEndDate(e.target.value)}
                    className="search-input"
                    style={{ width: '100%', padding: '1rem', fontSize: '1rem' }}
                  />
                </div>
              </div>
            )}

            <hr style={{ border: 'none', borderTop: '1px solid rgba(255,255,255,0.1)', margin: '2.5rem 0' }} />

            <h3 style={{ color: 'var(--text-primary)', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ width: '30px', height: '30px', borderRadius: '50%', background: 'rgba(34, 197, 94, 0.1)', color: '#22c55e', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>2</span>
              اختر الوردية
            </h3>
            <div style={{ marginBottom: '2.5rem', position: 'relative' }} ref={dropdownRef}>
              <div
                onClick={() => setIsShiftDropdownOpen(!isShiftDropdownOpen)}
                className="search-input"
                style={{
                  width: '100%', padding: '1rem', fontSize: '1.1rem', borderRadius: '12px',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  cursor: 'pointer', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)'
                }}
              >
                <span style={{ color: 'var(--text-primary)' }}>{selectedShiftLabel}</span>
                <ChevronDown size={20} style={{ color: 'var(--text-secondary)', transform: isShiftDropdownOpen ? 'rotate(180deg)' : 'rotate(0)', transition: '0.3s' }} />
              </div>

              {isShiftDropdownOpen && (
                <div style={{
                  position: 'absolute', top: '100%', left: 0, right: 0, marginTop: '0.5rem',
                  background: 'var(--card-bg, #1e293b)', borderRadius: '12px', padding: '0.5rem',
                  boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5)', zIndex: 50, border: '1px solid rgba(255,255,255,0.1)',
                  animation: 'fadeIn 0.2s ease-out'
                }}>
                  <div style={{ position: 'relative', marginBottom: '0.5rem' }}>
                    <Search size={18} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
                    <input
                      type="text"
                      placeholder="ابحث عن وردية..."
                      value={shiftSearchQuery}
                      onChange={(e) => setShiftSearchQuery(e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                      className="search-input"
                      style={{ width: '100%', padding: '0.6rem 2rem 0.6rem 0.8rem', borderRadius: '8px', fontSize: '0.95rem' }}
                    />
                  </div>
                  <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                    {shiftOptions.length > 0 ? shiftOptions.map(opt => (
                      <div
                        key={opt.value}
                        onClick={() => {
                          setSelectedShift(opt.value);
                          setIsShiftDropdownOpen(false);
                          setShiftSearchQuery('');
                        }}
                        style={{
                          padding: '0.8rem 1rem', borderRadius: '8px', cursor: 'pointer',
                          background: selectedShift === opt.value ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
                          color: selectedShift === opt.value ? 'var(--theme-color)' : 'var(--text-primary)',
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                          transition: 'background 0.2s'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                        onMouseLeave={(e) => e.currentTarget.style.background = selectedShift === opt.value ? 'rgba(59, 130, 246, 0.1)' : 'transparent'}
                      >
                        <span>{opt.label}</span>
                        {selectedShift === opt.value && <Check size={18} />}
                      </div>
                    )) : (
                      <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--text-secondary)' }}>لا توجد نتائج</div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Data Preview Banner */}
            <div style={{
              padding: '1.5rem', borderRadius: '16px', border: '1px solid rgba(59, 130, 246, 0.2)',
              alignItems: 'center', flexWrap: 'wrap'
            }}>
              <Info size={32} color="var(--theme-color)" style={{ flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <h4 style={{ color: 'var(--text-primary)', margin: '0 0 0.8rem 0', fontSize: '1.1rem' }}>البيانات المتاحة للتحميل في هذه الفترة:</h4>
                <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', color: 'var(--text-primary)', fontSize: '1.05rem' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(0,0,0,0.2)', padding: '0.5rem 1rem', borderRadius: '100px', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <PhoneCall size={18} color="var(--theme-color)" />
                    <strong>{previewData.callsCount}</strong> مكالمة
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(0,0,0,0.2)', padding: '0.5rem 1rem', borderRadius: '100px', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <Activity size={18} color="#a855f7" />
                    <strong>{previewData.logsCount}</strong> فترة خمول/راحة
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(0,0,0,0.2)', padding: '0.5rem 1rem', borderRadius: '100px', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <ClipboardList size={18} color="#22c55e" />
                    <strong>{previewData.perfCount}</strong> تقرير أداء
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(0,0,0,0.2)', padding: '0.5rem 1rem', borderRadius: '100px', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <FileSpreadsheet size={18} color="#ef4444" />
                    <strong>{previewData.expCount}</strong> استخدام للمصروفات/السلف
                  </span>
                </div>
              </div>
            </div>

            <hr style={{ border: 'none', borderTop: '1px solid rgba(255,255,255,0.1)', margin: '2.5rem 0' }} />

            <h3 style={{ color: 'var(--text-primary)', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ width: '30px', height: '30px', borderRadius: '50%', background: 'rgba(34, 197, 94, 0.1)', color: '#22c55e', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>3</span>
              اختر نوع الملف
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem', marginBottom: '3rem' }}>

              <label style={{
                display: 'flex', alignItems: 'center', gap: '1.5rem', padding: '1.5rem',
                border: `2px solid ${exportType === 'all_zip' ? 'var(--theme-color)' : 'rgba(255,255,255,0.1)'}`,
                borderRadius: '16px', cursor: 'pointer', background: 'rgba(0,0,0,0.2)', transition: 'all 0.3s',
                transform: exportType === 'all_zip' ? 'translateY(-2px)' : 'none',
                boxShadow: exportType === 'all_zip' ? '0 10px 25px -5px rgba(59, 130, 246, 0.2)' : 'none'
              }}>
                <input
                  type="radio"
                  name="adminExportType"
                  value="all_zip"
                  checked={exportType === 'all_zip'}
                  onChange={() => setExportType('all_zip')}
                  style={{ accentColor: 'var(--theme-color)', width: '22px', height: '22px' }}
                />
                <div style={{ background: exportType === 'all_zip' ? 'rgba(59, 130, 246, 0.2)' : 'rgba(255,255,255,0.05)', padding: '1rem', borderRadius: '12px', transition: 'all 0.3s' }}>
                  <Archive size={32} color={exportType === 'all_zip' ? 'var(--theme-color)' : 'var(--text-secondary)'} />
                </div>
                <div style={{ flex: 1 }}>
                  <h4 style={{ color: 'var(--text-primary)', margin: 0, fontSize: '1.1rem' }}>تحميل كل السجلات (ZIP)</h4>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: '6px 0 0 0', lineHeight: '1.4' }}>تحميل جميع السجلات الثلاثة معاً في ملف مضغوط واحد.</p>
                </div>
              </label>

              <label style={{
                display: 'flex', alignItems: 'center', gap: '1.5rem', padding: '1.5rem',
                border: `2px solid ${exportType === 'calls_only' ? 'var(--theme-color)' : 'rgba(255,255,255,0.1)'}`,
                borderRadius: '16px', cursor: 'pointer', background: 'rgba(0,0,0,0.2)', transition: 'all 0.3s',
                transform: exportType === 'calls_only' ? 'translateY(-2px)' : 'none',
                boxShadow: exportType === 'calls_only' ? '0 10px 25px -5px rgba(59, 130, 246, 0.2)' : 'none'
              }}>
                <input
                  type="radio"
                  name="adminExportType"
                  value="calls_only"
                  checked={exportType === 'calls_only'}
                  onChange={() => setExportType('calls_only')}
                  style={{ accentColor: 'var(--theme-color)', width: '22px', height: '22px' }}
                />
                <div style={{ background: exportType === 'calls_only' ? 'rgba(59, 130, 246, 0.2)' : 'rgba(255,255,255,0.05)', padding: '1rem', borderRadius: '12px', transition: 'all 0.3s' }}>
                  <PhoneCall size={32} color={exportType === 'calls_only' ? 'var(--theme-color)' : 'var(--text-secondary)'} />
                </div>
                <div style={{ flex: 1 }}>
                  <h4 style={{ color: 'var(--text-primary)', margin: 0, fontSize: '1.1rem' }}>سجل المكالمات (Excel)</h4>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: '6px 0 0 0', lineHeight: '1.4' }}>تحميل مكالمات المندوبين المجمعة فقط.</p>
                </div>
              </label>

              <label style={{
                display: 'flex', alignItems: 'center', gap: '1.5rem', padding: '1.5rem',
                border: `2px solid ${exportType === 'logs_only' ? 'var(--theme-color)' : 'rgba(255,255,255,0.1)'}`,
                borderRadius: '16px', cursor: 'pointer', background: 'rgba(0,0,0,0.2)', transition: 'all 0.3s',
                transform: exportType === 'logs_only' ? 'translateY(-2px)' : 'none',
                boxShadow: exportType === 'logs_only' ? '0 10px 25px -5px rgba(59, 130, 246, 0.2)' : 'none'
              }}>
                <input
                  type="radio"
                  name="adminExportType"
                  value="logs_only"
                  checked={exportType === 'logs_only'}
                  onChange={() => setExportType('logs_only')}
                  style={{ accentColor: 'var(--theme-color)', width: '22px', height: '22px' }}
                />
                <div style={{ background: exportType === 'logs_only' ? 'rgba(59, 130, 246, 0.2)' : 'rgba(255,255,255,0.05)', padding: '1rem', borderRadius: '12px', transition: 'all 0.3s' }}>
                  <Activity size={32} color={exportType === 'logs_only' ? 'var(--theme-color)' : 'var(--text-secondary)'} />
                </div>
                <div style={{ flex: 1 }}>
                  <h4 style={{ color: 'var(--text-primary)', margin: 0, fontSize: '1.1rem' }}>سجل النشاط والخمول (Excel)</h4>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: '6px 0 0 0', lineHeight: '1.4' }}>تحميل فترات خمول وراحة المندوبين المجمعة فقط.</p>
                </div>
              </label>

              <label style={{
                display: 'flex', alignItems: 'center', gap: '1.5rem', padding: '1.5rem',
                border: `2px solid ${exportType === 'perf_only' ? 'var(--theme-color)' : 'rgba(255,255,255,0.1)'}`,
                borderRadius: '16px', cursor: 'pointer', background: 'rgba(0,0,0,0.2)', transition: 'all 0.3s',
                transform: exportType === 'perf_only' ? 'translateY(-2px)' : 'none',
                boxShadow: exportType === 'perf_only' ? '0 10px 25px -5px rgba(59, 130, 246, 0.2)' : 'none'
              }}>
                <input
                  type="radio"
                  name="adminExportType"
                  value="perf_only"
                  checked={exportType === 'perf_only'}
                  onChange={() => setExportType('perf_only')}
                  style={{ accentColor: 'var(--theme-color)', width: '22px', height: '22px' }}
                />
                <div style={{ background: exportType === 'perf_only' ? 'rgba(59, 130, 246, 0.2)' : 'rgba(255,255,255,0.05)', padding: '1rem', borderRadius: '12px', transition: 'all 0.3s' }}>
                  <ClipboardList size={32} color={exportType === 'perf_only' ? 'var(--theme-color)' : 'var(--text-secondary)'} />
                </div>
                <div style={{ flex: 1 }}>
                  <h4 style={{ color: 'var(--text-primary)', margin: 0, fontSize: '1.1rem' }}>سجل المهام (Excel)</h4>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: '6px 0 0 0', lineHeight: '1.4' }}>تحميل تقارير مهام المشرفين المجمعة فقط.</p>
                </div>
              </label>

              <label style={{
                display: 'flex', alignItems: 'center', gap: '1.5rem', padding: '1.5rem',
                border: `2px solid ${exportType === 'expenses_only' ? 'var(--theme-color)' : 'rgba(255,255,255,0.1)'}`,
                borderRadius: '16px', cursor: 'pointer', background: 'rgba(0,0,0,0.2)', transition: 'all 0.3s',
                transform: exportType === 'expenses_only' ? 'translateY(-2px)' : 'none',
                boxShadow: exportType === 'expenses_only' ? '0 10px 25px -5px rgba(59, 130, 246, 0.2)' : 'none'
              }}>
                <input
                  type="radio"
                  name="adminExportType"
                  value="expenses_only"
                  checked={exportType === 'expenses_only'}
                  onChange={() => setExportType('expenses_only')}
                  style={{ accentColor: 'var(--theme-color)', width: '22px', height: '22px' }}
                />
                <div style={{ background: exportType === 'expenses_only' ? 'rgba(59, 130, 246, 0.2)' : 'rgba(255,255,255,0.05)', padding: '1rem', borderRadius: '12px', transition: 'all 0.3s' }}>
                  <FileSpreadsheet size={32} color={exportType === 'expenses_only' ? 'var(--theme-color)' : 'var(--text-secondary)'} />
                </div>
                <div style={{ flex: 1 }}>
                  <h4 style={{ color: 'var(--text-primary)', margin: 0, fontSize: '1.1rem' }}>سجل المصروفات (Excel)</h4>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: '6px 0 0 0', lineHeight: '1.4' }}>تحميل تقارير المصروفات والسلف المجمعة فقط.</p>
                </div>
              </label>
            </div>

            <button
              className="btn-save"
              onClick={handleExport}
              disabled={previewData.callsCount === 0 && previewData.logsCount === 0 && previewData.perfCount === 0 && previewData.expCount === 0}
              style={{
                width: '100%',
                padding: '1.2rem',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                gap: '0.8rem',
                fontSize: '1.2rem',
                fontWeight: 'bold',
                borderRadius: '16px',
                backgroundColor: previewData.callsCount === 0 && previewData.logsCount === 0 && previewData.perfCount === 0 ? 'rgba(255,255,255,0.1)' : '#22c55e',
                color: previewData.callsCount === 0 && previewData.logsCount === 0 && previewData.perfCount === 0 ? 'rgba(255,255,255,0.3)' : 'white',
                boxShadow: previewData.callsCount === 0 && previewData.logsCount === 0 && previewData.perfCount === 0 ? 'none' : '0 10px 25px -5px rgba(34, 197, 94, 0.5)',
                cursor: previewData.callsCount === 0 && previewData.logsCount === 0 && previewData.perfCount === 0 ? 'not-allowed' : 'pointer'
              }}
            >
              <FileSpreadsheet size={28} />
              {previewData.callsCount === 0 && previewData.logsCount === 0 && previewData.perfCount === 0 ? 'لا توجد بيانات للتحميل' : 'بدء التحميل الآن'}
            </button>
          </div>
        )}
      </div>
    </AdminGuard>
  );
};

export default HandleAdminExport;
