import React, { useState, useEffect } from 'react';
import { History, Calendar, PhoneCall, ListTodo, StickyNote, Activity, Download, ChevronDown, ChevronUp, Search, Trash2, RefreshCw } from 'lucide-react';
import * as XLSX from 'xlsx-js-style';
import api from '../services/api';
import "./Calls.scss";

const PerformanceLog = () => {
  const [logs, setLogs] = useState([]);
  const [expandedIndex, setExpandedIndex] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const response = await api.get('/data/performance-logs');
      const data = response.data || [];
      data.sort((a, b) => new Date(b.timestamp || b.date) - new Date(a.timestamp || a.date));
      setLogs(data);
    } catch (err) {
      console.error("Error fetching logs:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    document.title = "سجل المهام اليومي | مخصوص";
    fetchLogs();
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
    <div className="calls-page-container performancelog-style-1" >
      <header className="page-header performancelog-style-2" >
        <div className="title-section">
          <History size={32} className="header-icon" />
          <h1 className="page-title gradient-title performancelog-style-3" >سجل المهام</h1>
        </div>
        <div className="performancelog-style-4">
          <p className="performancelog-style-5">سجل بجميع ملخصات الأداء التي قمت بحفظها</p>
          <button className="pr-refresh-btn performancelog-style-6" onClick={fetchLogs} >
            <RefreshCw size={16} className={loading ? 'spinning' : ''} />
            تحديث
          </button>
        </div>
      </header>

      <div className="performancelog-style-7">
        {logs.length === 0 ? (
          <div className="glass-panel performancelog-style-8" >
            <Calendar size={60} className="performancelog-style-9" />
            <h2>لا توجد سجلات أداء بعد</h2>
            <p>قم بحفظ ملخص أدائك من صفحة "الملخص" ليظهر هنا.</p>
          </div>
        ) : (
          logs.map((log, index) => {
            const isExpanded = expandedIndex === index;
            const validNotes = log.notesList ? log.notesList.filter(n => n.trim() !== '') : [];

            return (
              <div key={index} className="glass-panel performancelog-style-10" >
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
                  <div className="performancelog-style-11">
                    <div className="performancelog-style-12">
                      <Calendar size={24} />
                    </div>
                    <div>
                      <h3 className="performancelog-style-13">
                        {formatDate(log.date)}
                      </h3>
                      <div className="performancelog-style-14">
                        <span className="performancelog-style-15"><PhoneCall size={14} /> {log.manualCallsCount || 0} مكالمة</span>
                        <span className="performancelog-style-16"><ListTodo size={14} /> مهام مدونة</span>
                        <span className="performancelog-style-17"><StickyNote size={14} /> {validNotes.length} ملاحظات</span>
                      </div>
                    </div>
                  </div>
                  <div className="performancelog-style-18">
                    <button
                      onClick={(e) => { e.stopPropagation(); handleExportExcel(log); }}
                      className="performancelog-style-19"
                      onMouseOver={(e) => e.target.style.background = 'rgba(59, 130, 246, 0.2)'}
                      onMouseOut={(e) => e.target.style.background = 'rgba(59, 130, 246, 0.1)'}
                    >
                      <Download size={18} /> تحميل إكسيل
                    </button>
                    <div className="performancelog-style-20">
                      {isExpanded ? <ChevronUp size={24} color="var(--text-secondary)" /> : <ChevronDown size={24} color="var(--text-secondary)" />}
                    </div>
                  </div>
                </div>

                {isExpanded && (
                  <div className="performancelog-style-21">

                    <div className="performancelog-style-22">
                      <h4 className="performancelog-style-23">
                        <ListTodo size={18} /> مهام المتابعة
                      </h4>
                      <div className="performancelog-style-24">
                        {log.tasks || <span className="performancelog-style-25">لا توجد مهام مدونة.</span>}
                      </div>
                    </div>

                    <div>
                      <h4 className="performancelog-style-26">
                        <StickyNote size={18} /> الملاحظات
                      </h4>
                      {validNotes.length > 0 ? (
                        <div className="performancelog-style-27">
                          {validNotes.map((note, idx) => (
                            <div key={idx} className="performancelog-style-28">
                              <span className="performancelog-style-29">{idx + 1}.</span>
                              {note}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="performancelog-style-30">
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
