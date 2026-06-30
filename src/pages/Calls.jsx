import React, { useState, useEffect } from 'react';
import { Calendar, Phone, Search, ChevronDown, Edit2, Check, X, Download, PhoneCall, ChevronRight, ChevronLeft } from 'lucide-react';
import { exportCallsOnly } from '../utils/exportExcel';
import ExportModal from '../components/ExportModal';
import './Calls.css';

const Calls = () => {
  const [calls, setCalls] = useState([]);
  const [filter, setFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [openDropdownId, setOpenDropdownId] = useState(null);
  const [editingCell, setEditingCell] = useState(null); // { callId, field, value }
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, type: 'status', callId: null, field: '', oldValue: '', newValue: '' });
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [toast, setToast] = useState({ show: false, message: '', type: 'error' });
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 6;

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filter, searchQuery]);

  useEffect(() => {
    document.title = "سجل المكالمات | مخصوص";
    const savedCalls = JSON.parse(localStorage.getItem('call_reports') || '[]');
    // Sort calls by newest first
    savedCalls.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    setCalls(savedCalls);
  }, []);

  // Handle outside click for dropdowns
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (openDropdownId && !event.target.closest('.custom-dropdown-container')) {
        setOpenDropdownId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [openDropdownId]);

  const getFilteredCalls = () => {
    let filtered = calls;

    // Time filter
    if (filter !== 'all') {
      const now = new Date();
      filtered = filtered.filter(call => {
        const callDate = new Date(call.createdAt);

        if (filter === 'today') {
          return callDate.toDateString() === now.toDateString();
        }

        if (filter === 'yesterday') {
          const yesterday = new Date(now);
          yesterday.setDate(yesterday.getDate() - 1);
          return callDate.toDateString() === yesterday.toDateString();
        }

        if (filter === 'week') {
          const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          return callDate >= oneWeekAgo;
        }

        if (filter === 'month') {
          return callDate.getMonth() === now.getMonth() && callDate.getFullYear() === now.getFullYear();
        }

        if (filter === 'custom' && customStartDate && customEndDate) {
          const start = new Date(customStartDate);
          start.setHours(0, 0, 0, 0);
          const end = new Date(customEndDate);
          end.setHours(23, 59, 59, 999);
          return callDate >= start && callDate <= end;
        }

        return true;
      });
    }

    // Search query filter
    if (searchQuery.trim() !== '') {
      const lowerQuery = searchQuery.trim().toLowerCase();
      filtered = filtered.filter(call =>
        call.agentName.toLowerCase().includes(lowerQuery) ||
        call.phone.includes(lowerQuery)
      );
    }

    return filtered;
  };

  const filteredCalls = getFilteredCalls();
  const totalPages = Math.ceil(filteredCalls.length / ITEMS_PER_PAGE);
  const currentCalls = filteredCalls.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  const showToast = (message, type = 'error') => {
    setToast({ show: true, message, type });
    setTimeout(() => {
      setToast(prev => ({ ...prev, show: false }));
    }, 3000);
  };

  const handleStatusChange = (id, newStatus) => {
    const updatedCalls = calls.map(call =>
      call.id === id ? { ...call, callStatus: newStatus } : call
    );
    setCalls(updatedCalls);
    localStorage.setItem('call_reports', JSON.stringify(updatedCalls));
  };

  const handleFieldEdit = (id, field, newValue) => {
    const updatedCalls = calls.map(call =>
      call.id === id ? { ...call, [field]: newValue } : call
    );
    setCalls(updatedCalls);
    localStorage.setItem('call_reports', JSON.stringify(updatedCalls));
    setEditingCell(null);
  };

  const fieldLabels = {
    agentName: 'اسم المندوب',
    phone: 'رقم الهاتف',
    city: 'المحافظة/المدينة',
    agentStatus: 'حالة المندوب',
    report: 'التقرير'
  };

  const renderEditableCell = (call, field, isTextarea = false) => {
    const isEditing = editingCell?.callId === call.id && editingCell?.field === field;
    return (
      <td className="editable-cell">
        {isEditing ? (
          <div className="edit-mode">
            {isTextarea ? (
              <textarea
                value={editingCell.value}
                onChange={(e) => setEditingCell({ ...editingCell, value: e.target.value })}
                className="edit-input edit-textarea"
                rows={2}
              />
            ) : (
              <input
                type="text"
                value={editingCell.value}
                onChange={(e) => setEditingCell({ ...editingCell, value: e.target.value })}
                className="edit-input"
                dir={field === 'phone' ? 'ltr' : 'rtl'}
              />
            )}
            <div className="edit-actions">
              <button
                className="btn-icon save-icon"
                onClick={() => {
                  const trimmedValue = editingCell.value.trim();
                  if (trimmedValue !== call[field]) {
                    // Validation for duplicate phone numbers
                    if (field === 'phone') {
                      const isDuplicate = calls.some(c => c.phone === trimmedValue && c.id !== call.id);
                      if (isDuplicate) {
                        showToast('هذا الرقم مسجل بالفعل في النظام', 'error');
                        return;
                      }
                    }

                    setConfirmModal({
                      isOpen: true,
                      type: 'field',
                      callId: call.id,
                      field: field,
                      oldValue: call[field] || '',
                      newValue: trimmedValue
                    });
                  } else {
                    setEditingCell(null);
                  }
                }}
              >
                <Check size={16} />
              </button>
              <button className="btn-icon cancel-icon" onClick={() => setEditingCell(null)}>
                <X size={16} />
              </button>
            </div>
          </div>
        ) : (
          <div className="view-mode group-hover">
            <span className={`cell-text ${field}-text`} dir={field === 'phone' ? 'ltr' : 'rtl'}>
              {call[field] || '-'}
            </span>
            <button
              className="btn-icon edit-icon hide-until-hover"
              onClick={() => setEditingCell({ callId: call.id, field, value: call[field] || '' })}
              title="تعديل"
            >
              <Edit2 size={14} />
            </button>
          </div>
        )}
      </td>
    );
  };

  const getStatusBadgeClass = (status) => {
    if (status === 'لا يوجد رد') return 'badge-warning';
    if (status === 'رفض') return 'badge-danger';
    if (status === 'تم إرسال تفاصيل') return 'badge-info';
    if (status === 'مهتم (موافق)') return 'badge-success';
    return 'badge-default';
  };

  const getAgentStatusBadgeClass = (status) => {
    if (status === 'رخصة قيادة') return 'badge-license-only';
    if (status === 'رخصة وموتوسيكل') return 'badge-license-bike';
    if (status === 'بدون (لا يوجد)') return 'badge-no-license';
    return 'badge-default';
  };

  const getCommMethodBadgeClass = (method) => {
    if (method === 'واتساب') return 'badge-whatsapp';
    if (method === 'ماسينجر') return 'badge-messenger';
    if (method === 'مكالمة هاتفية') return 'badge-call';
    return 'badge-default';
  };

  const formatDate = (isoString) => {
    const date = new Date(isoString);
    return date.toLocaleString('ar-EG', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="calls-page-container">
      <header className="page-header">
        <div className="title-section">
          <PhoneCall size={28} className="header-icon" />
          <h1 className="page-title gradient-title">سجل المكالمات</h1>
        </div>
      </header>

      <div className="filter-section">
        <div className="filter-group-container">
          <h3 className="filter-title">تصفية حسب:</h3>
          <div className="radio-filter-group">
            <label className="filter-radio">
              <input
                type="radio"
                name="timeFilter"
                value="all"
                checked={filter === 'all'}
                onChange={(e) => setFilter(e.target.value)}
              />
              <span>الكل</span>
            </label>
            <label className="filter-radio">
              <input
                type="radio"
                name="timeFilter"
                value="today"
                checked={filter === 'today'}
                onChange={(e) => setFilter(e.target.value)}
              />
              <span>اليوم</span>
            </label>
            <label className="filter-radio">
              <input
                type="radio"
                name="timeFilter"
                value="yesterday"
                checked={filter === 'yesterday'}
                onChange={(e) => setFilter(e.target.value)}
              />
              <span>الأمس</span>
            </label>
            <label className="filter-radio">
              <input
                type="radio"
                name="timeFilter"
                value="week"
                checked={filter === 'week'}
                onChange={(e) => setFilter(e.target.value)}
              />
              <span>الأسبوع</span>
            </label>
            <label className="filter-radio">
              <input
                type="radio"
                name="timeFilter"
                value="month"
                checked={filter === 'month'}
                onChange={(e) => setFilter(e.target.value)}
              />
              <span>الشهر</span>
            </label>
            <label className="filter-radio">
              <input
                type="radio"
                name="timeFilter"
                value="custom"
                checked={filter === 'custom'}
                onChange={(e) => setFilter(e.target.value)}
              />
              <span>فترة مخصصة</span>
            </label>
          </div>
          {filter === 'custom' && (
            <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem', padding: '1rem', backgroundColor: 'var(--bg-color)', borderRadius: '12px', border: '1px solid var(--border-color)', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <label style={{ color: 'var(--text-secondary)', fontWeight: 'bold' }}>من:</label>
                <input type="date" value={customStartDate} onChange={e => setCustomStartDate(e.target.value)} className="search-input" style={{ width: 'auto', padding: '0.5rem' }} />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <label style={{ color: 'var(--text-secondary)', fontWeight: 'bold' }}>إلى:</label>
                <input type="date" value={customEndDate} onChange={e => setCustomEndDate(e.target.value)} className="search-input" style={{ width: 'auto', padding: '0.5rem' }} />
              </div>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <div className="search-bar">
            <Search size={18} className="search-icon" />
            <input
              type="text"
              placeholder="بحث بالاسم أو الرقم..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input"
            />
          </div>
          <button
            className="btn-save"
            onClick={() => setIsExportModalOpen(true)}
            title="تنزيل ملف إكسيل يحمل المكالمات بالألوان"
            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '0.8rem 1.5rem', border: 'none', borderRadius: '12px', cursor: 'pointer', fontWeight: 'bold' }}
          >
            <Download size={18} />
            <span>تحميل المكالمات  </span>
          </button>
        </div>
      </div>

      <div className="table-container">
        <table className="calls-table">
          <thead>
            <tr>
              <th>تاريخ المكالمة</th>
              <th>اسم المندوب</th>
              <th>رقم الهاتف</th>
              <th>المحافظة/المدينة</th>
              <th>طريقة التواصل</th>
              <th>حالة المندوب</th>
              <th>حالة المكالمة</th>
              <th>التقرير</th>
            </tr>
          </thead>
          <tbody>
            {currentCalls.length > 0 ? (
              currentCalls.map(call => (
                <tr key={call.id} className={openDropdownId?.includes(call.id) ? 'active-row' : ''}>
                  <td className="date-cell">
                    <div className="date-content">
                      <Calendar size={14} className="cell-icon" />
                      <span>{formatDate(call.createdAt)}</span>
                    </div>
                  </td>
                  {renderEditableCell(call, 'agentName')}
                  {renderEditableCell(call, 'phone')}
                  {renderEditableCell(call, 'city')}
                  <td className="status-cell">
                    <div className="custom-dropdown-container">
                      <button
                        className={`status-badge dropdown-trigger ${getCommMethodBadgeClass(call.commMethod)}`}
                        onClick={() => setOpenDropdownId(openDropdownId === `commMethod-${call.id}` ? null : `commMethod-${call.id}`)}
                      >
                        {call.commMethod || 'مكالمة هاتفية'}
                        <ChevronDown size={14} className={`dropdown-arrow ${openDropdownId === `commMethod-${call.id}` ? 'open' : ''}`} />
                      </button>

                      {openDropdownId === `commMethod-${call.id}` && (
                        <div className="custom-dropdown-menu">
                          {['واتساب', 'ماسينجر', 'مكالمة هاتفية'].map(method => (
                            <button
                              key={method}
                              className={`dropdown-item ${call.commMethod === method ? 'active' : ''}`}
                              onClick={() => {
                                if (method !== call.commMethod) {
                                  setConfirmModal({
                                    isOpen: true,
                                    type: 'field',
                                    callId: call.id,
                                    field: 'commMethod',
                                    oldValue: call.commMethod || '',
                                    newValue: method
                                  });
                                }
                                setOpenDropdownId(null);
                              }}
                            >
                              <span className={`status-dot ${getCommMethodBadgeClass(method).replace('badge-', 'dot-')}`}></span>
                              {method}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="status-cell">
                    <div className="custom-dropdown-container">
                      <button
                        className={`status-badge dropdown-trigger ${getAgentStatusBadgeClass(call.agentStatus)}`}
                        onClick={() => setOpenDropdownId(openDropdownId === `agentStatus-${call.id}` ? null : `agentStatus-${call.id}`)}
                      >
                        {call.agentStatus || 'اختر الحالة'}
                        <ChevronDown size={14} className={`dropdown-arrow ${openDropdownId === `agentStatus-${call.id}` ? 'open' : ''}`} />
                      </button>

                      {openDropdownId === `agentStatus-${call.id}` && (
                        <div className="custom-dropdown-menu">
                          {['رخصة قيادة', 'رخصة وموتوسيكل', 'بدون (لا يوجد)'].map(status => (
                            <button
                              key={status}
                              className={`dropdown-item ${call.agentStatus === status ? 'active' : ''}`}
                              onClick={() => {
                                if (status !== call.agentStatus) {
                                  setConfirmModal({
                                    isOpen: true,
                                    type: 'field',
                                    callId: call.id,
                                    field: 'agentStatus',
                                    oldValue: call.agentStatus || '',
                                    newValue: status
                                  });
                                }
                                setOpenDropdownId(null);
                              }}
                            >
                              <span className={`status-dot ${getAgentStatusBadgeClass(status).replace('badge-', 'dot-')}`}></span>
                              {status}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="status-cell">
                    <div className="custom-dropdown-container">
                      <button
                        className={`status-badge dropdown-trigger ${getStatusBadgeClass(call.callStatus)}`}
                        onClick={() => setOpenDropdownId(openDropdownId === `callStatus-${call.id}` ? null : `callStatus-${call.id}`)}
                      >
                        {call.callStatus}
                        <ChevronDown size={14} className={`dropdown-arrow ${openDropdownId === `callStatus-${call.id}` ? 'open' : ''}`} />
                      </button>

                      {openDropdownId === `callStatus-${call.id}` && (
                        <div className="custom-dropdown-menu">
                          {['لا يوجد رد', 'رفض', 'تم إرسال تفاصيل', 'مهتم (موافق)'].map(status => (
                            <button
                              key={status}
                              className={`dropdown-item ${call.callStatus === status ? 'active' : ''}`}
                              onClick={() => {
                                if (status !== call.callStatus) {
                                  setConfirmModal({
                                    isOpen: true,
                                    type: 'status',
                                    callId: call.id,
                                    field: 'callStatus',
                                    oldValue: call.callStatus,
                                    newValue: status
                                  });
                                }
                                setOpenDropdownId(null);
                              }}
                            >
                              <span className={`status-dot ${getStatusBadgeClass(status).replace('badge-', 'dot-')}`}></span>
                              {status}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </td>
                  {renderEditableCell(call, 'report', true)}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="7" className="empty-state">
                  <div className="empty-content">
                    <Search size={40} className="empty-icon" />
                    <p>لا يوجد مكالمات مسجلة في هذه الفترة.</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="pagination-container">
            <button 
              className="pagination-btn" 
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              <ChevronRight size={18} />
              <span>السابق</span>
            </button>
            
            <div className="pagination-info">
              صفحة <span className="current-page">{currentPage}</span> من <span className="total-pages">{totalPages}</span>
            </div>
            
            <button 
              className="pagination-btn" 
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
            >
              <span>التالي</span>
              <ChevronLeft size={18} />
            </button>
          </div>
        )}
      </div>



      {/* Confirmation Modal */}
      {confirmModal.isOpen && (
        <div className="modal-overlay" onClick={() => setConfirmModal({ isOpen: false, type: 'status', callId: null, field: '', oldValue: '', newValue: '' })}>
          <div className="modal-content warning-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 style={{ color: 'var(--theme-color)' }}>
                {confirmModal.type === 'status' ? 'تأكيد تغيير الحالة' : 'تأكيد تعديل البيانات'}
              </h2>
              <button className="close-btn" onClick={() => setConfirmModal({ isOpen: false, type: 'status', callId: null, field: '', oldValue: '', newValue: '' })}>&times;</button>
            </div>
            <p style={{ marginBottom: '2rem', fontSize: '1.1rem', color: 'var(--text-secondary)' }}>
              {confirmModal.type === 'status' ? (
                <>هل أنت متأكد من تغيير حالة المكالمة من <strong style={{ color: 'var(--text-primary)' }}>{confirmModal.oldValue}</strong> إلى <strong style={{ color: 'var(--theme-color)' }}>{confirmModal.newValue}</strong>؟</>
              ) : (
                <>هل أنت متأكد من تعديل <strong style={{ color: 'var(--text-primary)' }}>{fieldLabels[confirmModal.field]}</strong> وحفظ التغييرات؟</>
              )}
            </p>
            <div className="form-actions">
              <button type="button" className="btn-cancel" onClick={() => setConfirmModal({ isOpen: false, type: 'status', callId: null, field: '', oldValue: '', newValue: '' })}>إلغاء</button>
              <button
                type="button"
                className="btn-save"
                style={{ backgroundColor: 'var(--theme-color)' }}
                onClick={() => {
                  if (confirmModal.type === 'status') {
                    handleStatusChange(confirmModal.callId, confirmModal.newValue);
                  } else {
                    handleFieldEdit(confirmModal.callId, confirmModal.field, confirmModal.newValue);
                  }
                  setConfirmModal({ isOpen: false, type: 'status', callId: null, field: '', oldValue: '', newValue: '' });
                }}
              >
                تأكيد الحفظ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toast.show && (
        <div className={`toast-notification toast-${toast.type}`}>
          {toast.message}
        </div>
      )}

      {/* Export Modal */}
      <ExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        onExport={exportCallsOnly}
        title="تحميل سجل المكالمات"
      />
    </div>
  );
};

export default Calls;
