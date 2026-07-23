import './HandleAdminExport.scss';
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
  const [exportType, setExportType] = useState('summary_calls');
  const [reportDetailLevel, setReportDetailLevel] = useState('summary');
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
  const [allAttendance, setAllAttendance] = useState([]);
  const [allAdvances, setAllAdvances] = useState([]);
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

        const { calls, inactivity, performance, expenses, attendanceLogs, advances } = resData.data;
        setAllCalls(calls || []);

        // Map inactivity logs to include userName if User object exists
        const mappedLogs = (inactivity || []).map(log => ({
          ...log,
          userName: log.User ? (log.User.fullName || log.User.username) : 'غير معروف'
        }));
        setAllLogs(mappedLogs);

        setAllPerf(performance || []);
        setAllExpenses(expenses || []);
        setAllAttendance(attendanceLogs || []);
        setAllAdvances(advances || []);

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
      return { callsCount: 0, logsCount: 0, perfCount: 0, expCount: 0, attendanceCount: 0, filteredCalls: [], filteredLogs: [], filteredPerf: [], filteredExpenses: [], filteredAttendance: [] };
    }

    let filteredCalls = applyFiltersAndSort(allCalls, finalFilters, false);
    let filteredLogs = applyFiltersAndSort(allLogs, finalFilters, true);

    const mapDateForPerf = allPerf.map(l => ({ ...l, createdAt: l.createdAt || parseArabicDate(l.date) }));
    let filteredPerf = applyFiltersAndSort(mapDateForPerf, finalFilters, true);

    const mapDateForExp = allExpenses.map(l => ({ ...l, createdAt: l.createdAt || parseArabicDate(l.date) }));
    let filteredExpenses = applyFiltersAndSort(mapDateForExp, finalFilters, true);

    const mapDateForAttendance = allAttendance.map(l => ({ ...l, createdAt: l.date ? new Date(l.date).getTime() : new Date(l.checkInTime).getTime() }));
    let filteredAttendance = applyFiltersAndSort(mapDateForAttendance, finalFilters, true);

    const mapDateForAdvances = allAdvances.map(l => ({ ...l, createdAt: new Date(l.createdAt).getTime() }));
    let filteredAdvances = applyFiltersAndSort(mapDateForAdvances, finalFilters, true);

    if (shiftUserIds) {
      filteredCalls = filteredCalls.filter(c => shiftUserIds.includes(c.userId));
      filteredLogs = filteredLogs.filter(c => shiftUserIds.includes(c.userId));
      filteredPerf = filteredPerf.filter(c => shiftUserIds.includes(c.userId));
      filteredExpenses = filteredExpenses.filter(c => shiftUserIds.includes(c.userId));
      filteredAttendance = filteredAttendance.filter(c => shiftUserIds.includes(c.userId));
      filteredAdvances = filteredAdvances.filter(c => shiftUserIds.includes(c.userId));
    }

    return {
      callsCount: filteredCalls.length,
      logsCount: filteredLogs.length,
      perfCount: filteredPerf.length,
      expCount: filteredExpenses.length,
      attendanceCount: filteredAttendance.length,
      advancesCount: filteredAdvances.length,
      filteredCalls,
      filteredLogs,
      filteredPerf,
      filteredExpenses,
      filteredAttendance,
      filteredAdvances
    };
  }, [allCalls, allLogs, allPerf, allExpenses, allAttendance, timeFilter, customStartDate, customEndDate, selectedShift, shifts]);

  const handleExport = () => {
    if (timeFilter === 'custom' && (!customStartDate || !customEndDate)) {
      showToast('يجب تحديد تاريخ البداية والنهاية', 'error');
      return;
    }
    exportAdminData(exportType, previewData.filteredCalls, previewData.filteredLogs, previewData.filteredPerf, previewData.filteredExpenses, previewData.filteredAttendance, previewData.filteredAdvances, null, reportDetailLevel);
  };

  return (
    <AdminGuard>
      <div className="home-container handleadminexport-style-1" >
        <header className="page-header handleadminexport-style-2" >
          <div className="page-title-wrapper">
            <DownloadCloud size={28} className="title-icon text-blue" />
            <h1 className="page-title gradient-title">تصدير التقارير الشاملة</h1>
          </div>
        </header>

        {loading ? (
          <div className="dashboard-card handleadminexport-style-3" >
            <Loader2 className="spinning text-blue mx-auto handleadminexport-style-4" size={48}  />
            <h3 className="handleadminexport-style-5">جاري جلب البيانات من قاعدة البيانات...</h3>
          </div>
        ) : (
          <div className="dashboard-card handleadminexport-style-6" >

            <h3 className="handleadminexport-style-7">
              <span className="handleadminexport-style-8">1</span>
              اختر الفترة الزمنية
            </h3>

            <div className="handleadminexport-style-9">
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
              <div className="handleadminexport-style-10">
                <div className="handleadminexport-style-11">
                  <label className="handleadminexport-style-12">من تاريخ:</label>
                  <input
                    type="date"
                    value={customStartDate}
                    onChange={e => setCustomStartDate(e.target.value)}
                    className="search-input handleadminexport-style-13"
                    
                  />
                </div>
                <div className="handleadminexport-style-14">
                  <label className="handleadminexport-style-15">إلى تاريخ:</label>
                  <input
                    type="date"
                    value={customEndDate}
                    onChange={e => setCustomEndDate(e.target.value)}
                    className="search-input handleadminexport-style-16"
                    
                  />
                </div>
              </div>
            )}

            <hr className="handleadminexport-style-17" />

            <h3 className="handleadminexport-style-18">
              <span className="handleadminexport-style-19">2</span>
              اختر الوردية
            </h3>
            <div className="handleadminexport-style-20" ref={dropdownRef}>
              <div
                onClick={() => setIsShiftDropdownOpen(!isShiftDropdownOpen)}
                className="search-input handleadminexport-style-21"
                
              >
                <span className="handleadminexport-style-22">{selectedShiftLabel}</span>
                <ChevronDown size={20} style={{ color: 'var(--text-secondary)', transform: isShiftDropdownOpen ? 'rotate(180deg)' : 'rotate(0)', transition: '0.3s' }} />
              </div>

              {isShiftDropdownOpen && (
                <div className="handleadminexport-style-23">
                  <div className="handleadminexport-style-24">
                    <Search size={18} className="handleadminexport-style-25" />
                    <input
                      type="text"
                      placeholder="ابحث عن وردية..."
                      value={shiftSearchQuery}
                      onChange={(e) => setShiftSearchQuery(e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                      className="search-input handleadminexport-style-26"
                      
                    />
                  </div>
                  <div className="handleadminexport-style-27">
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
                      <div className="handleadminexport-style-28">لا توجد نتائج</div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Data Preview Banner */}
            <div className="handleadminexport-style-29">
              <Info size={32} color="var(--theme-color)" className="handleadminexport-style-30" />
              <div className="handleadminexport-style-31">
                <h4 className="handleadminexport-style-32">البيانات المتاحة للتحميل في هذه الفترة:</h4>
                <div className="handleadminexport-style-33">
                  <span className="handleadminexport-style-34">
                    <PhoneCall size={18} color="var(--theme-color)" />
                    <strong>{previewData.callsCount}</strong> مكالمة
                  </span>
                  <span className="handleadminexport-style-35">
                    <Activity size={18} color="#a855f7" />
                    <strong>{previewData.logsCount}</strong> فترة خمول/راحة
                  </span>
                  <span className="handleadminexport-style-36">
                    <ClipboardList size={18} color="#22c55e" />
                    <strong>{previewData.perfCount}</strong> تقرير أداء
                  </span>
                  <span className="handleadminexport-style-37">
                    <FileSpreadsheet size={18} color="#ef4444" />
                    <strong>{previewData.expCount}</strong> استخدام للمصروفات/السلف
                  </span>
                  <span className="handleadminexport-style-38">
                    <Check size={18} color="#0ea5e9" />
                    <strong>{previewData.attendanceCount}</strong> سجل حضور وانصراف
                  </span>
                </div>
              </div>
            </div>

            <hr className="handleadminexport-style-39" />

            <div className="handleadminexport-style-40">
              <h3 className="handleadminexport-style-41">
                <span className="handleadminexport-style-42">3</span>
                اختر نوع الملف
              </h3>

              <div className="handleadminexport-style-43">
                <button
                  onClick={() => { setReportDetailLevel('detailed'); setExportType('all_zip'); }}
                  style={{
                    padding: '0.6rem 1.2rem',
                    borderRadius: '8px',
                    border: 'none',
                    background: reportDetailLevel === 'detailed' ? 'var(--theme-color)' : 'transparent',
                    color: reportDetailLevel === 'detailed' ? 'white' : 'var(--text-secondary)',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    transition: 'all 0.3s',
                    boxShadow: reportDetailLevel === 'detailed' ? '0 4px 10px rgba(59, 130, 246, 0.3)' : 'none'
                  }}
                >
                  تقرير مفصل
                </button>
                <button
                  onClick={() => { setReportDetailLevel('summary'); setExportType('summary_calls'); }}
                  style={{
                    padding: '0.6rem 1.2rem',
                    borderRadius: '8px',
                    border: 'none',
                    background: reportDetailLevel === 'summary' ? 'var(--theme-color)' : 'transparent',
                    color: reportDetailLevel === 'summary' ? 'white' : 'var(--text-secondary)',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    transition: 'all 0.3s',
                    boxShadow: reportDetailLevel === 'summary' ? '0 4px 10px rgba(59, 130, 246, 0.3)' : 'none'
                  }}
                >
                  تقرير ملخص
                </button>
              </div>
            </div>

            <div className="handleadminexport-style-44">
              {reportDetailLevel === 'detailed' ? (
                <>
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
                      className="handleadminexport-style-45"
                    />
                    <div style={{ background: exportType === 'all_zip' ? 'rgba(59, 130, 246, 0.2)' : 'rgba(255,255,255,0.05)', padding: '1rem', borderRadius: '12px', transition: 'all 0.3s' }}>
                      <Archive size={32} color={exportType === 'all_zip' ? 'var(--theme-color)' : 'var(--text-secondary)'} />
                    </div>
                    <div className="handleadminexport-style-46">
                      <h4 className="handleadminexport-style-47">تحميل كل السجلات (ZIP)</h4>
                      <p className="handleadminexport-style-48">تحميل جميع السجلات الثلاثة معاً في ملف مضغوط واحد.</p>
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
                      className="handleadminexport-style-49"
                    />
                    <div style={{ background: exportType === 'calls_only' ? 'rgba(59, 130, 246, 0.2)' : 'rgba(255,255,255,0.05)', padding: '1rem', borderRadius: '12px', transition: 'all 0.3s' }}>
                      <PhoneCall size={32} color={exportType === 'calls_only' ? 'var(--theme-color)' : 'var(--text-secondary)'} />
                    </div>
                    <div className="handleadminexport-style-50">
                      <h4 className="handleadminexport-style-51">سجل المكالمات (Excel)</h4>
                      <p className="handleadminexport-style-52">تحميل مكالمات المندوبين المجمعة فقط.</p>
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
                      className="handleadminexport-style-53"
                    />
                    <div style={{ background: exportType === 'logs_only' ? 'rgba(59, 130, 246, 0.2)' : 'rgba(255,255,255,0.05)', padding: '1rem', borderRadius: '12px', transition: 'all 0.3s' }}>
                      <Activity size={32} color={exportType === 'logs_only' ? 'var(--theme-color)' : 'var(--text-secondary)'} />
                    </div>
                    <div className="handleadminexport-style-54">
                      <h4 className="handleadminexport-style-55">سجل النشاط والخمول (Excel)</h4>
                      <p className="handleadminexport-style-56">تحميل فترات خمول وراحة المندوبين المجمعة فقط.</p>
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
                      className="handleadminexport-style-57"
                    />
                    <div style={{ background: exportType === 'perf_only' ? 'rgba(59, 130, 246, 0.2)' : 'rgba(255,255,255,0.05)', padding: '1rem', borderRadius: '12px', transition: 'all 0.3s' }}>
                      <ClipboardList size={32} color={exportType === 'perf_only' ? 'var(--theme-color)' : 'var(--text-secondary)'} />
                    </div>
                    <div className="handleadminexport-style-58">
                      <h4 className="handleadminexport-style-59">سجل المهام (Excel)</h4>
                      <p className="handleadminexport-style-60">تحميل تقارير مهام المشرفين المجمعة فقط.</p>
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
                      className="handleadminexport-style-61"
                    />
                    <div style={{ background: exportType === 'expenses_only' ? 'rgba(59, 130, 246, 0.2)' : 'rgba(255,255,255,0.05)', padding: '1rem', borderRadius: '12px', transition: 'all 0.3s' }}>
                      <FileSpreadsheet size={32} color={exportType === 'expenses_only' ? 'var(--theme-color)' : 'var(--text-secondary)'} />
                    </div>
                    <div className="handleadminexport-style-62">
                      <h4 className="handleadminexport-style-63">سجل المصروفات (Excel)</h4>
                      <p className="handleadminexport-style-64">تحميل تقارير المصروفات والسلف المجمعة فقط.</p>
                    </div>
                  </label>

                  <label style={{
                    display: 'flex', alignItems: 'center', gap: '1.5rem', padding: '1.5rem',
                    border: `2px solid ${exportType === 'attendance_only' ? 'var(--theme-color)' : 'rgba(255,255,255,0.1)'}`,
                    borderRadius: '16px', cursor: 'pointer', background: 'rgba(0,0,0,0.2)', transition: 'all 0.3s',
                    transform: exportType === 'attendance_only' ? 'translateY(-2px)' : 'none',
                    boxShadow: exportType === 'attendance_only' ? '0 10px 25px -5px rgba(59, 130, 246, 0.2)' : 'none'
                  }}>
                    <input
                      type="radio"
                      name="adminExportType"
                      value="attendance_only"
                      checked={exportType === 'attendance_only'}
                      onChange={() => setExportType('attendance_only')}
                      className="handleadminexport-style-65"
                    />
                    <div style={{ background: exportType === 'attendance_only' ? 'rgba(59, 130, 246, 0.2)' : 'rgba(255,255,255,0.05)', padding: '1rem', borderRadius: '12px', transition: 'all 0.3s' }}>
                      <Check size={32} color={exportType === 'attendance_only' ? 'var(--theme-color)' : 'var(--text-secondary)'} />
                    </div>
                    <div className="handleadminexport-style-66">
                      <h4 className="handleadminexport-style-67">سجل الحضور والانصراف (Excel)</h4>
                      <p className="handleadminexport-style-68">تحميل تقارير الحضور والانصراف المجمعة فقط.</p>
                    </div>
                  </label>
                </>
              ) : (
                <>
                  <label style={{
                    display: 'flex', alignItems: 'center', gap: '1.5rem', padding: '1.5rem',
                    border: `2px solid ${exportType === 'summary_calls' ? 'var(--theme-color)' : 'rgba(255,255,255,0.1)'}`,
                    borderRadius: '16px', cursor: 'pointer', background: 'rgba(0,0,0,0.2)', transition: 'all 0.3s',
                    transform: exportType === 'summary_calls' ? 'translateY(-2px)' : 'none',
                    boxShadow: exportType === 'summary_calls' ? '0 10px 25px -5px rgba(59, 130, 246, 0.2)' : 'none'
                  }}>
                    <input
                      type="radio"
                      name="adminExportType"
                      value="summary_calls"
                      checked={exportType === 'summary_calls'}
                      onChange={() => setExportType('summary_calls')}
                      className="handleadminexport-style-69"
                    />
                    <div style={{ background: exportType === 'summary_calls' ? 'rgba(59, 130, 246, 0.2)' : 'rgba(255,255,255,0.05)', padding: '1rem', borderRadius: '12px', transition: 'all 0.3s' }}>
                      <PhoneCall size={32} color={exportType === 'summary_calls' ? 'var(--theme-color)' : 'var(--text-secondary)'} />
                    </div>
                    <div className="handleadminexport-style-70">
                      <h4 className="handleadminexport-style-71">ملخص سجل التواصل (Excel)</h4>
                      <p className="handleadminexport-style-72">تحميل تقرير ملخص عن أداء التواصل لكل مندوب.</p>
                    </div>
                  </label>

                  <label style={{
                    display: 'flex', alignItems: 'center', gap: '1.5rem', padding: '1.5rem',
                    border: `2px solid ${exportType === 'summary_attendance' ? 'var(--theme-color)' : 'rgba(255,255,255,0.1)'}`,
                    borderRadius: '16px', cursor: 'pointer', background: 'rgba(0,0,0,0.2)', transition: 'all 0.3s',
                    transform: exportType === 'summary_attendance' ? 'translateY(-2px)' : 'none',
                    boxShadow: exportType === 'summary_attendance' ? '0 10px 25px -5px rgba(59, 130, 246, 0.2)' : 'none'
                  }}>
                    <input
                      type="radio"
                      name="adminExportType"
                      value="summary_attendance"
                      checked={exportType === 'summary_attendance'}
                      onChange={() => setExportType('summary_attendance')}
                      className="handleadminexport-style-73"
                    />
                    <div style={{ background: exportType === 'summary_attendance' ? 'rgba(59, 130, 246, 0.2)' : 'rgba(255,255,255,0.05)', padding: '1rem', borderRadius: '12px', transition: 'all 0.3s' }}>
                      <Check size={32} color={exportType === 'summary_attendance' ? 'var(--theme-color)' : 'var(--text-secondary)'} />
                    </div>
                    <div className="handleadminexport-style-74">
                      <h4 className="handleadminexport-style-75">ملخص سجل الحضور (Excel)</h4>
                      <p className="handleadminexport-style-76">تحميل تقرير ملخص عن الحضور والانصراف لكل مندوب.</p>
                    </div>
                  </label>

                  <label style={{
                    display: 'flex', alignItems: 'center', gap: '1.5rem', padding: '1.5rem',
                    border: `2px solid ${exportType === 'summary_payroll' ? 'var(--theme-color)' : 'rgba(255,255,255,0.1)'}`,
                    borderRadius: '16px', cursor: 'pointer', background: 'rgba(0,0,0,0.2)', transition: 'all 0.3s',
                    transform: exportType === 'summary_payroll' ? 'translateY(-2px)' : 'none',
                    boxShadow: exportType === 'summary_payroll' ? '0 10px 25px -5px rgba(59, 130, 246, 0.2)' : 'none'
                  }}>
                    <input
                      type="radio"
                      name="adminExportType"
                      value="summary_payroll"
                      checked={exportType === 'summary_payroll'}
                      onChange={() => setExportType('summary_payroll')}
                      className="handleadminexport-style-77"
                    />
                    <div style={{ background: exportType === 'summary_payroll' ? 'rgba(59, 130, 246, 0.2)' : 'rgba(255,255,255,0.05)', padding: '1rem', borderRadius: '12px', transition: 'all 0.3s' }}>
                      <FileSpreadsheet size={32} color={exportType === 'summary_payroll' ? 'var(--theme-color)' : 'var(--text-secondary)'} />
                    </div>
                    <div className="handleadminexport-style-78">
                      <h4 className="handleadminexport-style-79">ملخص حساب المرتبات (Excel)</h4>
                      <p className="handleadminexport-style-80">تحميل تقرير شامل لساعات التأخير، الحضور، الإجازات، والغياب والسلف.</p>
                    </div>
                  </label>
                </>
              )}
            </div>

            <button
              className="btn-save"
              onClick={handleExport}
              disabled={previewData.callsCount === 0 && previewData.logsCount === 0 && previewData.perfCount === 0 && previewData.expCount === 0 && previewData.attendanceCount === 0}
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
                backgroundColor: previewData.callsCount === 0 && previewData.logsCount === 0 && previewData.perfCount === 0 && previewData.attendanceCount === 0 ? 'rgba(255,255,255,0.1)' : '#22c55e',
                color: previewData.callsCount === 0 && previewData.logsCount === 0 && previewData.perfCount === 0 && previewData.attendanceCount === 0 ? 'rgba(255,255,255,0.3)' : 'white',
                boxShadow: previewData.callsCount === 0 && previewData.logsCount === 0 && previewData.perfCount === 0 && previewData.attendanceCount === 0 ? 'none' : '0 10px 25px -5px rgba(34, 197, 94, 0.5)',
                cursor: previewData.callsCount === 0 && previewData.logsCount === 0 && previewData.perfCount === 0 && previewData.attendanceCount === 0 ? 'not-allowed' : 'pointer'
              }}
            >
              <FileSpreadsheet size={28} />
              {previewData.callsCount === 0 && previewData.logsCount === 0 && previewData.perfCount === 0 && previewData.attendanceCount === 0 ? 'لا توجد بيانات للتحميل' : 'بدء التحميل الآن'}
            </button>
          </div>
        )}
      </div>
    </AdminGuard>
  );
};

export default HandleAdminExport;
