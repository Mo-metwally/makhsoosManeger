import './HandleAdminAdd.scss';
import React, { useState, useRef, useEffect } from 'react';
import { UploadCloud, CheckCircle, AlertTriangle, Database } from 'lucide-react';
import * as zip from '@zip.js/zip.js';
import * as XLSX from 'xlsx-js-style';
import AdminGuard from '../components/AdminGuard';
import { parseArabicDate } from '../utils/filterAndSort';

const HandleAdminAdd = () => {
  const [isDragging, setIsDragging] = useState(false);
  const [status, setStatus] = useState({ type: '', message: '' });
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    document.title = "رفع التقارير المجمعة | مخصوص";
  }, []);

  const parseCallsData = (data) => {
    if (!data || data.length === 0 || (data.length === 1 && data[0]['رسالة'])) return 0;
    const formattedCalls = data.map(row => ({
      id: Date.now() + Math.random(),
      supervisorName: row['اسم المشرف'] || 'غير معروف',
      agentName: row['اسم المندوب'] || '',
      phone: String(row['رقم الهاتف'] || ''),
      city: row['المحافظة/المدينة'] || '',
      commMethod: row['طريقة التواصل'] || 'مكالمة هاتفية',
      agentStatus: row['حالة المندوب'] || '',
      callStatus: row['حالة المكالمة'] || '',
      report: row['التقرير'] || '',
      createdAt: row['ISO_DATE'] || new Date().toISOString(),
      originalDateString: row['تاريخ ووقت المكالمة']
    }));
    const existingData = JSON.parse(localStorage.getItem('admin_aggregated_calls') || '[]');
    localStorage.setItem('admin_aggregated_calls', JSON.stringify([...existingData, ...formattedCalls]));
    return formattedCalls.length;
  };

  const parseLogsData = (logsData) => {
    if (!logsData || logsData.length === 0 || logsData[0]['رسالة']) return 0;
    const formattedLogs = logsData
      .filter(row => {
        const name1 = row['المشرف'] || '';
        const name2 = row['المشرف (رافع التقرير)'] || '';
        return !name1.startsWith('إجمالي') && !name2.startsWith('إجمالي') && !name1.startsWith('الإجمالي') && !name2.startsWith('الإجمالي');
      })
      .map(row => ({
        id: Date.now() + Math.random(),
        supervisorName: row['المشرف'] || row['المشرف (رافع التقرير)'] || 'غير معروف',
        type: row['نوع الفترة'] || 'غير معروف',
        createdAt: row['ISO_DATE'] || new Date().toISOString(),
        startTimeString: row['وقت البداية'] || '',
        endTimeString: row['وقت العودة'] || '',
        durationString: row['المدة الإجمالية'] || ''
      }));
    const existingLogs = JSON.parse(localStorage.getItem('admin_aggregated_logs') || '[]');
    localStorage.setItem('admin_aggregated_logs', JSON.stringify([...existingLogs, ...formattedLogs]));
    return formattedLogs.length;
  };

  const parsePerfData = (perfData) => {
    if (!perfData || perfData.length === 0 || perfData[0]['رسالة']) return 0;
    const formattedPerf = perfData.map(row => {
      const notes = [];
      Object.keys(row).forEach(key => {
        if (key.startsWith('ملاحظة') && row[key] !== 'لا توجد ملاحظة') {
          notes.push(row[key]);
        }
      });
      return {
        id: Date.now() + Math.random(),
        supervisorName: row['اسم المشرف'] || 'غير معروف',
        date: row['التاريخ'] || '',
        createdAt: row['ISO_DATE'] || parseArabicDate(row['التاريخ']),
        tasks: row['المهمة'] || '',
        manualCallsCount: parseInt(row['عدد المكالمات']) || 0,
        notesList: notes
      };
    });
    const existingPerf = JSON.parse(localStorage.getItem('admin_aggregated_performance') || '[]');
    localStorage.setItem('admin_aggregated_performance', JSON.stringify([...existingPerf, ...formattedPerf]));
    return formattedPerf.length;
  };

  const processZipFile = async (file) => {
    setIsProcessing(true);
    setStatus({ type: 'info', message: 'جاري فك تشفير وقراءة الملف...' });

    try {
      const zipReader = new zip.ZipReader(new zip.BlobReader(file), { password: "65410" });
      const entries = await zipReader.getEntries();
      
      let callsCount = 0;
      let logsCount = 0;
      let perfCount = 0;

      const callsEntry = entries.find(e => e.filename === 'سجل_المكالمات.xlsx' || e.filename.includes('مكالمات'));
      if (callsEntry) {
        const callsBlob = await callsEntry.getData(new zip.BlobWriter());
        const wb = XLSX.read(await callsBlob.arrayBuffer(), { type: 'array' });
        callsCount = parseCallsData(XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]));
      }

      const logsEntry = entries.find(e => e.filename === 'report.xlsx' || e.filename.includes('report') || e.filename.includes('الخمول'));
      if (logsEntry) {
        const logsBlob = await logsEntry.getData(new zip.BlobWriter());
        const wbLogs = XLSX.read(await logsBlob.arrayBuffer(), { type: 'array' });
        logsCount = parseLogsData(XLSX.utils.sheet_to_json(wbLogs.Sheets[wbLogs.SheetNames[0]]));
      }

      const perfEntry = entries.find(e => e.filename === 'تقرير_الأداء.xlsx' || e.filename.includes('الأداء'));
      if (perfEntry) {
        const perfBlob = await perfEntry.getData(new zip.BlobWriter());
        const wbPerf = XLSX.read(await perfBlob.arrayBuffer(), { type: 'array' });
        perfCount = parsePerfData(XLSX.utils.sheet_to_json(wbPerf.Sheets[wbPerf.SheetNames[0]]));
      }

      if (callsCount === 0 && logsCount === 0 && perfCount === 0) {
        setStatus({ type: 'warning', message: 'الملف المضغوط لا يحتوي على أي تقارير صالحة.' });
      } else {
        setStatus({ type: 'success', message: `تم رفع ${callsCount} مكالمة و ${logsCount} فترة نشاط و ${perfCount} تقرير أداء بنجاح!` });
      }
      
      await zipReader.close();
    } catch (error) {
      console.error(error);
      setStatus({ type: 'error', message: 'حدث خطأ أثناء قراءة ملف الـ ZIP. تأكد من أنه الملف الصحيح وأنه غير تالف.' });
    }
    setIsProcessing(false);
  };

  const processExcelFiles = async (filesArray) => {
    setIsProcessing(true);
    setStatus({ type: 'info', message: 'جاري قراءة الملفات...' });
    let totalCalls = 0;
    let totalLogs = 0;
    let totalPerf = 0;

    try {
      for (const file of filesArray) {
        const arrayBuffer = await file.arrayBuffer();
        const wb = XLSX.read(arrayBuffer, { type: 'array' });
        const data = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);

        if (file.name.includes('سجل_المكالمات') || file.name.includes('مكالمات')) {
          totalCalls += parseCallsData(data);
        } else if (file.name.includes('report') || file.name.includes('الخمول')) {
          totalLogs += parseLogsData(data);
        } else if (file.name.includes('الأداء')) {
          totalPerf += parsePerfData(data);
        }
      }
      
      if (totalCalls === 0 && totalLogs === 0 && totalPerf === 0) {
        setStatus({ type: 'warning', message: 'الملفات المرفوعة لا تحتوي على بيانات مدعومة.' });
      } else {
        setStatus({ type: 'success', message: `تم رفع ${totalCalls} مكالمة و ${totalLogs} فترة نشاط و ${totalPerf} تقرير أداء بنجاح!` });
      }
    } catch (error) {
      console.error(error);
      setStatus({ type: 'error', message: 'حدث خطأ أثناء قراءة ملفات الإكسيل.' });
    }
    setIsProcessing(false);
  };

  const handleFiles = (filesList) => {
    const filesArray = Array.from(filesList);
    if (filesArray.length === 0) return;
    
    const zipFiles = filesArray.filter(f => f.name.endsWith('.zip'));
    const excelFiles = filesArray.filter(f => f.name.endsWith('.xlsx'));
    
    if (zipFiles.length > 0) {
      processZipFile(zipFiles[0]); // handles 1 zip at a time
    } else if (excelFiles.length > 0) {
      processExcelFiles(excelFiles);
    } else {
      setStatus({ type: 'error', message: 'يرجى اختيار ملفات بصيغة ZIP أو XLSX فقط.' });
    }
  };

  const handleFileChange = (e) => handleFiles(e.target.files);

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    handleFiles(e.dataTransfer.files);
  };

  return (
    <AdminGuard>
      <div className="home-container">
        <header className="page-header handleadminadd-style-1" >
          <div className="page-title-wrapper">
            <Database size={28} className="title-icon text-blue" />
            <h1 className="page-title gradient-title">تجميع بيانات المستخدمين</h1>
          </div>
        </header>

        <div className="dashboard-card handleadminadd-style-2" >
          <h2 className="handleadminadd-style-3">رفع ملفات المندوبين (.zip / .xlsx)</h2>
          <p className="handleadminadd-style-4">
            قم بسحب وإفلات ملف الـ ZIP المحمي، أو ملفات الـ Excel الفردية ليتم إضافتها لقاعدة بيانات الإدارة.
          </p>

          <div
            className={`upload-zone ${isDragging ? 'dragging' : ''}`}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => !isProcessing && fileInputRef.current.click()}
            style={{
              border: `2px dashed ${isDragging ? 'var(--theme-color)' : 'rgba(255,255,255,0.2)'}`,
              borderRadius: '16px',
              padding: '4rem 2rem',
              backgroundColor: isDragging ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.1)',
              cursor: isProcessing ? 'not-allowed' : 'pointer',
              transition: 'all 0.3s',
              opacity: isProcessing ? 0.6 : 1
            }}
          >
            <UploadCloud size={60} color={isDragging ? 'var(--theme-color)' : 'var(--text-secondary)'} className="handleadminadd-style-5" />
            <h3 className="handleadminadd-style-6">{isProcessing ? 'جاري المعالجة...' : 'اختر الملفات أو اسحبها هنا'}</h3>
            <p className="handleadminadd-style-7">صيغة الملف المدعومة: ZIP (محمي) أو XLSX</p>
            <input
              type="file"
              accept=".zip, .xlsx"
              multiple
              ref={fileInputRef}
              onChange={handleFileChange}
              className="handleadminadd-style-8"
            />
          </div>

          {status.message && (
            <div style={{
              marginTop: '2rem',
              padding: '1rem',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              backgroundColor: status.type === 'error' ? 'rgba(239, 68, 68, 0.1)' :
                status.type === 'success' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(59, 130, 246, 0.1)',
              color: status.type === 'error' ? '#ef4444' :
                status.type === 'success' ? '#22c55e' : '#3b82f6',
              border: `1px solid ${status.type === 'error' ? '#ef4444' :
                status.type === 'success' ? '#22c55e' : '#3b82f6'}`
            }}>
              {status.type === 'error' ? <AlertTriangle size={20} /> : <CheckCircle size={20} />}
              {status.message}
            </div>
          )}
        </div>
      </div>
    </AdminGuard>
  );
};

export default HandleAdminAdd;
