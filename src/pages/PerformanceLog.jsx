import React, { useState, useEffect } from 'react';
import { Calendar, PhoneCall, ListTodo, StickyNote, Activity, Download, ChevronDown, ChevronUp } from 'lucide-react';
import * as XLSX from 'xlsx-js-style';
import './Calls.css';

const PerformanceLog = () => {
  const [logs, setLogs] = useState([]);
  const [expandedIndex, setExpandedIndex] = useState(null);

  useEffect(() => {
    document.title = "سجل الأداء اليومي | مخصوص";
    const history = JSON.parse(localStorage.getItem('performance_logs') || '[]');
    // Sort descending by timestamp
    history.sort((a, b) => new Date(b.timestamp || b.date) - new Date(a.timestamp || a.date));
    setLogs(history);
  }, []);

  const formatDate = (dateStr) => {
    try {
      const d = new Date(dateStr);
      return new Intl.DateTimeFormat('ar-EG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }).format(d);
    } catch {
      return dateStr;
    }
  };

  const handleExportExcel = (log) => {
    const userName = localStorage.getItem('userName') || 'المستخدم';
    
    const rowData = {
      'التاريخ': formatDate(log.date),
      'اسم المشرف': userName,
      'المهمة': log.tasks || 'لا توجد',
      'عدد المكالمات': log.manualCallsCount || 0,
    };
    
    if (log.notesList && Array.isArray(log.notesList)) {
      log.notesList.forEach((note, index) => {
        rowData[`ملاحظة ${index + 1}`] = note || 'لا توجد ملاحظة';
      });
    }

    const ws = XLSX.utils.json_to_sheet([rowData]);
    
    const headerStyle = {
      font: { bold: true, color: { rgb: "FFFFFF" } },
      fill: { fgColor: { rgb: "3B82F6" } },
      alignment: { horizontal: "center", vertical: "center" }
    };
    
    const range = XLSX.utils.decode_range(ws['!ref']);
    for (let C = range.s.c; C <= range.e.c; ++C) {
      const address = XLSX.utils.encode_col(C) + "1";
      if (!ws[address]) continue;
      ws[address].s = headerStyle;
    }
    
    const colWidths = [
      { wch: 25 }, 
      { wch: 20 }, 
      { wch: 50 }, 
      { wch: 15 }, 
    ];
    if (log.notesList) {
      for (let i = 0; i < log.notesList.length; i++) {
        colWidths.push({ wch: 40 });
      }
    }
    ws['!cols'] = colWidths;
    ws['!dir'] = 'rtl';

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "تقرير الأداء");
    
    const safeDate = new Date(log.date).toISOString().split('T')[0];
    XLSX.writeFile(wb, `تقرير_الأداء_${userName}_${safeDate}.xlsx`);
  };

  return (
    <div className="calls-page-container" style={{ width: '100%', maxWidth: '100%' }}>
      <header className="page-header" style={{ marginBottom: '2rem' }}>
        <div className="title-section">
          <Activity size={32} className="header-icon" />
          <h1 className="page-title gradient-title" style={{ fontSize: '2.5rem' }}>سجل الأداء اليومي</h1>
        </div>
        <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem', fontSize: '1.1rem' }}>سجل تاريخي يضم ملخصات الأداء التي قمت بحفظها يومياً.</p>
      </header>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', width: '100%', paddingBottom: '4rem' }}>
        {logs.length === 0 ? (
          <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)', maxWidth: '1000px', margin: '0 auto', width: '100%' }}>
            <Calendar size={60} style={{ opacity: 0.3, marginBottom: '1rem' }} />
            <h2>لا توجد سجلات أداء بعد</h2>
            <p>قم بحفظ ملخص أدائك من صفحة "الملخص" ليظهر هنا.</p>
          </div>
        ) : (
          logs.map((log, index) => {
            const isExpanded = expandedIndex === index;
            const validNotes = log.notesList ? log.notesList.filter(n => n.trim() !== '') : [];

            return (
              <div key={index} className="glass-panel" style={{ 
                borderLeft: '4px solid var(--theme-color)',
                transition: 'all 0.3s',
                overflow: 'hidden'
              }}>
                <div 
                  onClick={() => setExpandedIndex(isExpanded ? null : index)}
                  style={{ 
                    padding: '1.5rem 2rem', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                    background: isExpanded ? 'rgba(255,255,255,0.02)' : 'transparent',
                    flexWrap: 'wrap',
                    gap: '1rem'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                    <div style={{ background: 'rgba(59, 130, 246, 0.1)', padding: '1rem', borderRadius: '50%', color: 'var(--theme-color)' }}>
                      <Calendar size={24} />
                    </div>
                    <div>
                      <h3 style={{ margin: '0 0 0.3rem 0', color: 'var(--text-primary)', fontSize: '1.2rem' }}>
                        {formatDate(log.date)}
                      </h3>
                      <div style={{ display: 'flex', gap: '1.5rem', color: 'var(--text-secondary)', fontSize: '0.9rem', flexWrap: 'wrap' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}><PhoneCall size={14}/> {log.manualCallsCount || 0} مكالمة</span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}><ListTodo size={14}/> مهام مدونة</span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}><StickyNote size={14}/> {validNotes.length} ملاحظات</span>
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleExportExcel(log); }}
                      style={{ 
                        padding: '0.6rem 1.2rem', 
                        background: 'rgba(59, 130, 246, 0.1)', 
                        color: 'var(--theme-color)', 
                        border: '1px solid var(--theme-color)', 
                        borderRadius: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        fontWeight: 'bold',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}
                      onMouseOver={(e) => e.target.style.background = 'rgba(59, 130, 246, 0.2)'}
                      onMouseOut={(e) => e.target.style.background = 'rgba(59, 130, 246, 0.1)'}
                    >
                      <Download size={18} /> تحميل إكسيل
                    </button>
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
  );
};

export default PerformanceLog;
