import './AdminExportModal.scss';
import React, { useState } from 'react';
import { X, FileSpreadsheet, Archive, PhoneCall, Activity, ClipboardList } from 'lucide-react';
import { exportAdminData } from '../utils/exportExcel';
import { applyFiltersAndSort, parseArabicDate } from '../utils/filterAndSort';
import { useToast } from '../contexts/ToastContext';

const AdminExportModal = ({ isOpen, onClose, filters }) => {
  const { showToast } = useToast();
  const [exportType, setExportType] = useState('all_zip'); // 'calls_only', 'logs_only', 'perf_only', 'all_zip'
  const [timeFilter, setTimeFilter] = useState('all');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  if (!isOpen) return null;

  const handleExport = () => {
    if (timeFilter === 'custom' && (!customStartDate || !customEndDate)) {
      showToast("يرجى اختيار تاريخ البداية والنهاية", "error");
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
    <div className="modal-overlay active adminexportmodal-style-1" >
      <div className="modal-content adminexportmodal-style-2" >
        <button className="modal-close" onClick={onClose}>
          <X size={24} />
        </button>

        <h2 className="adminexportmodal-style-3">
          تحميل تقرير شامل
        </h2>

        {/* Time Filter Section */}
        <div className="adminexportmodal-style-4">
          <h4 className="adminexportmodal-style-5">اختر الفترة الزمنية:</h4>
          <div className="adminexportmodal-style-6">
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
            <div className="adminexportmodal-style-7">
              <div className="adminexportmodal-style-8">
                <label className="adminexportmodal-style-9">من:</label>
                <input
                  type="date"
                  value={customStartDate}
                  onChange={e => setCustomStartDate(e.target.value)}
                  className="search-input adminexportmodal-style-10"
                  
                />
              </div>
              <div className="adminexportmodal-style-11">
                <label className="adminexportmodal-style-12">إلى:</label>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={e => setCustomEndDate(e.target.value)}
                  className="search-input adminexportmodal-style-13"
                  
                />
              </div>
            </div>
          )}
        </div>

        <h4 className="adminexportmodal-style-14">اختر نوع الملف:</h4>
        <div className="adminexportmodal-style-15">

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
              className="adminexportmodal-style-16"
            />
            <Archive size={24} color={exportType === 'all_zip' ? 'var(--theme-color)' : 'var(--text-secondary)'} />
            <div className="adminexportmodal-style-17">
              <h4 className="adminexportmodal-style-18">تحميل كل السجلات (ZIP)</h4>
              <p className="adminexportmodal-style-19">تحميل السجلات الثلاثة معاً في ملف مضغوط.</p>
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
              className="adminexportmodal-style-20"
            />
            <PhoneCall size={24} color={exportType === 'calls_only' ? 'var(--theme-color)' : 'var(--text-secondary)'} />
            <div className="adminexportmodal-style-21">
              <h4 className="adminexportmodal-style-22">سجل المكالمات (Excel)</h4>
              <p className="adminexportmodal-style-23">تحميل مكالمات المندوبين المجمعة فقط.</p>
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
              className="adminexportmodal-style-24"
            />
            <Activity size={24} color={exportType === 'logs_only' ? 'var(--theme-color)' : 'var(--text-secondary)'} />
            <div className="adminexportmodal-style-25">
              <h4 className="adminexportmodal-style-26">سجل النشاط والخمول (Excel)</h4>
              <p className="adminexportmodal-style-27">تحميل فترات خمول وراحة المندوبين المجمعة فقط.</p>
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
              className="adminexportmodal-style-28"
            />
            <ClipboardList size={24} color={exportType === 'perf_only' ? 'var(--theme-color)' : 'var(--text-secondary)'} />
            <div className="adminexportmodal-style-29">
              <h4 className="adminexportmodal-style-30">سجل المهام (Excel)</h4>
              <p className="adminexportmodal-style-31">تحميل تقارير مهام المشرفين المجمعة فقط.</p>
            </div>
          </label>
        </div>

        <button
          className="btn-save adminexportmodal-style-32"
          onClick={handleExport}
          
        >
          <FileSpreadsheet size={24} />
          بدء التحميل الآن
        </button>
      </div>
    </div>
  );
};

export default AdminExportModal;
