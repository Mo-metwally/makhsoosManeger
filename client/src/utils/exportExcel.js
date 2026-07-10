import * as XLSX from 'xlsx-js-style';
import * as zip from '@zip.js/zip.js';
import { getLogicalDateString, getLogicalDateObj } from './dateHelpers';
import api from '../services/api';
import { applyFiltersAndSort, parseArabicDate } from './filterAndSort';

// Helpers
const formatDuration = (ms) => {
  const minutes = Math.floor(ms / (1000 * 60));
  if (minutes >= 60) {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${h} ساعة و ${m} دقيقة`;
  }
  return `${minutes} دقيقة`;
};

const getFilteredData = (data, filterType, dateField, startDate, endDate) => {
  const now = getLogicalDateObj();

  if (filterType === 'all') return data;

  if (filterType === 'custom' && startDate && endDate) {
    return data.filter(item => {
      const itemDate = new Date(item[dateField]);
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      return itemDate >= start && itemDate <= end;
    });
  }

  return data.filter(item => {
    const itemDate = new Date(item[dateField]);

    if (filterType === 'today') {
      return getLogicalDateString(itemDate) === getLogicalDateString();
    }

    if (filterType === 'yesterday') {
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      return getLogicalDateString(itemDate) === getLogicalDateString(yesterday);
    }

    if (filterType === 'week') {
      const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      return itemDate >= oneWeekAgo;
    }

    if (filterType === 'month') {
      return itemDate.getMonth() === now.getMonth() && itemDate.getFullYear() === now.getFullYear();
    }

    return true;
  });
};

const getCallsSheet = (filterType, startDate, endDate, passedData = null) => {
  const allCalls = passedData || JSON.parse(localStorage.getItem('call_reports') || '[]');
  const filteredCalls = getFilteredData(allCalls, filterType, 'createdAt', startDate, endDate);
  const userName = localStorage.getItem('userName') || 'المشرف';

  const callsData = filteredCalls.map(call => ({
    'ISO_DATE': new Date(call.createdAt).toISOString(),
    'اسم المشرف': userName,
    'اسم المندوب': call.agentName,
    'رقم الهاتف': call.phone,
    'المحافظة/المدينة': call.city,
    'طريقة التواصل': call.commMethod || 'مكالمة هاتفية',
    'حالة المندوب': call.agentStatus,
    'حالة المكالمة': call.callStatus,
    'التقرير': call.report,
    'تاريخ ووقت المكالمة': new Date(call.createdAt).toLocaleString('ar-EG', {
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit'
    })
  }));

  const wsCalls = XLSX.utils.json_to_sheet(callsData.length ? callsData : [{ 'رسالة': 'لا توجد مكالمات مسجلة اليوم' }]);
  wsCalls['!dir'] = 'rtl';

  if (callsData.length > 0) {
    const range = XLSX.utils.decode_range(wsCalls['!ref']);
    for (let R = range.s.r + 1; R <= range.e.r; ++R) {
      const dataIdx = R - 1;
      const rowData = callsData[dataIdx];
      let rgb = null;

      if (rowData['حالة المكالمة'] === 'مهتم (موافق)') {
        if (rowData['حالة المندوب'] === 'رخصة وموتوسيكل') rgb = "C6EFCE";
        else if (rowData['حالة المندوب'] === 'رخصة قيادة') rgb = "E2EFDA";
      } else if (rowData['حالة المكالمة'] === 'تم إرسال تفاصيل') {
        rgb = "DDEBF7";
      } else if (rowData['حالة المكالمة'] === 'لا يوجد رد') {
        rgb = "FFF2CC";
      } else if (rowData['حالة المكالمة'] === 'رفض') {
        rgb = "FFC7CE";
      }

      if (rgb) {
        for (let C = range.s.c; C <= range.e.c; ++C) {
          const cellRef = XLSX.utils.encode_cell({ c: C, r: R });
          if (!wsCalls[cellRef]) continue;
          wsCalls[cellRef].s = {
            fill: {
              patternType: 'solid',
              fgColor: { rgb }
            }
          };
        }
      }
    }
  }

  return wsCalls;
};

const getLogsSheet = (filterType, userName, startDate, endDate, passedData = null) => {
  const allLogs = passedData || JSON.parse(localStorage.getItem('inactivity_logs') || '[]');
  const filteredLogs = getFilteredData(allLogs, filterType, 'startTime', startDate, endDate);

  const logsData = filteredLogs.map(log => ({
    'ISO_DATE': new Date(log.startTime).toISOString(),
    'المشرف': userName,
    'نوع الفترة': (!log.type || log.type === 'idle') ? 'خمول تجاوز الحد' : log.type,
    'وقت البداية': new Date(log.startTime).toLocaleString('ar-EG', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }),
    'وقت العودة': new Date(log.endTime).toLocaleString('ar-EG', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }),
    'المدة الإجمالية': formatDuration(log.durationMs)
  }));

  if (logsData.length > 0) {
    const totalMs = filteredLogs.reduce((sum, log) => sum + (log.durationMs || 0), 0);
    const totalMinutes = Math.floor(totalMs / (1000 * 60));

    logsData.push({
      'ISO_DATE': '',
      'المشرف': 'إجمالي اليوم',
      'نوع الفترة': '',
      'وقت البداية': '',
      'وقت العودة': '',
      'المدة الإجمالية': `${totalMinutes} دقيقة`
    });
  }

  const wsLogs = XLSX.utils.json_to_sheet(logsData.length ? logsData : [{ 'رسالة': 'لا توجد فترات خمول أو راحة اليوم' }]);
  wsLogs['!dir'] = 'rtl';
  return wsLogs;
};

const getPerformanceSheet = (filterType, userName, startDate, endDate, passedData = null) => {
  const allLogs = passedData || JSON.parse(localStorage.getItem('performance_logs') || '[]');
  const dateField = (allLogs.length > 0 && allLogs[0].createdAt) ? 'createdAt' : 'timestamp';
  const filteredLogs = getFilteredData(allLogs, filterType, dateField, startDate, endDate);

  const formatDate = (dateStr) => {
    try {
      const d = new Date(dateStr);
      return new Intl.DateTimeFormat('ar-EG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }).format(d);
    } catch {
      return dateStr;
    }
  };

  const performanceData = [];
  filteredLogs.forEach(log => {
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
    performanceData.push(rowData);
  });

  const wsPerf = XLSX.utils.json_to_sheet(performanceData.length ? performanceData : [{ 'رسالة': 'لا توجد تقارير أداء مسجلة' }]);
  wsPerf['!dir'] = 'rtl';
  return wsPerf;
};

export const exportToExcel = async (filterType = 'today', startDate, endDate) => {
  const todayStr = getLogicalDateString();
  const userName = localStorage.getItem('userName') || 'المشرف';

  let dbCalls = null;
  let dbLogs = null;
  let dbPerf = null;
  
  try {
     const [resCalls, resLogs, resPerf] = await Promise.all([
       api.get('/data/calls'),
       api.get('/data/inactivity'),
       api.get('/data/performance-logs')
     ]);
     dbCalls = resCalls.data;
     dbLogs = resLogs.data;
     dbPerf = resPerf.data;
  } catch (error) {
     console.error('Failed to fetch personal data for export, falling back to local storage', error);
  }

  const wsCalls = getCallsSheet(filterType, startDate, endDate, dbCalls);
  const wsLogs = getLogsSheet(filterType, userName, startDate, endDate, dbLogs);
  const wsPerf = getPerformanceSheet(filterType, userName, startDate, endDate, dbPerf);

  const wbCalls = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wbCalls, wsCalls, "سجل المكالمات");

  const wbLogs = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wbLogs, wsLogs, "فترات الخمول والراحة");

  const wbPerf = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wbPerf, wsPerf, "تقرير الأداء");

  const callsBuffer = XLSX.write(wbCalls, { bookType: 'xlsx', type: 'array' });
  const logsBuffer = XLSX.write(wbLogs, { bookType: 'xlsx', type: 'array' });
  const perfBuffer = XLSX.write(wbPerf, { bookType: 'xlsx', type: 'array' });

  const blobWriter = new zip.BlobWriter("application/zip");
  const zipWriter = new zip.ZipWriter(blobWriter, { password: "65410" });

  await zipWriter.add("سجل_المكالمات.xlsx", new zip.Uint8ArrayReader(new Uint8Array(callsBuffer)));
  await zipWriter.add("فترات_الخمول_والراحة.xlsx", new zip.Uint8ArrayReader(new Uint8Array(logsBuffer)));
  await zipWriter.add("تقرير_الأداء.xlsx", new zip.Uint8ArrayReader(new Uint8Array(perfBuffer)));

  const zipBlob = await zipWriter.close();

  const fileName = `تقرير_شامل_${userName}_${filterType}_${todayStr}.zip`;
  const url = URL.createObjectURL(zipBlob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

export const exportCallsOnly = (filterType = 'today', startDate, endDate) => {
  const todayStr = getLogicalDateString();
  const userName = localStorage.getItem('userName') || 'المشرف';
  const wsCalls = getCallsSheet(filterType, startDate, endDate);

  const wbCalls = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wbCalls, wsCalls, "سجل المكالمات");

  const fileName = `مكالمات_${userName}_${filterType}_${todayStr}.xlsx`;
  XLSX.writeFile(wbCalls, fileName);
};

export const getAdminCallsSheet = (filteredData) => {
  const callsData = filteredData.map(call => ({
    'المشرف': call.supervisorName || '-',
    'اسم المندوب': call.agentName,
    'رقم الهاتف': call.phone,
    'المحافظة/المدينة': call.city,
    'طريقة التواصل': call.commMethod,
    'حالة المندوب': call.agentStatus,
    'حالة المكالمة': call.callStatus,
    'التقرير': call.report,
    'تاريخ التقرير الأصلي': call.originalDateString || (call.createdAt ? new Date(call.createdAt).toLocaleString('ar-EG', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }) : '-')
  }));

  const wsCalls = XLSX.utils.json_to_sheet(callsData.length ? callsData : [{ 'رسالة': 'لا توجد بيانات' }]);
  wsCalls['!dir'] = 'rtl';

  if (callsData.length > 0) {
    const range = XLSX.utils.decode_range(wsCalls['!ref']);
    for (let R = range.s.r + 1; R <= range.e.r; ++R) {
      const dataIdx = R - 1;
      const rowData = callsData[dataIdx];
      let rgb = null;

      if (rowData['حالة المكالمة'] === 'مهتم (موافق)') {
        if (rowData['حالة المندوب'] === 'رخصة وموتوسيكل') rgb = "C6EFCE";
        else if (rowData['حالة المندوب'] === 'رخصة قيادة') rgb = "E2EFDA";
      } else if (rowData['حالة المكالمة'] === 'تم إرسال تفاصيل') {
        rgb = "DDEBF7";
      } else if (rowData['حالة المكالمة'] === 'لا يوجد رد') {
        rgb = "FFF2CC";
      } else if (rowData['حالة المكالمة'] === 'رفض') {
        rgb = "FFC7CE";
      }

      if (rgb) {
        for (let C = range.s.c; C <= range.e.c; ++C) {
          const cellRef = XLSX.utils.encode_cell({ c: C, r: R });
          if (!wsCalls[cellRef]) continue;
          wsCalls[cellRef].s = {
            fill: {
              patternType: 'solid',
              fgColor: { rgb }
            }
          };
        }
      }
    }
  }

  return wsCalls;
};

export const getAdminLogsSheet = (filteredData) => {
  const sortedData = [...filteredData].sort((a, b) => {
    const nameA = (a.User && (a.User.fullName || a.User.username)) || a.supervisorName || '';
    const nameB = (b.User && (b.User.fullName || b.User.username)) || b.supervisorName || '';
    return nameA.localeCompare(nameB, 'ar');
  });

  const logsData = [];
  let currentSupervisor = null;
  let currentSupervisorTotalMinutes = 0;

  const pushTotalRow = (supervisorName, totalMinutes) => {
    logsData.push({
      'المشرف': `إجمالي (${supervisorName})`,
      'نوع الفترة': '',
      'وقت البداية': '',
      'وقت العودة': '',
      'المدة الإجمالية': `${totalMinutes} دقيقة`
    });
  };

  sortedData.forEach(log => {
    const supName = (log.User && (log.User.fullName || log.User.username)) || log.supervisorName || 'غير معروف';

    if (currentSupervisor !== null && currentSupervisor !== supName) {
      pushTotalRow(currentSupervisor, currentSupervisorTotalMinutes);
      currentSupervisorTotalMinutes = 0;
    }

    currentSupervisor = supName;

    const startTimeStr = log.startTimeString || (log.startTime ? new Date(log.startTime).toLocaleString('ar-EG', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }) : '');
    const endTimeStr = log.endTimeString || (log.endTime ? new Date(log.endTime).toLocaleString('ar-EG', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }) : '');
    const durationStr = log.durationString || (log.durationMs ? formatDuration(log.durationMs) : '');

    let totalMins = 0;
    if (log.durationMs) {
      totalMins = Math.floor(log.durationMs / (1000 * 60));
    } else if (log.durationString) {
      const hourMatch = log.durationString.match(/(\d+)\s*ساعة/);
      const minMatch = log.durationString.match(/(\d+)\s*دقيقة/);
      if (hourMatch) totalMins += parseInt(hourMatch[1], 10) * 60;
      if (minMatch) totalMins += parseInt(minMatch[1], 10);
    }
    
    currentSupervisorTotalMinutes += totalMins;

    logsData.push({
      'المشرف': supName,
      'نوع الفترة': log.type,
      'وقت البداية': startTimeStr,
      'وقت العودة': endTimeStr,
      'المدة الإجمالية': durationStr
    });
  });

  if (currentSupervisor !== null) {
    pushTotalRow(currentSupervisor, currentSupervisorTotalMinutes);
  }

  if (logsData.length > 0 && Array.from(new Set(sortedData.map(l => (l.User && (l.User.fullName || l.User.username)) || l.supervisorName))).length > 1) {
    let grandTotalMinutes = 0;
    sortedData.forEach(log => {
      let totalMins = 0;
      if (log.durationMs) {
        totalMins = Math.floor(log.durationMs / (1000 * 60));
      } else if (log.durationString) {
        const hourMatch = log.durationString.match(/(\d+)\s*ساعة/);
        const minMatch = log.durationString.match(/(\d+)\s*دقيقة/);
        if (hourMatch) totalMins += parseInt(hourMatch[1], 10) * 60;
        if (minMatch) totalMins += parseInt(minMatch[1], 10);
      }
      grandTotalMinutes += totalMins;
    });

    logsData.push({
      'المشرف': 'الإجمالي العام لجميع المشرفين',
      'نوع الفترة': '',
      'وقت البداية': '',
      'وقت العودة': '',
      'المدة الإجمالية': `${grandTotalMinutes} دقيقة`
    });
  }

  const wsLogs = XLSX.utils.json_to_sheet(logsData.length ? logsData : [{ 'رسالة': 'لا توجد بيانات' }]);
  wsLogs['!dir'] = 'rtl';
  return wsLogs;
};

export const getAdminPerformanceSheet = (filteredData) => {
  const perfData = filteredData.map(log => {
    const row = {
      'اسم المشرف': log.supervisorName || '-',
      'التاريخ': log.date || (log.createdAt ? new Date(log.createdAt).toLocaleString('ar-EG', { year: 'numeric', month: '2-digit', day: '2-digit' }) : '-'),
      'عدد المكالمات': log.manualCallsCount || 0,
      'المهمة': log.tasks || 'لا توجد'
    };
    if (log.notesList && Array.isArray(log.notesList)) {
      log.notesList.forEach((note, index) => {
        row[`ملاحظة ${index + 1}`] = note || 'لا توجد ملاحظة';
      });
    }
    return row;
  });

  const wsPerf = XLSX.utils.json_to_sheet(perfData.length ? perfData : [{ 'رسالة': 'لا توجد تقارير أداء' }]);
  wsPerf['!dir'] = 'rtl';
  return wsPerf;
};

export const exportAdminData = async (exportType, filteredCalls, filteredLogs, filteredPerf, customFileNameBase) => {
  const todayStr = getLogicalDateString();
  const fileNameBase = customFileNameBase || `تقرير_الإدارة_الشامل_${todayStr}`;

  if (exportType === 'calls_only') {
    const wsCalls = getAdminCallsSheet(filteredCalls);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, wsCalls, "سجل المكالمات المجمع");
    XLSX.writeFile(wb, `${fileNameBase}_مكالمات.xlsx`);
  }
  else if (exportType === 'logs_only') {
    const wsLogs = getAdminLogsSheet(filteredLogs);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, wsLogs, "سجل المراقبة المجمع");
    XLSX.writeFile(wb, `${fileNameBase}_مراقبة.xlsx`);
  }
  else if (exportType === 'perf_only') {
    const wsPerf = getAdminPerformanceSheet(filteredPerf);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, wsPerf, "سجل الأداء المجمع");
    XLSX.writeFile(wb, `${fileNameBase}_الأداء.xlsx`);
  }
  else if (exportType === 'all_zip') {
    const wsCalls = getAdminCallsSheet(filteredCalls);
    const wsLogs = getAdminLogsSheet(filteredLogs);
    const wsPerf = getAdminPerformanceSheet(filteredPerf);

    const wbCalls = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wbCalls, wsCalls, "سجل المكالمات المجمع");

    const wbLogs = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wbLogs, wsLogs, "سجل المراقبة المجمع");

    const wbPerf = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wbPerf, wsPerf, "سجل الأداء المجمع");

    const callsBuffer = XLSX.write(wbCalls, { bookType: 'xlsx', type: 'array' });
    const logsBuffer = XLSX.write(wbLogs, { bookType: 'xlsx', type: 'array' });
    const perfBuffer = XLSX.write(wbPerf, { bookType: 'xlsx', type: 'array' });

    const blobWriter = new zip.BlobWriter("application/zip");
    // Without password for admin
    const zipWriter = new zip.ZipWriter(blobWriter);

    await zipWriter.add("سجل_المكالمات_المجمع.xlsx", new zip.Uint8ArrayReader(new Uint8Array(callsBuffer)));
    await zipWriter.add("سجل_النشاط_والخمول_المجمع.xlsx", new zip.Uint8ArrayReader(new Uint8Array(logsBuffer)));
    await zipWriter.add("سجل_الأداء_المجمع.xlsx", new zip.Uint8ArrayReader(new Uint8Array(perfBuffer)));

    const zipBlob = await zipWriter.close();

    const url = URL.createObjectURL(zipBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${fileNameBase}.zip`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
};
