import React, { useState } from 'react';
import ReactDOM from 'react-dom';

const ExportModal = ({ isOpen, onClose, onExport, title }) => {
  const [filterType, setFilterType] = useState('today');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  if (!isOpen) return null;

  const handleExport = () => {
    if (filterType === 'custom') {
      if (!startDate || !endDate) {
        alert("يرجى اختيار تاريخ البداية والنهاية");
        return;
      }
      onExport(filterType, startDate, endDate);
    } else {
      onExport(filterType);
    }
    onClose();
  };

  return ReactDOM.createPortal(
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" style={{ maxWidth: '500px' }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2 style={{ color: 'var(--theme-color)' }}>{title}</h2>
          <button className="close-btn" onClick={onClose}>&times;</button>
        </div>

        <div style={{ marginBottom: '2rem' }}>
          <p style={{ marginBottom: '1.5rem', color: 'var(--text-secondary)' }}>
            اختر الفترة الزمنية التي تريد تحميل تقاريرها:
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
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
            <div style={{ marginTop: '1.5rem', display: 'flex', gap: '1rem' }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>من:</label>
                <input 
                  type="date" 
                  value={startDate} 
                  onChange={e => setStartDate(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.8rem',
                    borderRadius: '8px',
                    border: '1px solid var(--border-color)',
                    backgroundColor: 'var(--bg-color)',
                    color: 'var(--text-primary)',
                    fontFamily: 'inherit'
                  }}
                />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>إلى:</label>
                <input 
                  type="date" 
                  value={endDate} 
                  onChange={e => setEndDate(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.8rem',
                    borderRadius: '8px',
                    border: '1px solid var(--border-color)',
                    backgroundColor: 'var(--bg-color)',
                    color: 'var(--text-primary)',
                    fontFamily: 'inherit'
                  }}
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
