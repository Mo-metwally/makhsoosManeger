import React, { useState, useEffect } from 'react';
import { FileText, PhoneCall, ListTodo, StickyNote, Save, Edit2, Check, Sparkles, Activity, Download, AlertCircle, X } from 'lucide-react';
import * as XLSX from 'xlsx-js-style';
import api from '../services/api';
import { getLogicalDateString } from '../utils/dateHelpers';
import "./Calls.scss";

const Summary = () => {
  const [todayCallsCount, setTodayCallsCount] = useState(0);
  const [isEditingCalls, setIsEditingCalls] = useState(false);
  const [tasks, setTasks] = useState('');
  const [notesList, setNotesList] = useState(['']);
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 4000);
  };

  const removeNote = (indexToRemove) => {
    if (notesList.length === 1) {
      setNotesList(['']);
    } else {
      setNotesList(notesList.filter((_, idx) => idx !== indexToRemove));
    }
  };

  useEffect(() => {
    document.title = "ملخص الاداء | مخصوص";
    
    const now = new Date();
    const todayStr = getLogicalDateString(now);
    
    // Load from daily_summary first to check if they saved a manual count
    const savedSummary = JSON.parse(localStorage.getItem('daily_summary') || '{}');
    
    if (savedSummary.date === todayStr) {
      setTasks(savedSummary.tasks || '');
      setNotesList(savedSummary.notesList || ['']);
      if (savedSummary.manualCallsCount !== undefined) {
        setTodayCallsCount(savedSummary.manualCallsCount);
      } else {
        calculateTodayCalls(now);
      }
    } else {
      calculateTodayCalls(now);
    }
  }, []);

  const calculateTodayCalls = async (now) => {
    try {
      const response = await api.get('/data/calls');
      const savedCalls = response.data || [];
      const todayCalls = savedCalls.filter(call => {
        const callDate = new Date(call.createdAt);
        return getLogicalDateString(callDate) === getLogicalDateString(now);
      });
      setTodayCallsCount(todayCalls.length);
    } catch (error) {
      console.error('Failed to fetch calls for summary', error);
      // Fallback
      setTodayCallsCount(0);
    }
  };

  const handleSave = async () => {
    if (!tasks.trim()) {
      showToast('عذراً، يجب تدوين مهام المتابعة أولاً.', 'error');
      return;
    }
    
    const validNotes = notesList.filter(n => n.trim() !== '');
    if (validNotes.length === 0) {
      showToast('عذراً، يجب إدخال ملاحظة واحدة على الأقل قبل الحفظ.', 'error');
      return;
    }

    const todayStr = getLogicalDateString();
    const summaryData = {
      date: todayStr,
      timestamp: new Date().toISOString(),
      tasks,
      notesList: validNotes,
      manualCallsCount: todayCallsCount
    };
    
    try {
      await api.post('/data/performance-logs', summaryData);
      
      // Clear fields
      setTasks('');
      setNotesList(['']);
      calculateTodayCalls(new Date());
      localStorage.removeItem('daily_summary'); // clear draft
      setIsEditingCalls(false);
      
      showToast('تم حفظ الملخص بنجاح!', 'success');
    } catch (error) {
      console.error(error);
      showToast('حدث خطأ أثناء حفظ الملخص.', 'error');
    }
  };

  const handleExportExcel = () => {
    const userName = localStorage.getItem('userName') || 'المستخدم';
    
    const rowData = {
      'اسم المشرف': userName,
      'المهمة': tasks || 'لا توجد',
      'عدد المكالمات': todayCallsCount,
    };
    
    notesList.forEach((note, index) => {
      rowData[`ملاحظة ${index + 1}`] = note || 'لا توجد ملاحظة';
    });

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
      { wch: 50 }, 
      { wch: 15 }, 
    ];
    for (let i = 0; i < notesList.length; i++) {
      colWidths.push({ wch: 40 });
    }
    ws['!cols'] = colWidths;
    ws['!dir'] = 'rtl';

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "ملخص الأداء");
    
    const todayStr = new Date().toISOString().split('T')[0];
    XLSX.writeFile(wb, `ملخص_الاداء_${userName}_${todayStr}.xlsx`);
  };

  return (
    <div className="calls-page-container">
      <header className="page-header summary-style-1" >
        <div className="title-section">
          <div className="summary-style-2">
            <FileText size={32} className="header-icon" />
            <Sparkles size={16} color="var(--theme-color)" style={{ position: 'absolute', top: -5, right: -10, animation: 'pulse 2s infinite' }} />
          </div>
          <h1 className="page-title gradient-title summary-style-3" >ملخص الاداء</h1>
        </div>
        <p className="summary-style-4">نظرة عامة متقدمة على أدائك اليومي وتدوين ملاحظاتك المهمة.</p>
      </header>

      <div className="summary-style-5">
        
        {/* Right Sidebar - Stats & Actions */}
        <div className="summary-style-6">
          
          {/* Calls Count Widget */}
          <div className="glass-panel summary-style-7" >
            <div className="summary-style-8">
              <PhoneCall size={150} />
            </div>
            
            <div className="summary-style-9">
              <PhoneCall size={40} />
            </div>
            
            <div className="summary-style-10">
              <h3 className="summary-style-11">إجمالي مكالمات اليوم</h3>
              {isEditingCalls ? (
                <div className="summary-style-12">
                  <input 
                    type="number" 
                    value={todayCallsCount}
                    onChange={(e) => setTodayCallsCount(parseInt(e.target.value) || 0)}
                    className="summary-style-13"
                  />
                  <button onClick={() => setIsEditingCalls(false)} className="summary-style-14">
                    <Check size={24} />
                  </button>
                </div>
              ) : (
                <div className="summary-style-15">
                  <p className="summary-style-16">
                    {todayCallsCount}
                  </p>
                  <button onClick={() => setIsEditingCalls(true)} className="summary-style-17">
                    <Edit2 size={20} />
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Action Panel */}
          <div className="glass-panel summary-style-18" >
            <h3 className="summary-style-19">
              <Save size={24} color="#22c55e" /> إجراءات الملخص
            </h3>
            
            <p className="summary-style-20">
              احفظ تقدمك باستمرار وتأكد من تنزيل تقريرك اليومي قبل نهاية الدوام.
            </p>

            {toast.show && (
              <div style={{ 
                background: toast.type === 'success' ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)', 
                color: toast.type === 'success' ? '#22c55e' : '#ef4444', 
                padding: '1rem', 
                borderRadius: '12px', 
                fontWeight: 'bold', 
                border: `1px solid ${toast.type === 'success' ? '#22c55e' : '#ef4444'}`,
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                animation: 'overlayFadeIn 0.3s ease'
              }}>
                {toast.type === 'success' ? <Check size={20} /> : <AlertCircle size={20} />}
                {toast.message}
              </div>
            )}
            
            <button 
              onClick={handleSave}
              className="summary-style-21"
              onMouseOver={(e) => {
                e.target.style.transform = 'translateY(-3px)';
                e.target.style.boxShadow = '0 15px 35px var(--theme-glow)';
              }}
              onMouseOut={(e) => {
                e.target.style.transform = 'translateY(0)';
                e.target.style.boxShadow = '0 10px 25px var(--theme-glow)';
              }}
            >
              <Save size={24} />
              حفظ التغييرات
            </button>
            
            <button 
              onClick={handleExportExcel}
              className="summary-style-22"
              onMouseOver={(e) => {
                e.target.style.background = 'rgba(59, 130, 246, 0.2)';
                e.target.style.transform = 'translateY(-2px)';
              }}
              onMouseOut={(e) => {
                e.target.style.background = 'rgba(59, 130, 246, 0.1)';
                e.target.style.transform = 'translateY(0)';
              }}
            >
              <Download size={24} />
              تحميل التقرير إكسيل
            </button>
          </div>
        </div>

        {/* Main Content - Tasks & Notes */}
        <div className="summary-style-23">
          
          {/* Tasks Section */}
          <div className="glass-panel summary-style-24" >
            <div className="summary-style-25">
              <div className="summary-style-26">
                <ListTodo size={28} />
              </div>
              <h2 className="summary-style-27">مهام المتابعة</h2>
            </div>
            <textarea 
              value={tasks}
              onChange={(e) => setTasks(e.target.value)}
              placeholder="قم بتدوين مهامك الأساسية هنا ليتم تتبعها بسهولة..."
              className="summary-style-28"
              onFocus={(e) => {
                e.target.style.borderColor = '#a855f7';
                e.target.style.boxShadow = '0 0 20px rgba(168, 85, 247, 0.2), inset 0 4px 15px rgba(0,0,0,0.5)';
                e.target.style.backgroundColor = 'rgba(0,0,0,0.5)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = 'rgba(255,255,255,0.05)';
                e.target.style.boxShadow = 'inset 0 4px 15px rgba(0,0,0,0.5)';
                e.target.style.backgroundColor = 'rgba(0,0,0,0.3)';
              }}
            />
          </div>

          {/* Notes Section */}
          <div className="glass-panel summary-style-29" >
            <div className="summary-style-30">
              <div className="summary-style-31">
                <StickyNote size={28} />
              </div>
              <h2 className="summary-style-32">الملاحظات الهامة</h2>
            </div>
            
            <div className="summary-style-33">
              {notesList.map((note, index) => (
                <div key={index} className="summary-style-34">
                  <div className="summary-style-35">
                    {index + 1}
                  </div>
                  <button
                    onClick={() => removeNote(index)}
                    className="summary-style-36"
                    onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)'; e.currentTarget.style.transform = 'scale(1.1)'; }}
                    onMouseOut={(e) => { e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'; e.currentTarget.style.transform = 'scale(1)'; }}
                    title="حذف الملاحظة"
                  >
                    <X size={16} />
                  </button>
                  <textarea 
                    value={note}
                    onChange={(e) => {
                      const updated = [...notesList];
                      updated[index] = e.target.value;
                      setNotesList(updated);
                    }}
                    placeholder={`الملاحظة رقم ${index + 1}...`}
                    className="summary-style-37"
                    onFocus={(e) => {
                      e.target.style.borderColor = '#f59e0b';
                      e.target.style.boxShadow = '0 0 20px rgba(245, 158, 11, 0.2), inset 0 4px 15px rgba(0,0,0,0.5)';
                      e.target.style.backgroundColor = 'rgba(0,0,0,0.5)';
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = 'rgba(255,255,255,0.05)';
                      e.target.style.boxShadow = 'inset 0 4px 15px rgba(0,0,0,0.5)';
                      e.target.style.backgroundColor = 'rgba(0,0,0,0.3)';
                    }}
                  />
                </div>
              ))}
            </div>

            <div className="summary-style-38">
              <button 
                onClick={() => setNotesList([...notesList, ''])}
                className="summary-style-39"
                onMouseOver={(e) => {
                  e.target.style.backgroundColor = 'rgba(245, 158, 11, 0.2)';
                  e.target.style.transform = 'translateY(-2px)';
                  e.target.style.boxShadow = '0 5px 15px rgba(245,158,11,0.2)';
                }}
                onMouseOut={(e) => {
                  e.target.style.backgroundColor = 'rgba(245, 158, 11, 0.1)';
                  e.target.style.transform = 'translateY(0)';
                  e.target.style.boxShadow = 'none';
                }}
              >
                + إضافة ملاحظة جديدة
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default Summary;
