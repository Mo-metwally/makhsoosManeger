import React, { useState, useEffect } from 'react';
import { Activity, Search, Trash2, PhoneCall, ListTodo, StickyNote, ChevronDown, ChevronUp, Clock, FileText } from 'lucide-react';
import AdminGuard from '../components/AdminGuard';
import CustomSelect from '../components/CustomSelect';
import { applyFiltersAndSort, parseArabicDate } from '../utils/filterAndSort';
import api from '../services/api';
import { RefreshCw } from 'lucide-react';
import "./Monitoring.scss";

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
      <div className="monitoring-container fade-in handleadminperformance-style-1" >
        <header className="page-header handleadminperformance-style-2" >
          <div className="page-title-wrapper handleadminperformance-style-3" >
            <Activity size={28} className="title-icon text-blue" />
            <h1 className="page-title gradient-title handleadminperformance-style-4" >سجل متابعة المهام</h1>
          </div>
          <div className="handleadminperformance-style-5">
            <span className="handleadminperformance-style-6">إجمالي التقارير: <strong className="handleadminperformance-style-7">{filteredLogs.length}</strong></span>
            <button className="pr-refresh-btn handleadminperformance-style-8" onClick={fetchLogs} >
              <RefreshCw size={18} className={loading ? 'spinning' : ''} />
              تحديث
            </button>
          </div>
        </header>

        <div className="filter-section handleadminperformance-style-9" >

          {/* Time Filters */}
          <div className="mon-radio-filter-group handleadminperformance-style-10" >
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
            <div className="handleadminperformance-style-11">
              <div className="handleadminperformance-style-12">
                <label className="handleadminperformance-style-13">من:</label>
                <input type="date" value={customStartDate} onChange={e => setCustomStartDate(e.target.value)} className="search-input handleadminperformance-style-14"  />
              </div>
              <div className="handleadminperformance-style-15">
                <label className="handleadminperformance-style-16">إلى:</label>
                <input type="date" value={customEndDate} onChange={e => setCustomEndDate(e.target.value)} className="search-input handleadminperformance-style-17"  />
              </div>
            </div>
          )}

          <div className="handleadminperformance-style-18">
            <div className="search-bar handleadminperformance-style-19" >
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

        <div className="handleadminperformance-style-20">
          {filteredLogs.length === 0 ? (
            <div className="empty-state glass-panel handleadminperformance-style-21" >
              <div className="handleadminperformance-style-22">
                <Activity size={48} className="text-secondary handleadminperformance-style-23"  />
              </div>
              <h3 className="handleadminperformance-style-24">لا توجد سجلات أداء</h3>
              <p className="handleadminperformance-style-25">لا توجد بيانات متاحة وفقاً للفلاتر الحالية.</p>
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
                    {isExpanded && <div className="handleadminperformance-style-26" />}
                    <div className="handleadminperformance-style-27">
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
                        <h3 className="handleadminperformance-style-28">
                          <span>{log.supervisorName}</span>
                          <span className="handleadminperformance-style-29">{log.date}</span>
                        </h3>
                        <div className="handleadminperformance-style-30">
                          <span className="handleadminperformance-style-31"><PhoneCall size={14} /> {log.manualCallsCount || 0} مكالمة</span>
                          <span className="handleadminperformance-style-32"><ListTodo size={14} /> مهام مدونة</span>
                          <span className="handleadminperformance-style-33"><StickyNote size={14} /> {validNotes.length} ملاحظات</span>
                        </div>
                      </div>
                    </div>
                    <div className="handleadminperformance-style-34">
                      <div className="handleadminperformance-style-35">
                        {isExpanded ? <ChevronUp size={24} color="var(--text-secondary)" /> : <ChevronDown size={24} color="var(--text-secondary)" />}
                      </div>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="handleadminperformance-style-36">

                      <div className="handleadminperformance-style-37">
                        <h4 className="handleadminperformance-style-38">
                          <ListTodo size={18} /> مهام المتابعة
                        </h4>
                        <div className="handleadminperformance-style-39">
                          {log.tasks || <span className="handleadminperformance-style-40">لا توجد مهام مدونة.</span>}
                        </div>
                      </div>

                      <div>
                        <h4 className="handleadminperformance-style-41">
                          <StickyNote size={18} /> الملاحظات
                        </h4>
                        {validNotes.length > 0 ? (
                          <div className="handleadminperformance-style-42">
                            {validNotes.map((note, idx) => (
                              <div key={idx} className="handleadminperformance-style-43">
                                <span className="handleadminperformance-style-44">{idx + 1}.</span>
                                {note}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="handleadminperformance-style-45">
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
