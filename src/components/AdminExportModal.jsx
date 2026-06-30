import React, { useState } from 'react';
import { X, FileSpreadsheet, Archive, PhoneCall, Activity, ClipboardList } from 'lucide-react';
import { exportAdminData } from '../utils/exportExcel';
import { applyFiltersAndSort, parseArabicDate } from '../utils/filterAndSort';

const AdminExportModal = ({ isOpen, onClose, filters }) => {
  const [exportType, setExportType] = useState('all_zip'); // 'calls_only', 'logs_only', 'perf_only', 'all_zip'
  const [timeFilter, setTimeFilter] = useState('all');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  if (!isOpen) return null;

  const handleExport = () => {
    if (timeFilter === 'custom' && (!customStartDate || !customEndDate)) {
      alert("يرجى اختيار تاريخ البداية والنهاية");
      return;
    }

    const allCalls = JSON.parse(localStorage.getItem('admin_aggregated_calls') || '[]');
    const allLogs = JSON.parse(localStorage.getItem('admin_aggregated_logs') || '[]');
    const allPerf = JSON.parse(localStorage.getItem('admin_aggregated_performance') || '[]');
    
    const finalFilters = { ...filters, timeFilter, customStartDate, customEndDate };

    const exportCalls = applyFiltersAndSort(allCalls, finalFilters, false);
    const exportLogs = applyFiltersAndSort(allLogs, finalFilters, true);
    
    const mapDateForPerf = allPerf.map(l => ({ ...l, createdAt: l.createdAt || parseArabicDate(l.date) }));
    const exportPerf = applyFiltersAndSort(mapDateForPerf, finalFilters, true);

    exportAdminData(exportType, exportCalls, exportLogs, exportPerf);
    onClose();
  };

  return (
    <div className="modal-overlay" style={{ zIndex: 99999 }}>
      <div className="modal-content" style={{ maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto' }}>
        <button className="modal-close" onClick={onClose}>
          <X size={24} />
        </button>
        
        <h2 style={{ marginBottom: '1.5rem', color: 'var(--text-primary)', textAlign: 'center' }}>
          تحميل تقرير شامل
        </h2>

        {/* Time Filter Section */}
        <div style={{ marginBottom: '2rem' }}>
          <h4 style={{ color: 'var(--text-primary)', marginBottom: '1rem' }}>اختر الفترة الزمنية:</h4>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.8rem' }}>
            {['all', 'today', 'yesterday', 'week', 'month', 'custom'].map(type => (
              <button
                key={type}
                type="button"
                onClick={() => setTimeFilter(type)}
                style={{
                  padding: '0.8rem',
                  borderRadius: '12px',
                  border: `2px solid ${timeFilter === type ? 'var(--theme-color)' : 'rgba(255,255,255,0.1)'}`,
                  backgroundColor: timeFilter === type ? 'var(--theme-color)' : 'rgba(0,0,0,0.2)',
                  color: timeFilter === type ? 'white' : 'var(--text-secondary)',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  gridColumn: type === 'custom' ? '1 / -1' : 'auto'
                }}
              >
                {type === 'all' && 'الكل'}
                {type === 'today' && 'اليوم'}
                {type === 'yesterday' && 'الأمس'}
                {type === 'week' && 'آخر 7 أيام'}
                {type === 'month' && 'هذا الشهر'}
                {type === 'custom' && 'فترة مخصصة (من - إلى)'}
              </button>
            ))}
          </div>

          {timeFilter === 'custom' && (
            <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem', background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: '12px' }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>من:</label>
                <input 
                  type="date" 
                  value={customStartDate} 
                  onChange={e => setCustomStartDate(e.target.value)}
                  className="search-input"
                  style={{ width: '100%' }}
                />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>إلى:</label>
                <input 
                  type="date" 
                  value={customEndDate} 
                  onChange={e => setCustomEndDate(e.target.value)}
                  className="search-input"
                  style={{ width: '100%' }}
                />
              </div>
            </div>
          )}
        </div>

        <h4 style={{ color: 'var(--text-primary)', marginBottom: '1rem' }}>اختر نوع الملف:</h4>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', marginBottom: '2rem' }}>
          
          <label style={{
            display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem',
            border: `2px solid ${exportType === 'all_zip' ? 'var(--theme-color)' : 'rgba(255,255,255,0.1)'}`,
            borderRadius: '12px', cursor: 'pointer', background: 'rgba(0,0,0,0.2)', transition: 'all 0.3s'
          }}>
            <input 
              type="radio" 
              name="adminExportType" 
              value="all_zip"
              checked={exportType === 'all_zip'}
              onChange={() => setExportType('all_zip')}
              style={{ accentColor: 'var(--theme-color)', width: '20px', height: '20px' }}
            />
            <Archive size={24} color={exportType === 'all_zip' ? 'var(--theme-color)' : 'var(--text-secondary)'} />
            <div style={{ flex: 1 }}>
              <h4 style={{ color: 'var(--text-primary)', margin: 0 }}>تحميل كل السجلات (ZIP)</h4>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: '4px 0 0 0' }}>تحميل السجلات الثلاثة معاً في ملف مضغوط.</p>
            </div>
          </label>

          <label style={{
            display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem',
            border: `2px solid ${exportType === 'calls_only' ? 'var(--theme-color)' : 'rgba(255,255,255,0.1)'}`,
            borderRadius: '12px', cursor: 'pointer', background: 'rgba(0,0,0,0.2)', transition: 'all 0.3s'
          }}>
            <input 
              type="radio" 
              name="adminExportType" 
              value="calls_only"
              checked={exportType === 'calls_only'}
              onChange={() => setExportType('calls_only')}
              style={{ accentColor: 'var(--theme-color)', width: '20px', height: '20px' }}
            />
            <PhoneCall size={24} color={exportType === 'calls_only' ? 'var(--theme-color)' : 'var(--text-secondary)'} />
            <div style={{ flex: 1 }}>
              <h4 style={{ color: 'var(--text-primary)', margin: 0 }}>سجل المكالمات (Excel)</h4>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: '4px 0 0 0' }}>تحميل مكالمات المندوبين المجمعة فقط.</p>
            </div>
          </label>

          <label style={{
            display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem',
            border: `2px solid ${exportType === 'logs_only' ? 'var(--theme-color)' : 'rgba(255,255,255,0.1)'}`,
            borderRadius: '12px', cursor: 'pointer', background: 'rgba(0,0,0,0.2)', transition: 'all 0.3s'
          }}>
            <input 
              type="radio" 
              name="adminExportType" 
              value="logs_only"
              checked={exportType === 'logs_only'}
              onChange={() => setExportType('logs_only')}
              style={{ accentColor: 'var(--theme-color)', width: '20px', height: '20px' }}
            />
            <Activity size={24} color={exportType === 'logs_only' ? 'var(--theme-color)' : 'var(--text-secondary)'} />
            <div style={{ flex: 1 }}>
              <h4 style={{ color: 'var(--text-primary)', margin: 0 }}>سجل النشاط والخمول (Excel)</h4>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: '4px 0 0 0' }}>تحميل فترات خمول وراحة المندوبين المجمعة فقط.</p>
            </div>
          </label>

          <label style={{
            display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem',
            border: `2px solid ${exportType === 'perf_only' ? 'var(--theme-color)' : 'rgba(255,255,255,0.1)'}`,
            borderRadius: '12px', cursor: 'pointer', background: 'rgba(0,0,0,0.2)', transition: 'all 0.3s'
          }}>
            <input 
              type="radio" 
              name="adminExportType" 
              value="perf_only"
              checked={exportType === 'perf_only'}
              onChange={() => setExportType('perf_only')}
              style={{ accentColor: 'var(--theme-color)', width: '20px', height: '20px' }}
            />
            <ClipboardList size={24} color={exportType === 'perf_only' ? 'var(--theme-color)' : 'var(--text-secondary)'} />
            <div style={{ flex: 1 }}>
              <h4 style={{ color: 'var(--text-primary)', margin: 0 }}>سجل الأداء (Excel)</h4>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: '4px 0 0 0' }}>تحميل تقارير أداء المشرفين المجمعة فقط.</p>
            </div>
          </label>
        </div>

        <button 
          className="btn-save" 
          onClick={handleExport}
          style={{ width: '100%', padding: '1.2rem', display: 'flex', justifyContent: 'center', gap: '0.5rem', fontSize: '1.2rem', fontWeight: 'bold' }}
        >
          <FileSpreadsheet size={24} />
          بدء التحميل الآن
        </button>
      </div>
    </div>
  );
};

export default AdminExportModal;
