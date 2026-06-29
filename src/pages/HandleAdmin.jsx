import React, { useState, useEffect } from 'react';
import { Calendar, Phone, Search, Download, Trash2, PhoneCall, ChevronRight, ChevronLeft } from 'lucide-react';
import { exportCallsOnly } from '../utils/exportExcel';
import AdminGuard from '../components/AdminGuard';
import CustomSelect from '../components/CustomSelect';
import AdminExportModal from '../components/AdminExportModal';
import { applyFiltersAndSort } from '../utils/filterAndSort';
import './Calls.css'; // Reuse Calls styles

const HandleAdmin = () => {
  const [calls, setCalls] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [timeFilter, setTimeFilter] = useState('all');
  const [supervisorFilter, setSupervisorFilter] = useState('all');
  const [sortBy, setSortBy] = useState('date_desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const ITEMS_PER_PAGE = 6;

  useEffect(() => {
    document.title = "سجل المندوبين المجمع | مخصوص";
    const savedCalls = JSON.parse(localStorage.getItem('admin_aggregated_calls') || '[]');
    // Sort calls by newest first
    savedCalls.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    setCalls(savedCalls);
  }, []);

  // Reset page when search or filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, timeFilter, supervisorFilter, sortBy]);

  const handleClearData = () => {
    if (window.confirm('هل أنت متأكد من رغبتك في مسح كافة البيانات المجمعة؟ هذا الإجراء لا يمكن التراجع عنه.')) {
      localStorage.removeItem('admin_aggregated_calls');
      setCalls([]);
    }
  };

  const uniqueSupervisors = Array.from(new Set(calls.map(c => c.supervisorName).filter(Boolean)));

  const filteredCalls = applyFiltersAndSort(calls, { timeFilter, supervisorFilter, searchQuery, sortBy }, false);
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
            <h1 className="page-title gradient-title">سجل المندوبين المجمع (إدارة)</h1>
          </div>
          <div style={{ color: 'var(--text-secondary)' }}>
            إجمالي المكالمات المجمعة: <strong>{calls.length}</strong>
          </div>
        </header>

        <div className="filter-section" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', position: 'relative', zIndex: 10 }}>
          
          {/* Time Filters */}
          <div className="admin-filter-group">
            {['all', 'today', 'yesterday', 'week', 'month'].map(val => (
              <div className="admin-filter-radio" key={val}>
                <label>
                  <input 
                    type="radio" 
                    name="timeFilter" 
                    value={val} 
                    checked={timeFilter === val} 
                    onChange={(e) => setTimeFilter(e.target.value)} 
                  /> 
                  <span>{val === 'all' ? 'الكل' : val === 'today' ? 'اليوم' : val === 'yesterday' ? 'أمس' : val === 'week' ? 'الأسبوع' : 'الشهر'}</span>
                  {timeFilter === val && <div className="radio-bg"></div>}
                </label>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
            <div className="search-bar" style={{ flex: 1, minWidth: '250px', maxWidth: '400px', margin: 0 }}>
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
            
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                className="btn-save"
                onClick={() => setIsExportModalOpen(true)}
                title="تحميل تقرير شامل"
                style={{ 
                  display: 'flex', alignItems: 'center', gap: '8px', 
                  padding: '0.8rem 1.5rem', border: 'none', borderRadius: '12px', 
                  cursor: 'pointer', fontWeight: 'bold',
                  backgroundColor: 'rgba(34, 197, 94, 0.1)', color: '#22c55e',
                  margin: 0
                }}
              >
                <Download size={18} />
                <span>تحميل التقرير</span>
              </button>

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
            </div>
          </div>
        </div>

        <div className="table-container">
          <table className="calls-table">
            <thead>
              <tr>
                <th>تاريخ التقرير الأصلي</th>
                <th>المشرف (رافع التقرير)</th>
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
                  <tr key={call.id}>
                    <td className="date-cell">
                      <div className="date-content">
                        <Calendar size={14} className="cell-icon" />
                        <span dir="ltr">{call.originalDateString || '-'}</span>
                      </div>
                    </td>
                    <td><strong style={{ color: 'var(--theme-color)' }}>{call.supervisorName || '-'}</strong></td>
                    <td>{call.agentName}</td>
                    <td dir="ltr" style={{ textAlign: 'right' }}>{call.phone}</td>
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
                      <div style={{ maxWidth: '200px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={call.report}>
                        {call.report}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="9" className="empty-state">
                    <div className="empty-content">
                      <Search size={40} className="empty-icon" />
                      <p>لا يوجد مكالمات مجمعة في قاعدة البيانات حالياً.</p>
                      <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.5rem' }}>
                        قم بالذهاب إلى صفحة handleAdminAdd لرفع ملفات ZIP.
                      </span>
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

      <AdminExportModal 
        isOpen={isExportModalOpen} 
        onClose={() => setIsExportModalOpen(false)} 
        filters={{ timeFilter, supervisorFilter, searchQuery, sortBy }}
      />
    </AdminGuard>
  );
};

export default HandleAdmin;
