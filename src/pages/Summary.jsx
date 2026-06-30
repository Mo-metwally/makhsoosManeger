import React, { useState, useEffect } from 'react';
import { FileText, PhoneCall, ListTodo, StickyNote, Save, Edit2, Check, Sparkles, Activity, Download, AlertCircle, X } from 'lucide-react';
import * as XLSX from 'xlsx-js-style';
import './Calls.css';

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
    const todayStr = now.toDateString();
    
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

  const calculateTodayCalls = (now) => {
    const savedCalls = JSON.parse(localStorage.getItem('call_reports') || '[]');
    const todayCalls = savedCalls.filter(call => {
      const callDate = new Date(call.createdAt);
      return callDate.toDateString() === now.toDateString();
    });
    setTodayCallsCount(todayCalls.length);
  };

  const handleSave = () => {
    if (!tasks.trim()) {
      showToast('عذراً، يجب تدوين مهام المتابعة أولاً.', 'error');
      return;
    }
    
    const validNotes = notesList.filter(n => n.trim() !== '');
    if (validNotes.length === 0) {
      showToast('عذراً، يجب إدخال ملاحظة واحدة على الأقل قبل الحفظ.', 'error');
      return;
    }

    const todayStr = new Date().toDateString();
    const summaryData = {
      date: todayStr,
      timestamp: new Date().toISOString(),
      tasks,
      notesList: validNotes,
      manualCallsCount: todayCallsCount
    };
    
    // Save to history
    const history = JSON.parse(localStorage.getItem('performance_logs') || '[]');
    const existingIndex = history.findIndex(log => log.date === todayStr);
    if (existingIndex >= 0) {
      history[existingIndex] = summaryData;
    } else {
      history.push(summaryData);
    }
    localStorage.setItem('performance_logs', JSON.stringify(history));

    // Clear fields
    setTasks('');
    setNotesList(['']);
    calculateTodayCalls(new Date());
    localStorage.removeItem('daily_summary'); // clear draft
    setIsEditingCalls(false);
    
    showToast('تم حفظ الملخص بنجاح وتفريغ الحقول!', 'success');
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
      <header className="page-header" style={{ marginBottom: '2rem' }}>
        <div className="title-section">
          <div style={{ position: 'relative' }}>
            <FileText size={32} className="header-icon" />
            <Sparkles size={16} color="var(--theme-color)" style={{ position: 'absolute', top: -5, right: -10, animation: 'pulse 2s infinite' }} />
          </div>
          <h1 className="page-title gradient-title" style={{ fontSize: '2.5rem' }}>ملخص الاداء</h1>
        </div>
        <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem', fontSize: '1.1rem' }}>نظرة عامة متقدمة على أدائك اليومي وتدوين ملاحظاتك المهمة.</p>
      </header>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2rem', width: '100%', paddingBottom: '4rem' }}>
        
        {/* Right Sidebar - Stats & Actions */}
        <div style={{ flex: '1 1 350px', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          
          {/* Calls Count Widget */}
          <div className="glass-panel" style={{ 
            padding: '2.5rem 2rem', 
            display: 'flex', 
            flexDirection: 'column',
            alignItems: 'center', 
            justifyContent: 'center',
            background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.15) 0%, rgba(0, 0, 0, 0.2) 100%)',
            borderTop: '4px solid var(--theme-color)',
            textAlign: 'center',
            position: 'relative',
            overflow: 'hidden'
          }}>
            <div style={{ opacity: 0.05, position: 'absolute', top: '-10%', left: '-10%' }}>
              <PhoneCall size={150} />
            </div>
            
            <div style={{ 
              background: 'linear-gradient(135deg, var(--theme-color), #8b5cf6)', 
              padding: '1.5rem', 
              borderRadius: '50%', 
              color: 'white', 
              boxShadow: '0 10px 30px var(--theme-glow)',
              marginBottom: '1.5rem',
              zIndex: 1
            }}>
              <PhoneCall size={40} />
            </div>
            
            <div style={{ zIndex: 1 }}>
              <h3 style={{ margin: '0 0 1rem 0', color: 'var(--text-secondary)', fontSize: '1.4rem' }}>إجمالي مكالمات اليوم</h3>
              {isEditingCalls ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem' }}>
                  <input 
                    type="number" 
                    value={todayCallsCount}
                    onChange={(e) => setTodayCallsCount(parseInt(e.target.value) || 0)}
                    style={{
                      fontSize: '3rem',
                      fontWeight: '900',
                      color: 'var(--text-primary)',
                      background: 'rgba(0,0,0,0.4)',
                      border: '2px solid var(--theme-color)',
                      borderRadius: '12px',
                      padding: '0.5rem 1rem',
                      width: '150px',
                      textAlign: 'center',
                      outline: 'none',
                      boxShadow: '0 0 20px var(--theme-glow)'
                    }}
                  />
                  <button onClick={() => setIsEditingCalls(false)} style={{ color: 'white', background: '#22c55e', padding: '1rem', borderRadius: '12px', boxShadow: '0 5px 15px rgba(34,197,94,0.4)' }}>
                    <Check size={24} />
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem' }}>
                  <p style={{ margin: 0, fontSize: '4rem', fontWeight: '900', color: 'var(--text-primary)', textShadow: '0 0 30px var(--theme-glow)', lineHeight: '1' }}>
                    {todayCallsCount}
                  </p>
                  <button onClick={() => setIsEditingCalls(true)} style={{ color: 'var(--btn-text-color, #ffffff)', background: 'var(--theme-color)', padding: '0.8rem', borderRadius: '12px', transition: 'all 0.3s', boxShadow: '0 5px 15px var(--theme-glow)' }}>
                    <Edit2 size={20} />
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Action Panel */}
          <div className="glass-panel" style={{ 
            padding: '2rem', 
            display: 'flex', 
            flexDirection: 'column', 
            gap: '1.5rem', 
            borderRight: '4px solid #22c55e',
            background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.05) 0%, rgba(0, 0, 0, 0.2) 100%)'
          }}>
            <h3 style={{ margin: '0', color: 'var(--text-primary)', fontSize: '1.3rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Save size={24} color="#22c55e" /> إجراءات الملخص
            </h3>
            
            <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '0.95rem' }}>
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
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.8rem',
                padding: '1.2rem',
                background: 'linear-gradient(135deg, var(--theme-color), #2563eb)',
                color: 'white',
                border: 'none',
                borderRadius: '16px',
                cursor: 'pointer',
                fontWeight: 'bold',
                fontSize: '1.2rem',
                boxShadow: '0 10px 25px var(--theme-glow)',
                transition: 'all 0.3s',
                width: '100%'
              }}
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
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.8rem',
                padding: '1.2rem',
                background: 'rgba(59, 130, 246, 0.1)',
                color: 'var(--theme-color)',
                border: '2px solid var(--theme-color)',
                borderRadius: '16px',
                cursor: 'pointer',
                fontWeight: 'bold',
                fontSize: '1.2rem',
                transition: 'all 0.3s',
                width: '100%'
              }}
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
        <div style={{ flex: '2 1 600px', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          
          {/* Tasks Section */}
          <div className="glass-panel" style={{ padding: '2.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1.5rem' }}>
              <div style={{ background: 'linear-gradient(135deg, #a855f7, #7c3aed)', padding: '1rem', borderRadius: '16px', color: 'white', boxShadow: '0 8px 20px rgba(168,85,247,0.4)' }}>
                <ListTodo size={28} />
              </div>
              <h2 style={{ margin: 0, color: 'var(--text-primary)', fontSize: '1.8rem', fontWeight: '800' }}>مهام المتابعة</h2>
            </div>
            <textarea 
              value={tasks}
              onChange={(e) => setTasks(e.target.value)}
              placeholder="قم بتدوين مهامك الأساسية هنا ليتم تتبعها بسهولة..."
              style={{
                width: '100%',
                minHeight: '200px',
                padding: '1.5rem',
                borderRadius: '20px',
                border: '2px solid rgba(255,255,255,0.05)',
                backgroundColor: 'rgba(0,0,0,0.3)',
                color: 'var(--text-primary)',
                fontFamily: 'inherit',
                fontSize: '1.2rem',
                lineHeight: '1.6',
                resize: 'vertical',
                transition: 'all 0.3s',
                boxShadow: 'inset 0 4px 15px rgba(0,0,0,0.5)'
              }}
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
          <div className="glass-panel" style={{ padding: '2.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1.5rem' }}>
              <div style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)', padding: '1rem', borderRadius: '16px', color: 'white', boxShadow: '0 8px 20px rgba(245,158,11,0.4)' }}>
                <StickyNote size={28} />
              </div>
              <h2 style={{ margin: 0, color: 'var(--text-primary)', fontSize: '1.8rem', fontWeight: '800' }}>الملاحظات الهامة</h2>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {notesList.map((note, index) => (
                <div key={index} style={{ position: 'relative' }}>
                  <div style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', width: '32px', height: '32px', background: 'rgba(245,158,11,0.2)', color: '#f59e0b', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '1.1rem' }}>
                    {index + 1}
                  </div>
                  <button
                    onClick={() => removeNote(index)}
                    style={{ position: 'absolute', top: '1.5rem', left: '1.5rem', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: 'none', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.3s' }}
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
                    style={{
                      width: '100%',
                      minHeight: '120px',
                      padding: '1.5rem 4rem 1.5rem 1.5rem',
                      borderRadius: '20px',
                      border: '2px solid rgba(255,255,255,0.05)',
                      backgroundColor: 'rgba(0,0,0,0.3)',
                      color: 'var(--text-primary)',
                      fontFamily: 'inherit',
                      fontSize: '1.15rem',
                      lineHeight: '1.6',
                      resize: 'vertical',
                      transition: 'all 0.3s',
                      boxShadow: 'inset 0 4px 15px rgba(0,0,0,0.5)'
                    }}
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

            <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'center' }}>
              <button 
                onClick={() => setNotesList([...notesList, ''])}
                style={{
                  padding: '1rem 3rem',
                  backgroundColor: 'rgba(245, 158, 11, 0.1)',
                  color: '#f59e0b',
                  border: '2px dashed #f59e0b',
                  borderRadius: '100px',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                  fontSize: '1.2rem',
                  transition: 'all 0.3s'
                }}
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
