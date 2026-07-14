import * as XLSX from 'xlsx-js-style';
import * as zip from '@zip.js/zip.js';
import { getLogicalDateString, getLogicalDateObj } from './dateHelpers';
import api from '../services/api';
import { applyFiltersAndSort, parseArabicDate } from './filterAndSort';

const toArabicNumbers = (n) => String(n).replace(/\d/g, d => '٠١٢٣٤٥٦٧٨٩'[d]);

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

const getAdvancesSheet = (filterType, userName, startDate, endDate, passedData = null) => {
  const allAdvances = passedData || [];
  const filteredAdvances = getFilteredData(allAdvances, filterType, 'createdAt', startDate, endDate);

  const getStatusArabic = (status) => {
    switch (status) {
      case 'pending': return 'قيد المراجعة';
      case 'approved': return 'مقبول (دين)';
      case 'rejected': return 'مرفوض';
      case 'settled': return 'تم السداد';
      default: return status || 'غير محدد';
    }
  };

  const advancesData = filteredAdvances.map(adv => ({
    'التاريخ': new Date(adv.createdAt).toLocaleString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
    'الشهر': adv.monthKey || 'غير محدد',
    'المبلغ': `${adv.amount} ج.م`,
    'السبب': adv.reason || 'لا يوجد',
    'الحالة': getStatusArabic(adv.status)
  }));

  const wsAdv = XLSX.utils.json_to_sheet(advancesData.length ? advancesData : [{ 'رسالة': 'لا توجد سلف مسجلة' }]);
  wsAdv['!dir'] = 'rtl';
  return wsAdv;
};

export const exportToExcel = async (filterType = 'today', startDate, endDate) => {
  const todayStr = getLogicalDateString();
  const userName = localStorage.getItem('userName') || 'المشرف';

  let dbCalls = null;
  let dbLogs = null;
  let dbPerf = null;
  let dbAdvances = null;

  try {
    const [resCalls, resLogs, resPerf, resAdvances] = await Promise.all([
      api.get('/data/calls'),
      api.get('/data/inactivity'),
      api.get('/data/performance-logs'),
      api.get('/advances/me')
    ]);
    dbCalls = resCalls.data;
    dbLogs = resLogs.data;
    dbPerf = resPerf.data;
    dbAdvances = resAdvances.data;
  } catch (error) {
    console.error('Failed to fetch personal data for export, falling back to local storage', error);
  }

  const wsCalls = getCallsSheet(filterType, startDate, endDate, dbCalls);
  const wsLogs = getLogsSheet(filterType, userName, startDate, endDate, dbLogs);
  const wsPerf = getPerformanceSheet(filterType, userName, startDate, endDate, dbPerf);
  const wsAdv = getAdvancesSheet(filterType, userName, startDate, endDate, dbAdvances);

  const wbCalls = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wbCalls, wsCalls, "سجل المكالمات");

  const wbLogs = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wbLogs, wsLogs, "فترات الخمول والراحة");

  const wbPerf = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wbPerf, wsPerf, "تقرير الأداء");

  const wbAdv = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wbAdv, wsAdv, "سلف الحساب");

  const callsBuffer = XLSX.write(wbCalls, { bookType: 'xlsx', type: 'array' });
  const logsBuffer = XLSX.write(wbLogs, { bookType: 'xlsx', type: 'array' });
  const perfBuffer = XLSX.write(wbPerf, { bookType: 'xlsx', type: 'array' });
  const advBuffer = XLSX.write(wbAdv, { bookType: 'xlsx', type: 'array' });

  const blobWriter = new zip.BlobWriter("application/zip");
  const zipWriter = new zip.ZipWriter(blobWriter);

  await zipWriter.add("سجل_المكالمات.xlsx", new zip.Uint8ArrayReader(new Uint8Array(callsBuffer)));
  await zipWriter.add("فترات_الخمول_والراحة.xlsx", new zip.Uint8ArrayReader(new Uint8Array(logsBuffer)));
  await zipWriter.add("تقرير_الأداء.xlsx", new zip.Uint8ArrayReader(new Uint8Array(perfBuffer)));
  await zipWriter.add("سلف_الحساب.xlsx", new zip.Uint8ArrayReader(new Uint8Array(advBuffer)));

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

export const getSummaryCallsSheet = (filteredCalls) => {
  const summaryMap = {};

  filteredCalls.forEach(call => {
    const userId = (call.User && call.User.id) || call.supervisorName || 'unknown';
    const employeeName = (call.User && (call.User.fullName || call.User.username)) || call.supervisorName || 'غير معروف';
    const jobTitle = (call.User && call.User.jobTitle) || 'غير محدد';
    
    if (!summaryMap[userId]) {
      summaryMap[userId] = {
        employeeName,
        jobTitle,
        totalCalls: 0,
        successCalls: 0,
        rejectedCalls: 0,
      };
    }

    summaryMap[userId].totalCalls += 1;
    if (call.callStatus === 'مهتم (موافق)') {
      summaryMap[userId].successCalls += 1;
    } else if (call.callStatus === 'رفض' || call.callStatus === 'غير مهتم (رفض)') {
      summaryMap[userId].rejectedCalls += 1;
    }
  });

  const summaryData = Object.values(summaryMap).map(data => {
    const successRate = data.totalCalls > 0 ? ((data.successCalls / data.totalCalls) * 100).toFixed(1) + '%' : '0%';
    return {
      'اسم الموظف': data.employeeName,
      'المسمي الوظيفي': data.jobTitle,
      'إجمالي المكالمات': data.totalCalls,
      'المكالمات الناجحة': data.successCalls,
      'المكالمات المرفوضة': data.rejectedCalls,
      'معدل النجاح': successRate
    };
  });

  const ws = XLSX.utils.json_to_sheet(summaryData.length ? summaryData : [{ 'رسالة': 'لا توجد بيانات' }]);
  ws['!dir'] = 'rtl';
  
  // Freeze top row and first two columns
  ws['!views'] = [{ state: 'frozen', xSplit: 2, ySplit: 1, topLeftCell: 'C2', activeCell: 'C2' }];

  return ws;
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

export const getAdminExpensesSheet = (filteredData) => {
  const expData = filteredData.map(exp => ({
    'التاريخ': exp.date || '-',
    'الوقت': exp.time || '-',
    'المبلغ': `${exp.amount} ج.م`,
    'النوع': exp.type === 'advance' ? 'سلفة' : 'مصروف/أخرى',
    'اسم الموظف/البند': exp.employeeName || exp.item || 'غير محدد',
    'السبب/الملاحظات': exp.notes || 'لا يوجد',
    'اسم حامل البطاقة': exp.User ? (exp.User.fullName || exp.User.username) : 'غير محدد'
  }));

  const ws = XLSX.utils.json_to_sheet(expData.length ? expData : [{ 'رسالة': 'لا توجد بيانات مصروفات' }]);
  ws['!dir'] = 'rtl';
  return ws;
};

export const getAdminAttendanceSheet = (filteredData) => {
  const attData = filteredData.map(log => {
    let durationStr = 'لم ينصرف بعد';
    
    if (log.status === 'Absent') {
      durationStr = 'غياب';
    } else if (log.status === 'DayOff') {
      durationStr = 'إجازة';
    } else if (log.checkInTime && log.checkOutTime) {
      let diffMs = new Date(log.checkOutTime).getTime() - new Date(log.checkInTime).getTime();
      // If check-out is before check-in due to admin entering times on the same date for a midnight-crossing shift
      if (diffMs < 0) {
        diffMs += 24 * 60 * 60 * 1000;
      }
      durationStr = formatDuration(diffMs);
    }

    let delayStr = 'لا يوجد';
    if (log.checkInTime && log.Shift && log.Shift.startTime && log.status !== 'Absent' && log.status !== 'DayOff') {
      const checkInDate = new Date(log.checkInTime);
      const [shiftHours, shiftMinutes] = log.Shift.startTime.split(':').map(Number);
      const shiftStartDate = new Date(checkInDate);
      shiftStartDate.setHours(shiftHours, shiftMinutes, 0, 0);
      const diffMs = checkInDate - shiftStartDate;
      
      if (diffMs > 0) {
        const diffMins = Math.floor(diffMs / 60000);
        const hours = Math.floor(diffMins / 60);
        const mins = diffMins % 60;
        if (hours > 0) {
          delayStr = `${hours} س ${mins > 0 ? `و ${mins} د` : ''}`;
        } else {
          delayStr = `${mins} دقيقة`;
        }
      }
    }

    return {
      'التاريخ': log.date || (log.checkInTime ? new Date(log.checkInTime).toLocaleDateString('ar-EG') : '-'),
      'اسم الموظف': log.User ? (log.User.fullName || log.User.username) : 'غير محدد',
      'وقت الحضور': log.checkInTime ? new Date(log.checkInTime).toLocaleString('ar-EG', { hour: '2-digit', minute: '2-digit' }) : '-',
      'وقت الانصراف': log.checkOutTime ? new Date(log.checkOutTime).toLocaleString('ar-EG', { hour: '2-digit', minute: '2-digit' }) : '-',
      'مدة العمل': durationStr,
      'الحالة': log.status === 'Absent' ? 'غياب' : log.status === 'DayOff' ? 'إجازة' : 'حضور',
      'تأخير محتسب': log.status === 'Absent' || log.status === 'DayOff' ? '-' : delayStr
    };
  });

  const ws = XLSX.utils.json_to_sheet(attData.length ? attData : [{ 'رسالة': 'لا توجد بيانات حضور وانصراف' }]);
  ws['!dir'] = 'rtl';

  if (filteredData.length > 0) {
    const range = XLSX.utils.decode_range(ws['!ref']);
    for (let R = range.s.r + 1; R <= range.e.r; ++R) {
      const dataIdx = R - 1;
      const log = filteredData[dataIdx];
      let rgb = null;
      
      if (log.status === 'Absent') {
        rgb = "FFCCCC"; // Light Red
      } else if (log.status === 'DayOff') {
        rgb = "CCE5FF"; // Light Blue
      } else if (log.status !== 'Absent' && log.status !== 'DayOff' && log.checkInTime && log.checkOutTime && log.Shift) {
        let actualMs = new Date(log.checkOutTime).getTime() - new Date(log.checkInTime).getTime();
        if (actualMs < 0) actualMs += 24 * 60 * 60 * 1000;
        
        const [startHour, startMinute] = log.Shift.startTime.split(':').map(Number);
        const [endHour, endMinute] = log.Shift.endTime.split(':').map(Number);
        
        let shiftMs = (endHour * 60 + endMinute) * 60000 - (startHour * 60 + startMinute) * 60000;
        if (shiftMs < 0) shiftMs += 24 * 60 * 60 * 1000;
        
        // 5 minute grace period for short shifts
        if (actualMs < shiftMs - (5 * 60 * 1000)) {
          rgb = "FFFFCC"; // Light Yellow
        }
      }

      if (rgb) {
        for (let C = range.s.c; C <= range.e.c; ++C) {
          const cellRef = XLSX.utils.encode_cell({ c: C, r: R });
          if (!ws[cellRef]) continue;
          ws[cellRef].s = {
            fill: {
              patternType: 'solid',
              fgColor: { rgb }
            }
          };
        }
      }
    }
  }

  return ws;
};

export const getSummaryAttendanceSheet = (filteredAttendance) => {
  // 1. Get all unique dates
  const datesSet = new Set();
  filteredAttendance.forEach(log => {
    const dStr = log.date || (log.checkInTime ? new Date(log.checkInTime).toLocaleDateString('en-CA') : null); // YYYY-MM-DD format
    if (dStr) datesSet.add(dStr);
  });
  const uniqueDates = Array.from(datesSet).sort();

  // 2. Group by User
  const usersMap = {}; // userId -> { employeeName, jobTitle, records: { date -> log } }
  filteredAttendance.forEach(log => {
    const userId = log.User?.id || log.userId || 'unknown';
    const dStr = log.date || (log.checkInTime ? new Date(log.checkInTime).toLocaleDateString('en-CA') : null);
    
    if (!usersMap[userId]) {
      usersMap[userId] = {
        employeeName: log.User ? (log.User.fullName || log.User.username) : 'غير محدد',
        jobTitle: log.User?.jobTitle || 'غير محدد',
        records: {}
      };
    }
    if (dStr) {
      usersMap[userId].records[dStr] = log;
    }
  });

  // 3. Build Header Row
  const headerRow = ['الاسم', 'المسمي الوظيفي'];
  const subHeaderRow = ['', ''];
  uniqueDates.forEach(d => {
    const dateObj = new Date(d);
    const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'long' });
    const formattedDate = `${d.split('-').reverse().join('/')} ${dayName}`;
    headerRow.push(formattedDate, '', '');
    subHeaderRow.push('حضور', 'انصراف', 'مدة الوردية');
  });

  const aoa = [headerRow, subHeaderRow];
  const merges = [];
  const styles = []; // Array to keep track of cell styles: { r, c, bg, fontColor, bold, alignment }

  // Header styles and merges
  styles.push({ r: 0, c: 0, bg: 'FFC000', bold: true, alignment: { horizontal: 'center', vertical: 'center' } });
  styles.push({ r: 0, c: 1, bg: 'FFC000', bold: true, alignment: { horizontal: 'center', vertical: 'center' } });
  merges.push({ s: { r: 0, c: 0 }, e: { r: 1, c: 0 } });
  merges.push({ s: { r: 0, c: 1 }, e: { r: 1, c: 1 } });
  
  let currentCol = 2;
  uniqueDates.forEach(() => {
    // Date Header
    merges.push({ s: { r: 0, c: currentCol }, e: { r: 0, c: currentCol + 2 } });
    styles.push({ r: 0, c: currentCol, bg: 'FFC000', bold: true, alignment: { horizontal: 'center', vertical: 'center' } });
    
    // Sub headers
    styles.push({ r: 1, c: currentCol, bg: '00B0F0', bold: true, alignment: { horizontal: 'center', vertical: 'center' } });
    styles.push({ r: 1, c: currentCol + 1, bg: '00B0F0', bold: true, alignment: { horizontal: 'center', vertical: 'center' } });
    styles.push({ r: 1, c: currentCol + 2, bg: '00B0F0', bold: true, alignment: { horizontal: 'center', vertical: 'center' } });
    
    currentCol += 3;
  });

  // 4. Build Data Rows
  let currentRow = 2; // Data starts at row 2 (0-indexed)
  Object.values(usersMap).forEach(userData => {
    const rowData = [userData.employeeName, userData.jobTitle];
    
    // Style for the first two columns
    styles.push({ r: currentRow, c: 0, bg: 'FFC000', bold: true, alignment: { horizontal: 'center', vertical: 'center' } });
    styles.push({ r: currentRow, c: 1, bg: 'FFC000', bold: true, alignment: { horizontal: 'center', vertical: 'center' } });

    currentCol = 2;
    uniqueDates.forEach(d => {
      const log = userData.records[d];
      if (!log) {
        rowData.push('', '', '');
        styles.push({ r: currentRow, c: currentCol, alignment: { horizontal: 'center', vertical: 'center' } });
        styles.push({ r: currentRow, c: currentCol + 1, alignment: { horizontal: 'center', vertical: 'center' } });
        styles.push({ r: currentRow, c: currentCol + 2, bg: 'FFFFE0', alignment: { horizontal: 'center', vertical: 'center' } });
      } else if (log.status === 'Absent') {
        rowData.push('غياب', '', '');
        merges.push({ s: { r: currentRow, c: currentCol }, e: { r: currentRow, c: currentCol + 2 } });
        styles.push({ r: currentRow, c: currentCol, bg: 'FF0000', fontColor: 'FFFFFF', bold: true, alignment: { horizontal: 'center', vertical: 'center' } });
      } else if (log.status === 'DayOff') {
        rowData.push('اجازه', '', '');
        merges.push({ s: { r: currentRow, c: currentCol }, e: { r: currentRow, c: currentCol + 2 } });
        styles.push({ r: currentRow, c: currentCol, bg: 'FFFF00', bold: true, alignment: { horizontal: 'center', vertical: 'center' } });
      } else {
        const inTime = log.checkInTime ? new Date(log.checkInTime).toLocaleString('ar-EG', { hour: '2-digit', minute: '2-digit', hour12: true }) : '-';
        const outTime = log.checkOutTime ? new Date(log.checkOutTime).toLocaleString('ar-EG', { hour: '2-digit', minute: '2-digit', hour12: true }) : '-';
        
        const toAr = (n) => String(n).replace(/\d/g, d => '٠١٢٣٤٥٦٧٨٩'[d]);

        let durationStr = '-';
        if (log.checkInTime && log.checkOutTime) {
          let diffMs = new Date(log.checkOutTime).getTime() - new Date(log.checkInTime).getTime();
          if (diffMs < 0) {
            diffMs += 24 * 60 * 60 * 1000;
          }
          const diffMins = Math.floor(diffMs / 60000);
          const hours = Math.floor(diffMins / 60);
          const mins = diffMins % 60;
          
          if (hours > 0) {
            durationStr = `${toAr(hours)}س - ${toAr(mins)}د`;
          } else {
            durationStr = `${toAr(mins)}د`;
          }
        } else if (log.checkInTime) {
          durationStr = 'لم ينصرف';
        }

        rowData.push(inTime, outTime, durationStr);
        styles.push({ r: currentRow, c: currentCol, alignment: { horizontal: 'center', vertical: 'center' } });
        styles.push({ r: currentRow, c: currentCol + 1, alignment: { horizontal: 'center', vertical: 'center' } });
        styles.push({ r: currentRow, c: currentCol + 2, bg: 'FFFFE0', alignment: { horizontal: 'center', vertical: 'center' } });
      }
      currentCol += 3;
    });

    aoa.push(rowData);
    currentRow++;
  });

  const ws = XLSX.utils.aoa_to_sheet(aoa);
  ws['!dir'] = 'rtl';
  ws['!merges'] = merges;
  ws['!views'] = [{ state: 'frozen', xSplit: 2, ySplit: 2, topLeftCell: 'C3', activeCell: 'C3' }];

  // Apply Styles
  styles.forEach(({ r, c, bg, fontColor, bold, alignment }) => {
    const cellRef = XLSX.utils.encode_cell({ c, r });
    if (!ws[cellRef]) ws[cellRef] = { t: 's', v: '' }; // Create cell if doesn't exist (due to merges)
    
    ws[cellRef].s = {
      ...ws[cellRef].s,
      alignment: alignment || { horizontal: 'center', vertical: 'center' }
    };

    if (bg) {
      ws[cellRef].s.fill = { patternType: 'solid', fgColor: { rgb: bg } };
    }
    if (fontColor || bold) {
      ws[cellRef].s.font = {};
      if (fontColor) ws[cellRef].s.font.color = { rgb: fontColor };
      if (bold) ws[cellRef].s.font.bold = true;
    }
    
    // Add borders
    ws[cellRef].s.border = {
      top: { style: 'thin', color: { auto: 1 } },
      bottom: { style: 'thin', color: { auto: 1 } },
      left: { style: 'thin', color: { auto: 1 } },
      right: { style: 'thin', color: { auto: 1 } }
    };
  });

  // Also apply borders to merged cells that might be skipped in the array mapping
  merges.forEach(merge => {
    for (let R = merge.s.r; R <= merge.e.r; ++R) {
      for (let C = merge.s.c; C <= merge.e.c; ++C) {
        const cellRef = XLSX.utils.encode_cell({ c: C, r: R });
        if (ws[cellRef] && ws[cellRef].s) {
           ws[cellRef].s.border = {
             top: { style: 'thin', color: { auto: 1 } },
             bottom: { style: 'thin', color: { auto: 1 } },
             left: { style: 'thin', color: { auto: 1 } },
             right: { style: 'thin', color: { auto: 1 } }
           };
        }
      }
    }
  });

  // Set column widths
  const cols = [{ wch: 25 }, { wch: 20 }];
  for (let i = 2; i < headerRow.length; i++) {
    cols.push({ wch: 12 });
  }
  ws['!cols'] = cols;

  return ws;
};
export const getPayrollSummarySheet = (attendanceData, advancesData = []) => {
  const userStats = {};

  attendanceData.forEach(log => {
    const uId = log.User?.id || log.userId;
    if (!userStats[uId]) {
      userStats[uId] = {
        name: log.User?.fullName || log.User?.username || 'غير معروف',
        jobTitle: log.User?.jobTitle || 'غير محدد',
        present: 0,
        absent: 0,
        dayOff: 0,
        delayMinutes: 0,
        totalAdvances: 0
      };
    }

    if (log.status === 'Present') {
      userStats[uId].present += 1;
      
      if (log.checkInTime && log.Shift && log.Shift.startTime) {
        const checkInDate = new Date(log.checkInTime);
        const [startHour, startMin] = log.Shift.startTime.split(':').map(Number);
        
        const shiftStart = new Date(checkInDate);
        shiftStart.setHours(startHour, startMin, 0, 0);
        
        if (checkInDate > shiftStart) {
          const diffMs = checkInDate - shiftStart;
          userStats[uId].delayMinutes += (diffMs / 60000);
        }
      }
    } else if (log.status === 'Absent') {
      userStats[uId].absent += 1;
    } else if (log.status === 'DayOff') {
      userStats[uId].dayOff += 1;
    }
  });

  advancesData.forEach(adv => {
    const uId = adv.Requester?.id || adv.userId;
    if (userStats[uId]) {
      userStats[uId].totalAdvances += (Number(adv.amount) || 0);
    } else {
      userStats[uId] = {
        name: adv.Requester?.fullName || adv.Requester?.username || 'غير معروف',
        jobTitle: adv.Requester?.jobTitle || 'غير محدد',
        present: 0,
        absent: 0,
        dayOff: 0,
        delayMinutes: 0,
        totalAdvances: Number(adv.amount) || 0
      };
    }
  });

  const headerRow = [
    'الأسم',
    'المسمي الوظيفي',
    'أيام الحضور',
    'أيام الإجازات',
    'إجازات غير مدفوعة',
    'أيام الغياب',
    'إجمالي ساعات التأخير',
    'إجمالي السلف',
    'الراتب',
    'الصافي'
  ];

  const dataRows = Object.values(userStats).map(stat => {
    let delayStr = '0';
    if (stat.delayMinutes > 0) {
      const h = Math.floor(stat.delayMinutes / 60);
      const m = Math.floor(stat.delayMinutes % 60);
      if (h > 0 && m > 0) delayStr = `${h}س و ${m}د`;
      else if (h > 0) delayStr = `${h}س`;
      else delayStr = `${m}د`;
      delayStr = toArabicNumbers(delayStr);
    }

    return [
      stat.name,
      stat.jobTitle,
      stat.present,
      stat.dayOff,
      0, // Unpaid Day Offs (manual entry, default 0)
      stat.absent,
      delayStr,
      stat.totalAdvances,
      '', // Salary
      ''  // Net Salary
    ];
  });

  const ws = XLSX.utils.aoa_to_sheet([headerRow, ...dataRows]);

  // Insert formulas for Net Salary (Column J)
  for (let R = 1; R <= dataRows.length; ++R) {
    const rowNum = R + 1;
    const targetCell = XLSX.utils.encode_cell({ c: 9, r: R }); // Column J
    ws[targetCell] = {
      t: 'n',
      f: `IF(ISBLANK(I${rowNum}), "", (I${rowNum}/30 * (C${rowNum} + D${rowNum} - E${rowNum})) - H${rowNum})`
    };
  }

  // Styling
  const headerStyle = {
    font: { bold: true, color: { rgb: "FFFFFF" } },
    fill: { fgColor: { rgb: "3B82F6" } },
    alignment: { horizontal: "center", vertical: "center" }
  };
  const cellStyle = {
    alignment: { horizontal: "center", vertical: "center" }
  };

  const range = XLSX.utils.decode_range(ws['!ref']);
  for (let C = range.s.c; C <= range.e.c; ++C) {
    const headerAddr = XLSX.utils.encode_cell({ c: C, r: 0 });
    if (!ws[headerAddr]) continue;
    ws[headerAddr].s = headerStyle;

    for (let R = 1; R <= range.e.r; ++R) {
      const cellAddr = XLSX.utils.encode_cell({ c: C, r: R });
      if (!ws[cellAddr]) continue;
      ws[cellAddr].s = cellStyle;
    }
  }

  const cols = [{ wch: 25 }, { wch: 20 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 20 }, { wch: 15 }, { wch: 15 }, { wch: 15 }];
  ws['!cols'] = cols;

  return ws;
};

export const exportAdminData = async (exportType, filteredCalls, filteredLogs, filteredPerf, filteredExpenses = [], filteredAttendance = [], filteredAdvances = [], customFileNameBase = null, reportDetailLevel = 'detailed') => {
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
    XLSX.utils.book_append_sheet(wb, wsPerf, "سجل المهام المجمع");
    XLSX.writeFile(wb, `${fileNameBase}_المهام.xlsx`);
  }
  else if (exportType === 'expenses_only') {
    const wsExp = getAdminExpensesSheet(filteredExpenses);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, wsExp, "سجل المصروفات المجمع");
    XLSX.writeFile(wb, `${fileNameBase}_المصروفات.xlsx`);
  }
  else if (exportType === 'summary_calls') {
    const wsCalls = getSummaryCallsSheet(filteredCalls);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, wsCalls, "ملخص سجل التواصل");
    XLSX.writeFile(wb, `${fileNameBase}_ملخص_التواصل.xlsx`);
  }
  else if (exportType === 'summary_attendance') {
    const wsAtt = getSummaryAttendanceSheet(filteredAttendance);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, wsAtt, "ملخص سجل الحضور");
    XLSX.writeFile(wb, `${fileNameBase}_ملخص_الحضور.xlsx`);
  }
  else if (exportType === 'summary_payroll') {
    const wsPayroll = getPayrollSummarySheet(filteredAttendance, filteredAdvances);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, wsPayroll, "ملخص حساب المرتبات");
    XLSX.writeFile(wb, `${fileNameBase}_ملخص_المرتبات.xlsx`);
  }
  else if (exportType === 'attendance_only') {
    const wsAtt = getAdminAttendanceSheet(filteredAttendance);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, wsAtt, "سجل الحضور والانصراف");
    XLSX.writeFile(wb, `${fileNameBase}_الحضور.xlsx`);
  }
  else if (exportType === 'all_zip') {
    const wsCalls = getAdminCallsSheet(filteredCalls);
    const wsLogs = getAdminLogsSheet(filteredLogs);
    const wsPerf = getAdminPerformanceSheet(filteredPerf);
    const wsExp = getAdminExpensesSheet(filteredExpenses);
    const wsAtt = getAdminAttendanceSheet(filteredAttendance);

    const wbCalls = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wbCalls, wsCalls, "سجل المكالمات المجمع");

    const wbLogs = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wbLogs, wsLogs, "سجل المراقبة المجمع");

    const wbPerf = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wbPerf, wsPerf, "سجل المهام المجمع");

    const wbExp = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wbExp, wsExp, "سجل المصروفات المجمع");

    const wbAtt = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wbAtt, wsAtt, "سجل الحضور والانصراف");

    const callsBuffer = XLSX.write(wbCalls, { bookType: 'xlsx', type: 'array' });
    const logsBuffer = XLSX.write(wbLogs, { bookType: 'xlsx', type: 'array' });
    const perfBuffer = XLSX.write(wbPerf, { bookType: 'xlsx', type: 'array' });
    const expBuffer = XLSX.write(wbExp, { bookType: 'xlsx', type: 'array' });
    const attBuffer = XLSX.write(wbAtt, { bookType: 'xlsx', type: 'array' });

    const blobWriter = new zip.BlobWriter("application/zip");
    // Without password for admin
    const zipWriter = new zip.ZipWriter(blobWriter);

    await zipWriter.add("سجل_المكالمات_المجمع.xlsx", new zip.Uint8ArrayReader(new Uint8Array(callsBuffer)));
    await zipWriter.add("سجل_النشاط_والخمول_المجمع.xlsx", new zip.Uint8ArrayReader(new Uint8Array(logsBuffer)));
    await zipWriter.add("سجل_الأداء_المجمع.xlsx", new zip.Uint8ArrayReader(new Uint8Array(perfBuffer)));
    await zipWriter.add("سجل_المصروفات_المجمع.xlsx", new zip.Uint8ArrayReader(new Uint8Array(expBuffer)));
    await zipWriter.add("سجل_الحضور_والانصراف_المجمع.xlsx", new zip.Uint8ArrayReader(new Uint8Array(attBuffer)));

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
