import React, { useState, useRef, useEffect } from 'react';
import { UploadCloud, CheckCircle, AlertTriangle, Database } from 'lucide-react';
import * as zip from '@zip.js/zip.js';
import * as XLSX from 'xlsx-js-style';
import AdminGuard from '../components/AdminGuard';

const HandleAdminAdd = () => {
  const [isDragging, setIsDragging] = useState(false);
  const [status, setStatus] = useState({ type: '', message: '' });
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    document.title = "رفع التقارير المجمعة | مخصوص";
  }, []);

  const processZipFile = async (file) => {
    setIsProcessing(true);
    setStatus({ type: 'info', message: 'جاري فك تشفير وقراءة الملف...' });

    try {
      const zipReader = new zip.ZipReader(new zip.BlobReader(file), { password: "65410" });
      const entries = await zipReader.getEntries();

      const callsEntry = entries.find(e => e.filename === 'سجل_المكالمات.xlsx' || e.filename.includes('مكالمات'));

      if (!callsEntry) {
        setStatus({ type: 'error', message: 'لم يتم العثور على ملف سجل المكالمات داخل الـ ZIP.' });
        setIsProcessing(false);
        await zipReader.close();
        return;
      }

      const blobWriter = new zip.BlobWriter();
      const blob = await callsEntry.getData(blobWriter);
      const arrayBuffer = await blob.arrayBuffer();

      const wb = XLSX.read(arrayBuffer, { type: 'array' });
      const wsName = wb.SheetNames[0];
      const ws = wb.Sheets[wsName];
      const data = XLSX.utils.sheet_to_json(ws);

      if (!data || data.length === 0 || (data.length === 1 && data[0]['رسالة'])) {
        setStatus({ type: 'warning', message: 'الملف لا يحتوي على بيانات مكالمات صحيحة.' });
        setIsProcessing(false);
        await zipReader.close();
        return;
      }

      // Map to standardized format
      const formattedCalls = data.map(row => ({
        id: Date.now() + Math.random(), // Unique ID
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
      const newData = [...existingData, ...formattedCalls];

      localStorage.setItem('admin_aggregated_calls', JSON.stringify(newData));

      // Now parse report.xlsx (inactivity logs)
      const logsEntry = entries.find(e => e.filename === 'report.xlsx' || e.filename.includes('report'));
      let logsCount = 0;
      if (logsEntry) {
        const logsBlob = await logsEntry.getData(new zip.BlobWriter());
        const logsArrayBuffer = await logsBlob.arrayBuffer();
        const wbLogs = XLSX.read(logsArrayBuffer, { type: 'array' });
        const wsLogs = wbLogs.Sheets[wbLogs.SheetNames[0]];
        const logsData = XLSX.utils.sheet_to_json(wsLogs);

        if (logsData && logsData.length > 0 && !logsData[0]['رسالة']) {
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
          const newLogsData = [...existingLogs, ...formattedLogs];
          localStorage.setItem('admin_aggregated_logs', JSON.stringify(newLogsData));
          logsCount = formattedLogs.length;
        }
      }

      setStatus({ type: 'success', message: `تم رفع ${formattedCalls.length} مكالمة و ${logsCount} فترة نشاط/خمول بنجاح!` });
      await zipReader.close();

    } catch (error) {
      console.error(error);
      setStatus({ type: 'error', message: 'حدث خطأ أثناء قراءة الملف. تأكد من أنه الملف الصحيح وأنه لم يتلف.' });
    }

    setIsProcessing(false);
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.name.endsWith('.zip')) {
        processZipFile(file);
      } else {
        setStatus({ type: 'error', message: 'يرجى اختيار ملف بصيغة ZIP فقط.' });
      }
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) {
      if (file.name.endsWith('.zip')) {
        processZipFile(file);
      } else {
        setStatus({ type: 'error', message: 'يرجى اختيار ملف بصيغة ZIP فقط.' });
      }
    }
  };

  return (
    <AdminGuard>
      <div className="home-container">
        <header className="page-header" style={{ justifyContent: 'center', textAlign: 'center' }}>
          <div className="page-title-wrapper">
            <Database size={28} className="title-icon text-blue" />
            <h1 className="page-title gradient-title">تجميع بيانات المستخدمين</h1>
          </div>
        </header>

        <div className="dashboard-card" style={{ maxWidth: '600px', margin: '2rem auto', textAlign: 'center', padding: '3rem 2rem' }}>
          <h2 style={{ marginBottom: '1rem', color: 'var(--text-primary)' }}>رفع ملفات المندوبين (.zip)</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem', lineHeight: '1.6' }}>
            قم بسحب وإفلات ملف الـ ZIP الذي تم استخراجه من قبل المندوب هنا، ليتم فك تشفيره آلياً وإضافة محتواه لقاعدة بيانات الإدارة.
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
            <UploadCloud size={60} color={isDragging ? 'var(--theme-color)' : 'var(--text-secondary)'} style={{ marginBottom: '1rem' }} />
            <h3 style={{ color: 'var(--text-primary)' }}>{isProcessing ? 'جاري المعالجة...' : 'اختر الملف أو اسحبه هنا'}</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.5rem' }}>صيغة الملف المدعومة: ZIP (محمي)</p>
            <input
              type="file"
              accept=".zip"
              ref={fileInputRef}
              onChange={handleFileChange}
              style={{ display: 'none' }}
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
