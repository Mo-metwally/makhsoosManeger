import React, { useState, useEffect, useMemo } from 'react';
import { FileSpreadsheet, Archive, PhoneCall, Activity, ClipboardList, DownloadCloud, Info } from 'lucide-react';
import { exportAdminData } from '../utils/exportExcel';
import { applyFiltersAndSort, parseArabicDate } from '../utils/filterAndSort';
import AdminGuard from '../components/AdminGuard';

const HandleAdminExport = () => {
  const [exportType, setExportType] = useState('all_zip'); 
  const [timeFilter, setTimeFilter] = useState('all');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  const [allCalls, setAllCalls] = useState([]);
  const [allLogs, setAllLogs] = useState([]);
  const [allPerf, setAllPerf] = useState([]);

  useEffect(() => {
    document.title = "تحميل التقارير الشاملة | مخصوص";
    setAllCalls(JSON.parse(localStorage.getItem('admin_aggregated_calls') || '[]'));
    setAllLogs(JSON.parse(localStorage.getItem('admin_aggregated_logs') || '[]'));
    setAllPerf(JSON.parse(localStorage.getItem('admin_aggregated_performance') || '[]'));
  }, []);

  const previewData = useMemo(() => {
    const finalFilters = { timeFilter, customStartDate, customEndDate, supervisorFilter: 'all', searchQuery: '', sortBy: 'date_desc' };
    
    if (timeFilter === 'custom' && (!customStartDate || !customEndDate)) {
      return { callsCount: 0, logsCount: 0, perfCount: 0, filteredCalls: [], filteredLogs: [], filteredPerf: [] };
    }

    const filteredCalls = applyFiltersAndSort(allCalls, finalFilters, false);
    const filteredLogs = applyFiltersAndSort(allLogs, finalFilters, true);
    
    const mapDateForPerf = allPerf.map(l => ({ ...l, createdAt: l.createdAt || parseArabicDate(l.date) }));
    const filteredPerf = applyFiltersAndSort(mapDateForPerf, finalFilters, true);

    return {
      callsCount: filteredCalls.length,
      logsCount: filteredLogs.length,
      perfCount: filteredPerf.length,
      filteredCalls,
      filteredLogs,
      filteredPerf
    };
  }, [allCalls, allLogs, allPerf, timeFilter, customStartDate, customEndDate]);

  const handleExport = () => {
    if (timeFilter === 'custom' && (!customStartDate || !customEndDate)) {
      alert("يرجى اختيار تاريخ البداية والنهاية");
      return;
    }
    exportAdminData(exportType, previewData.filteredCalls, previewData.filteredLogs, previewData.filteredPerf);
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

          {/* Data Preview Banner */}
          <div style={{
            display: 'flex', gap: '1.5rem', marginBottom: '2.5rem', background: 'rgba(59, 130, 246, 0.08)', 
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
              </div>
            </div>
          </div>

          <hr style={{ border: 'none', borderTop: '1px solid rgba(255,255,255,0.1)', margin: '2.5rem 0' }} />

          <h3 style={{ color: 'var(--text-primary)', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ width: '30px', height: '30px', borderRadius: '50%', background: 'rgba(34, 197, 94, 0.1)', color: '#22c55e', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>2</span>
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
                <h4 style={{ color: 'var(--text-primary)', margin: 0, fontSize: '1.1rem' }}>سجل الأداء (Excel)</h4>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: '6px 0 0 0', lineHeight: '1.4' }}>تحميل تقارير أداء المشرفين المجمعة فقط.</p>
              </div>
            </label>
          </div>

          <button 
            className="btn-save" 
            onClick={handleExport}
            disabled={previewData.callsCount === 0 && previewData.logsCount === 0 && previewData.perfCount === 0}
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
      </div>
    </AdminGuard>
  );
};

export default HandleAdminExport;
