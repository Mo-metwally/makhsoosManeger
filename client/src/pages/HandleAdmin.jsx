import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Calendar, Phone, Search, Trash2, PhoneCall, ChevronRight, ChevronLeft, RefreshCw, X, Link as LinkIcon, Info, FileText } from 'lucide-react';
import AdminGuard from '../components/AdminGuard';
import CustomSelect from '../components/CustomSelect';
import { applyFiltersAndSort } from '../utils/filterAndSort';
import api from '../services/api';
import "./Calls.scss";

const HandleAdmin = () => {
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const initialEmployeeName = searchParams.get('employeeName');

  const [calls, setCalls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [timeFilter, setTimeFilter] = useState('all');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [supervisorFilter, setSupervisorFilter] = useState(initialEmployeeName || 'all');
  const [sortBy, setSortBy] = useState('date_desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [expandedRows, setExpandedRows] = useState(new Set());
  const [phoneHistoryModal, setPhoneHistoryModal] = useState({ isOpen: false, phone: '', history: [], loading: false });
  const ITEMS_PER_PAGE = 10;

  const fetchCalls = async () => {
    setLoading(true);
    try {
      const response = await api.get('/admin/calls');
      const savedCalls = response.data;
      savedCalls.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      setCalls(savedCalls);
    } catch (error) {
      console.error("Failed to fetch admin calls", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    document.title = "سجل التواصل المجمع | مخصوص";
    fetchCalls();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, timeFilter, supervisorFilter, sortBy, customStartDate, customEndDate]);

  const handleClearData = () => {
    if (window.confirm('هل أنت متأكد من رغبتك في مسح كافة البيانات المجمعة؟ هذا الإجراء لا يمكن التراجع عنه.')) {
      localStorage.removeItem('admin_aggregated_calls');
      setCalls([]);
    }
  };

  const openPhoneHistory = async (phone) => {
    if (!phone) return;
    setPhoneHistoryModal({ isOpen: true, phone, history: [], loading: true });
    try {
      const response = await api.get(`/data/calls/history/${phone}`);
      setPhoneHistoryModal({
        isOpen: true,
        phone,
        history: response.data,
        loading: false
      });
    } catch (error) {
      console.error("Failed to fetch phone history", error);
      setPhoneHistoryModal(prev => ({ ...prev, loading: false }));
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const h = String(d.getHours()).padStart(2, '0');
    const min = String(d.getMinutes()).padStart(2, '0');
    return `${y}-${m}-${day} ${h}:${min}`;
  };

  const toggleRow = (id) => {
    const newSet = new Set(expandedRows);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setExpandedRows(newSet);
  };

  const uniqueSupervisors = Array.from(new Set(calls.map(c => c.supervisorName).filter(Boolean)));
  const filteredCalls = applyFiltersAndSort(calls, { timeFilter, supervisorFilter, searchQuery, sortBy, customStartDate, customEndDate }, false);

  const totalPages = Math.ceil(filteredCalls.length / ITEMS_PER_PAGE);
  const currentCalls = filteredCalls.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

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

  return (
    <AdminGuard>
      <div className="calls-page-container">
        <header className="page-header">
          <div className="title-section">
            <PhoneCall size={28} className="header-icon" />
            <h1 className="page-title gradient-title">سجل التواصل المجمع (إدارة)</h1>
          </div>
          <div className="handleadmin-style-1">
            <span>إجمالي المكالمات المجمعة: <strong>{calls.length}</strong></span>
            <button className="pr-refresh-btn handleadmin-style-2" onClick={fetchCalls} >
              <RefreshCw size={16} className={loading ? 'spinning' : ''} />
              تحديث
            </button>
          </div>
        </header>

        <div className="filter-section handleadmin-style-3" >

          {/* Time Filters */}
          <div className="admin-filter-group">
            {['all', 'today', 'yesterday', 'week', 'month', 'custom'].map(val => (
              <div className="admin-filter-radio" key={val}>
                <label>
                  <input
                    type="radio"
                    name="timeFilter"
                    value={val}
                    checked={timeFilter === val}
                    onChange={(e) => setTimeFilter(e.target.value)}
                  />
                  <span>{val === 'all' ? 'الكل' : val === 'today' ? 'اليوم' : val === 'yesterday' ? 'أمس' : val === 'week' ? 'الأسبوع' : val === 'month' ? 'الشهر' : 'فترة مخصصة'}</span>
                  {timeFilter === val && <div className="radio-bg"></div>}
                </label>
              </div>
            ))}
          </div>

          {timeFilter === 'custom' && (
            <div className="handleadmin-style-4">
              <div className="handleadmin-style-5">
                <label className="handleadmin-style-6">من:</label>
                <input type="date" value={customStartDate} onChange={e => setCustomStartDate(e.target.value)} className="search-input handleadmin-style-7"  />
              </div>
              <div className="handleadmin-style-8">
                <label className="handleadmin-style-9">إلى:</label>
                <input type="date" value={customEndDate} onChange={e => setCustomEndDate(e.target.value)} className="search-input handleadmin-style-10"  />
              </div>
            </div>
          )}

          <div className="handleadmin-style-11">
            <div className="search-bar handleadmin-style-12" >
              <Search size={18} className="search-icon" />
              <input
                type="text"
                placeholder="بحث بالاسم، الرقم، أو المحافظة..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="search-input"
              />
            </div>

            <CustomSelect
              options={[
                { value: 'all', label: 'كل المشرفين (الجميع)' },
                ...uniqueSupervisors.map(name => ({ value: name, label: name }))
              ]}
              value={supervisorFilter}
              onChange={setSupervisorFilter}
              placeholder="اختر المشرف"
            />

            <CustomSelect
              options={[
                { value: 'date_desc', label: 'الأحدث أولاً' },
                { value: 'date_asc', label: 'الأقدم أولاً' },
                { value: 'supervisor_asc', label: 'المشرف (أ - ي)' },
                { value: 'supervisor_desc', label: 'المشرف (ي - أ)' }
              ]}
              value={sortBy}
              onChange={setSortBy}
              placeholder="ترتيب حسب"
            />

            {/* <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                className="btn-save"
                onClick={handleClearData}
                title="مسح قاعدة البيانات المجمعة"
                style={{ 
                  display: 'flex', alignItems: 'center', gap: '8px', 
                  padding: '0.8rem 1.5rem', border: 'none', borderRadius: '12px', 
                  cursor: 'pointer', fontWeight: 'bold',
                  backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#ef4444',
                  margin: 0
                }}
              >
                <Trash2 size={18} />
                <span>مسح السجل</span>
              </button>
            </div> */}
          </div>
        </div>

        <div className="table-container">
          <table className="calls-table">
            <thead>
              <tr>
                <th>التاريخ</th>
                <th>المشرف</th>
                <th>اسم المندوب</th>
                <th>رقم الهاتف</th>
                <th>المحافظة</th>
                <th>طريقة التواصل</th>
                <th>حالة المندوب</th>
                <th>حالة المكالمة</th>
                <th>التقرير</th>
              </tr>
            </thead>
            <tbody>
              {currentCalls.length > 0 ? (
                currentCalls.map((call) => {
                  const isExpanded = expandedRows.has(call.id);
                  return (
                    <React.Fragment key={call.id}>
                      <tr
                        className={`expandable-row ${isExpanded ? 'active-row' : ''}`}
                        onClick={() => toggleRow(call.id)}
                      >
                        <td className="date-cell">
                          <div className="date-content">
                            <Calendar size={14} className="cell-icon" />
                            <span dir="ltr">{call.createdAt ? new Date(call.createdAt).toLocaleDateString('en-CA') : (call.originalDateString || '-')}</span>
                          </div>
                        </td>
                        <td><strong className="handleadmin-style-13">{call.supervisorName || '-'}</strong></td>
                        <td>{call.agentName}</td>
                        <td
                          dir="ltr"
                          className="handleadmin-style-14"
                          onClick={(e) => { e.stopPropagation(); openPhoneHistory(call.phone); }}
                        >
                          {call.phone}
                        </td>
                        <td>{call.city}</td>
                        <td className="status-cell">
                          <span className={`status-badge ${getCommMethodBadgeClass(call.commMethod)}`}>
                            {call.commMethod}
                          </span>
                        </td>
                        <td className="status-cell">
                          <span className={`status-badge ${getAgentStatusBadgeClass(call.agentStatus)}`}>
                            {call.agentStatus}
                          </span>
                        </td>
                        <td className="status-cell">
                          <span className={`status-badge ${getStatusBadgeClass(call.callStatus)}`}>
                            {call.callStatus}
                          </span>
                        </td>
                        <td>
                          <div className="handleadmin-style-15">
                            {call.report}
                          </div>
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr className="expanded-details-row">
                          <td colSpan="9" className="handleadmin-style-16">
                            <div className="advanced-details-card">
                              <div className="detail-section full-width">
                                <div className="detail-section-header">
                                  <FileText size={18} /> نص التقرير
                                </div>
                                <div className="detail-section-content">
                                  {call.report || 'لا يوجد تقرير'}
                                </div>
                              </div>

                              {call.notes && (
                                <div className="detail-section full-width">
                                  <div className="detail-section-header handleadmin-style-17" >
                                    <Info size={18} /> ملاحظات إضافية
                                  </div>
                                  <div className="detail-section-content handleadmin-style-18" >
                                    {call.notes}
                                  </div>
                                </div>
                              )}

                              {call.profileLink && (
                                <div className="detail-section full-width handleadmin-style-19" >
                                  <a href={call.profileLink.startsWith('http') ? call.profileLink : `https://${call.profileLink}`} target="_blank" rel="noopener noreferrer" className="detail-link-btn">
                                    <LinkIcon size={18} /> زيارة الحساب الشخصي
                                  </a>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="9" className="empty-state">
                    <div className="empty-content">
                      <Search size={40} className="empty-icon" />
                      <p>لا يوجد مكالمات مجمعة في قاعدة البيانات حالياً.</p>
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
      </div>

      {/* Phone History Modal */}
      {phoneHistoryModal.isOpen && (
        <div className="modal-overlay active" onClick={() => setPhoneHistoryModal({ ...phoneHistoryModal, isOpen: false })}>
          <div className="modal-content advanced-history-modal handleadmin-style-20"  onClick={e => e.stopPropagation()}>
            <div className="modal-header handleadmin-style-21" >
              <h2>
                <Phone size={24} className="handleadmin-style-22" />
                تاريخ تواصل الرقم: <span dir="ltr" className="handleadmin-style-23">{phoneHistoryModal.phone}</span>
              </h2>
              <button className="btn-icon" onClick={() => setPhoneHistoryModal({ ...phoneHistoryModal, isOpen: false })}>
                <X size={24} />
              </button>
            </div>
            <div className="modal-body handleadmin-style-24" >
              {phoneHistoryModal.loading ? (
                <div className="handleadmin-style-25">جاري التحميل...</div>
              ) : phoneHistoryModal.history.length > 0 ? (
                <div className="history-timeline">
                  {phoneHistoryModal.history.map((histCall, index) => (
                    <div className="timeline-item" key={histCall.id || index}>
                      <div className="timeline-dot"></div>
                      <div className="timeline-content">
                        <div className="timeline-header">
                          <div className="timeline-meta">
                            <span className="timeline-agent">
                              <Info size={16} className="handleadmin-style-26" />
                              {histCall.agentName}
                            </span>
                            <span className="timeline-supervisor">
                              المشرف: {histCall.supervisorName || '-'}
                            </span>
                          </div>
                          <div className="timeline-date">
                            <Calendar size={14} />
                            {formatDate(histCall.createdAt)}
                          </div>
                        </div>

                        <div className="timeline-badges handleadmin-style-27" >
                          <span className={`status-badge ${getCommMethodBadgeClass(histCall.commMethod)}`}>{histCall.commMethod}</span>
                          <span className={`status-badge ${getAgentStatusBadgeClass(histCall.agentStatus)}`}>{histCall.agentStatus}</span>
                          <span className={`status-badge ${getStatusBadgeClass(histCall.callStatus)}`}>{histCall.callStatus}</span>
                        </div>

                        <div className="timeline-body">
                          {histCall.report || 'لا يوجد تفاصيل تقرير.'}
                        </div>

                        <div className="timeline-footer">
                          {histCall.notes && (
                            <div className="timeline-note">
                              <strong>ملاحظات:</strong> {histCall.notes}
                            </div>
                          )}
                          {histCall.profileLink && (
                            <a href={histCall.profileLink.startsWith('http') ? histCall.profileLink : `https://${histCall.profileLink}`} target="_blank" rel="noopener noreferrer" className="timeline-link">
                              <LinkIcon size={16} /> الحساب الشخصي
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="handleadmin-style-28">لا يوجد سجل تواصل مسجل لهذا الرقم.</p>
              )}
            </div>
          </div>
        </div>
      )}

    </AdminGuard>
  );
};

export default HandleAdmin;
