import React, { useState } from 'react';
import { X, FileSpreadsheet, Archive, PhoneCall, Activity } from 'lucide-react';
import { exportAdminData } from '../utils/exportExcel';

import { applyFiltersAndSort } from '../utils/filterAndSort';

const AdminExportModal = ({ isOpen, onClose, filters }) => {
  const [exportType, setExportType] = useState('both_zip'); // 'calls_only', 'logs_only', 'both_zip'

  if (!isOpen) return null;

  const handleExport = () => {
    const allCalls = JSON.parse(localStorage.getItem('admin_aggregated_calls') || '[]');
    const allLogs = JSON.parse(localStorage.getItem('admin_aggregated_logs') || '[]');
    
    const exportCalls = applyFiltersAndSort(allCalls, filters, false);
    const exportLogs = applyFiltersAndSort(allLogs, filters, true);

    exportAdminData(exportType, exportCalls, exportLogs);
    onClose();
  };

  return (
    <div className="modal-overlay" style={{ zIndex: 99999 }}>
      <div className="modal-content" style={{ maxWidth: '500px' }}>
        <button className="modal-close" onClick={onClose}>
          <X size={24} />
        </button>
        
        <h2 style={{ marginBottom: '1.5rem', color: 'var(--text-primary)', textAlign: 'center' }}>
          تحميل تقرير شامل
        </h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '2rem' }}>
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
            border: `2px solid ${exportType === 'both_zip' ? 'var(--theme-color)' : 'rgba(255,255,255,0.1)'}`,
            borderRadius: '12px', cursor: 'pointer', background: 'rgba(0,0,0,0.2)', transition: 'all 0.3s'
          }}>
            <input 
              type="radio" 
              name="adminExportType" 
              value="both_zip"
              checked={exportType === 'both_zip'}
              onChange={() => setExportType('both_zip')}
              style={{ accentColor: 'var(--theme-color)', width: '20px', height: '20px' }}
            />
            <Archive size={24} color={exportType === 'both_zip' ? 'var(--theme-color)' : 'var(--text-secondary)'} />
            <div style={{ flex: 1 }}>
              <h4 style={{ color: 'var(--text-primary)', margin: 0 }}>تحميل السجلين معاً (ZIP)</h4>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: '4px 0 0 0' }}>ملف مضغوط <strong style={{ color: '#ef4444' }}>بدون رقم سري</strong> يحتوي على الملفين.</p>
            </div>
          </label>
        </div>

        <button 
          className="btn-save" 
          onClick={handleExport}
          style={{ width: '100%', padding: '1rem', display: 'flex', justifyContent: 'center', gap: '0.5rem', fontSize: '1.1rem' }}
        >
          <FileSpreadsheet size={20} />
          تصدير التقرير
        </button>
      </div>
    </div>
  );
};

export default AdminExportModal;
