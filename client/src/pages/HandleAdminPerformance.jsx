import React, { useState, useEffect } from 'react';
import { Activity, Search, Trash2, PhoneCall, ListTodo, StickyNote, ChevronDown, ChevronUp, Clock, FileText } from 'lucide-react';
import AdminGuard from '../components/AdminGuard';
import CustomSelect from '../components/CustomSelect';
import { applyFiltersAndSort, parseArabicDate } from '../utils/filterAndSort';
import api from '../services/api';
import { RefreshCw } from 'lucide-react';
import './Monitoring.css';

const HandleAdminPerformance = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [timeFilter, setTimeFilter] = useState('all');
  const [supervisorFilter, setSupervisorFilter] = useState('all');
  const [sortBy, setSortBy] = useState('date_desc');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [expandedIndex, setExpandedIndex] = useState(null);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const response = await api.get('/data/admin/all');
      const savedLogs = response.data.performance || [];
      savedLogs.sort((a, b) => new Date(b.timestamp || b.date) - new Date(a.timestamp || a.date));
      setLogs(savedLogs);
    } catch (error) {
      console.error("Failed to fetch admin performance logs", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    document.title = "سجل الحضور الأداء | مخصوص";
    fetchLogs();
  }, []);

  const handleClearData = () => {
    if (window.confirm('هل أنت متأكد من مسح جميع تقارير الأداء المجمعة؟')) {
      localStorage.removeItem('admin_aggregated_performance');
      setLogs([]);
    }
  };

  const uniqueSupervisors = Array.from(new Set(logs.map(l => l.supervisorName).filter(Boolean)));

  // We can reuse the filter logic but we need to map the date field appropriately
  // filterAndSort expects createdAt or startTime, we can map date to createdAt before filtering
  const mapDateForFilter = logs.map(l => ({ ...l, createdAt: l.createdAt || parseArabicDate(l.date) }));
  const filteredLogs = applyFiltersAndSort(mapDateForFilter, { timeFilter, supervisorFilter, searchQuery, sortBy, customStartDate, customEndDate }, true);

  return (
    <AdminGuard>
      <div className="monitoring-container fade-in" style={{ width: '100%', padding: '1.5rem 2rem', margin: '0' }}>
        <header className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '2rem' }}>
          <div className="page-title-wrapper" style={{ display: 'flex', alignItems: 'center', gap: '1rem', background: 'var(--glass-bg)', padding: '1rem 2rem', borderRadius: '16px', border: 'var(--glass-border)' }}>
            <Activity size={28} className="title-icon text-blue" />
            <h1 className="page-title gradient-title" style={{ margin: 0 }}>سجل متابعة المهام</h1>
          </div>
          <div style={{ color: 'var(--text-secondary)', display: 'flex', gap: '1.5rem', alignItems: 'center', background: 'var(--glass-bg)', padding: '1rem 2rem', borderRadius: '16px', border: 'var(--glass-border)' }}>
            <span style={{ fontSize: '1.1rem' }}>إجمالي التقارير: <strong style={{ color: 'var(--theme-color)', fontSize: '1.2rem' }}>{filteredLogs.length}</strong></span>
            <button className="pr-refresh-btn" onClick={fetchLogs} style={{ padding: '0.5rem 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(var(--theme-color-rgb), 0.1)', color: 'var(--theme-color)', border: '1px solid rgba(var(--theme-color-rgb), 0.3)', borderRadius: '8px', cursor: 'pointer', transition: 'all 0.3s' }}>
              <RefreshCw size={18} className={loading ? 'spinning' : ''} />
              تحديث
            </button>
          </div>
        </header>

        <div className="filter-section" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', position: 'relative', zIndex: 10 }}>

          {/* Time Filters */}
          <div className="mon-radio-filter-group" style={{ margin: 0, alignSelf: 'flex-start' }}>
            {['all', 'today', 'yesterday', 'week', 'month', 'custom'].map(val => (
              <label className="mon-filter-radio" key={val}>
                <input
                  type="radio"
                  name="timeFilter"
                  value={val}
                  checked={timeFilter === val}
                  onChange={(e) => setTimeFilter(e.target.value)}
                />
                <span>
                  {val === 'all' ? 'الكل' : val === 'today' ? 'اليوم' : val === 'yesterday' ? 'الأمس' : val === 'week' ? 'آخر 7 أيام' : val === 'month' ? 'هذا الشهر' : 'مخصص'}
                </span>
              </label>
            ))}
          </div>

          {timeFilter === 'custom' && (
            <div style={{ display: 'flex', gap: '1rem', background: 'var(--glass-bg)', padding: '1.5rem', borderRadius: '16px', border: 'var(--glass-border)' }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>من:</label>
                <input type="date" value={customStartDate} onChange={e => setCustomStartDate(e.target.value)} className="search-input" style={{ width: '100%' }} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>إلى:</label>
                <input type="date" value={customEndDate} onChange={e => setCustomEndDate(e.target.value)} className="search-input" style={{ width: '100%' }} />
              </div>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
            <div className="search-bar" style={{ flex: 1, minWidth: '250px', maxWidth: '400px', margin: 0 }}>
              <Search size={18} className="search-icon" />
              <input
                type="text"
                placeholder="ابحث بالاسم أو المهمة..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="search-input"
              />
            </div>

            {uniqueSupervisors.length > 0 && (
              <CustomSelect
                options={[
                  { value: 'all', label: 'كل المشرفين (الجميع)' },
                  ...uniqueSupervisors.map(name => ({ value: name, label: name }))
                ]}
                value={supervisorFilter}
                onChange={setSupervisorFilter}
                placeholder="اختر المشرف"
              />
            )}

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

            {/* <button
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
            </button> */}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', width: '100%', marginTop: '2rem' }}>
          {filteredLogs.length === 0 ? (
            <div className="empty-state glass-panel" style={{ padding: '4rem', textAlign: 'center', border: '1px solid rgba(255,255,255,0.05)' }}>
              <div style={{ display: 'inline-flex', padding: '1.5rem', background: 'rgba(255,255,255,0.02)', borderRadius: '50%', marginBottom: '1rem' }}>
                <Activity size={48} className="text-secondary" style={{ opacity: 0.5 }} />
              </div>
              <h3 style={{ margin: '0 0 0.5rem 0', color: 'var(--text-primary)' }}>لا توجد سجلات أداء</h3>
              <p style={{ color: 'var(--text-secondary)' }}>لا توجد بيانات متاحة وفقاً للفلاتر الحالية.</p>
            </div>
          ) : (
            filteredLogs.map((log, index) => {
              const isExpanded = expandedIndex === index;
              const validNotes = log.notesList ? log.notesList.filter(n => n.trim() !== '') : [];

              return (
                <div key={index} className="glass-panel" style={{
                  borderLeft: isExpanded ? '4px solid var(--theme-color)' : '4px solid rgba(255,255,255,0.1)',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  overflow: 'hidden',
                  padding: 0,
                  transform: isExpanded ? 'scale(1.01)' : 'scale(1)',
                  boxShadow: isExpanded ? '0 10px 30px -10px rgba(0,0,0,0.5)' : 'none'
                }}>
                  <div
                    onClick={() => setExpandedIndex(isExpanded ? null : index)}
                    style={{
                      padding: '1.5rem 2rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      cursor: 'pointer',
                      background: isExpanded ? 'rgba(var(--theme-color-rgb), 0.03)' : 'transparent',
                      flexWrap: 'wrap',
                      gap: '1rem',
                      position: 'relative'
                    }}
                  >
                    {isExpanded && <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '1px', background: 'linear-gradient(90deg, transparent, var(--theme-color), transparent)', opacity: 0.5 }} />}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                      <div style={{ 
                        background: isExpanded ? 'var(--theme-color)' : 'rgba(255, 255, 255, 0.05)', 
                        padding: '1rem', 
                        borderRadius: '16px', 
                        color: isExpanded ? '#fff' : 'var(--text-secondary)',
                        transition: 'all 0.3s'
                      }}>
                        <Activity size={24} />
                      </div>
                      <div>
                        <h3 style={{ margin: '0 0 0.3rem 0', color: 'var(--text-primary)', fontSize: '1.2rem', display: 'flex', gap: '1rem' }}>
                          <span>{log.supervisorName}</span>
                          <span style={{ color: 'var(--text-secondary)', fontSize: '1rem', fontWeight: 'normal' }}>{log.date}</span>
                        </h3>
                        <div style={{ display: 'flex', gap: '1.5rem', color: 'var(--text-secondary)', fontSize: '0.9rem', flexWrap: 'wrap' }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}><PhoneCall size={14} /> {log.manualCallsCount || 0} مكالمة</span>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}><ListTodo size={14} /> مهام مدونة</span>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}><StickyNote size={14} /> {validNotes.length} ملاحظات</span>
                        </div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      <div style={{ padding: '0.5rem', background: 'rgba(255,255,255,0.05)', borderRadius: '50%', display: 'flex' }}>
                        {isExpanded ? <ChevronUp size={24} color="var(--text-secondary)" /> : <ChevronDown size={24} color="var(--text-secondary)" />}
                      </div>
                    </div>
                  </div>

                  {isExpanded && (
                    <div style={{ padding: '0 2rem 2rem 2rem', borderTop: '1px solid rgba(255,255,255,0.05)', marginTop: '1rem', paddingTop: '1.5rem' }}>

                      <div style={{ marginBottom: '1.5rem' }}>
                        <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#a855f7', marginBottom: '0.8rem' }}>
                          <ListTodo size={18} /> مهام المتابعة
                        </h4>
                        <div style={{
                          background: 'rgba(0,0,0,0.2)',
                          padding: '1rem 1.5rem',
                          borderRadius: '12px',
                          border: '1px solid rgba(255,255,255,0.05)',
                          color: 'var(--text-primary)',
                          whiteSpace: 'pre-wrap',
                          lineHeight: '1.6'
                        }}>
                          {log.tasks || <span style={{ color: 'var(--text-secondary)', fontStyle: 'italic' }}>لا توجد مهام مدونة.</span>}
                        </div>
                      </div>

                      <div>
                        <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#f59e0b', marginBottom: '0.8rem' }}>
                          <StickyNote size={18} /> الملاحظات
                        </h4>
                        {validNotes.length > 0 ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                            {validNotes.map((note, idx) => (
                              <div key={idx} style={{
                                background: 'rgba(0,0,0,0.2)',
                                padding: '1rem 1.5rem',
                                borderRadius: '12px',
                                border: '1px solid rgba(255,255,255,0.05)',
                                color: 'var(--text-primary)',
                                whiteSpace: 'pre-wrap',
                                lineHeight: '1.6',
                                position: 'relative',
                                paddingRight: '3rem'
                              }}>
                                <span style={{ position: 'absolute', right: '1rem', top: '1rem', color: '#f59e0b', fontWeight: 'bold', opacity: 0.5 }}>{idx + 1}.</span>
                                {note}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div style={{ color: 'var(--text-secondary)', fontStyle: 'italic', background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: '12px' }}>
                            لا توجد ملاحظات مدونة.
                          </div>
                        )}
                      </div>

                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </AdminGuard>
  );
};

export default HandleAdminPerformance;
