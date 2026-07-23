import './ExportModal.scss';
import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import { useToast } from '../contexts/ToastContext';

const ExportModal = ({ isOpen, onClose, onExport, title }) => {
  const { showToast } = useToast();
  const [filterType, setFilterType] = useState('today');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  if (!isOpen) return null;

  const handleExport = () => {
    if (filterType === 'custom') {
      if (!startDate || !endDate) {
        showToast("يرجى اختيار تاريخ البداية والنهاية", "error");
        return;
      }
      onExport(filterType, startDate, endDate);
    } else {
      onExport(filterType);
    }
    onClose();
  };

  return ReactDOM.createPortal(
    <div className="modal-overlay active" onClick={onClose}>
      <div className="modal-content exportmodal-style-1"  onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="exportmodal-style-2">{title}</h2>
          <button className="close-btn" onClick={onClose}>&times;</button>
        </div>

        <div className="exportmodal-style-3">
          <p className="exportmodal-style-4">
            اختر الفترة الزمنية التي تريد تحميل تقاريرها:
          </p>
          <div className="exportmodal-style-5">
            {['today', 'yesterday', 'week', 'month', 'all', 'custom'].map(type => (
              <button
                key={type}
                type="button"
                onClick={() => setFilterType(type)}
                style={{
                  padding: '1rem',
                  borderRadius: '12px',
                  border: `2px solid ${filterType === type ? 'var(--theme-color)' : 'var(--border-color)'}`,
                  backgroundColor: filterType === type ? 'var(--theme-color)' : 'transparent',
                  color: filterType === type ? 'var(--btn-text-color)' : 'var(--text-primary)',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  gridColumn: type === 'all' || type === 'custom' ? '1 / -1' : 'auto',
                  boxShadow: filterType === type ? '0 0 15px var(--theme-glow)' : 'none'
                }}
              >
                {type === 'today' && 'اليوم'}
                {type === 'yesterday' && 'الأمس'}
                {type === 'week' && 'آخر 7 أيام'}
                {type === 'month' && 'هذا الشهر'}
                {type === 'all' && 'الكل (جميع السجلات)'}
                {type === 'custom' && 'فترة مخصصة (من - إلى)'}
              </button>
            ))}
          </div>

          {filterType === 'custom' && (
            <div className="exportmodal-style-6">
              <div className="exportmodal-style-7">
                <label className="exportmodal-style-8">من:</label>
                <input 
                  type="date" 
                  value={startDate} 
                  onChange={e => setStartDate(e.target.value)}
                  className="exportmodal-style-9"
                />
              </div>
              <div className="exportmodal-style-10">
                <label className="exportmodal-style-11">إلى:</label>
                <input 
                  type="date" 
                  value={endDate} 
                  onChange={e => setEndDate(e.target.value)}
                  className="exportmodal-style-12"
                />
              </div>
            </div>
          )}
        </div>

        <div className="form-actions">
          <button className="btn-cancel" onClick={onClose}>إلغاء</button>
          <button className="btn-save" onClick={handleExport}>
            تأكيد التحميل
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default ExportModal;
