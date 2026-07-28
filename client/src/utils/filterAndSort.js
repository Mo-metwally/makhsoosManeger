import { getLogicalDateString, getLogicalDateObj } from './dateHelpers';

export const parseArabicDate = (arStr) => {
  if (!arStr) return new Date().toISOString();
  const months = { 'يناير':1, 'فبراير':2, 'مارس':3, 'أبريل':4, 'مايو':5, 'يونيو':6, 'يوليو':7, 'أغسطس':8, 'سبتمبر':9, 'أكتوبر':10, 'نوفمبر':11, 'ديسمبر':12 };
  let day = new Date().getDate();
  let year = new Date().getFullYear();
  let month = new Date().getMonth() + 1;
  
  const normalizeArabicNumerals = (str) => str.replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d));
  const normStr = normalizeArabicNumerals(String(arStr));
  
  const numMatch = normStr.match(/\d+/g);
  if (numMatch && numMatch.length >= 1) {
    day = parseInt(numMatch[0]);
    if (numMatch.length >= 2) year = parseInt(numMatch[numMatch.length - 1]);
  }
  for (const [mName, mNum] of Object.entries(months)) {
    if (normStr.includes(mName)) { month = mNum; break; }
  }
  return new Date(year, month - 1, day).toISOString();
};

export const applyFiltersAndSort = (data, { timeFilter, supervisorFilter, cityFilter, searchQuery, sortBy, customStartDate, customEndDate }, isLogs = false) => {
  let filtered = [...data];
  const now = new Date();
  
  if (timeFilter && timeFilter !== 'all') {
    filtered = filtered.filter(item => {
      const itemDate = new Date(item.createdAt || new Date());
      const logicalStr = (item.date && /^\d{4}-\d{2}-\d{2}$/.test(item.date)) ? item.date : getLogicalDateString(itemDate);
      
      if (timeFilter === 'today') {
        return logicalStr === getLogicalDateString();
      }
      if (timeFilter === 'yesterday') {
        const yesterday = new Date(now);
        yesterday.setDate(yesterday.getDate() - 1);
        return logicalStr === getLogicalDateString(yesterday);
      }
      if (timeFilter === 'week') {
        const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        return itemDate >= oneWeekAgo;
      }
      if (timeFilter === 'month') {
        return logicalStr.startsWith(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`);
      }
      if (timeFilter === 'custom' && customStartDate && customEndDate) {
        const start = new Date(customStartDate);
        start.setHours(0, 0, 0, 0);
        const end = new Date(customEndDate);
        end.setHours(23, 59, 59, 999);
        return itemDate >= start && itemDate <= end;
      }
      return true;
    });
  }

  if (supervisorFilter && supervisorFilter !== 'all') {
    filtered = filtered.filter(item => item.supervisorName === supervisorFilter);
  }

  if (cityFilter && cityFilter !== 'all') {
    filtered = filtered.filter(item => item.city === cityFilter);
  }

  if (searchQuery && searchQuery.trim() !== '') {
    const lowerQuery = searchQuery.trim().toLowerCase();
    filtered = filtered.filter(item => {
      if (isLogs) {
        return (item.supervisorName && item.supervisorName.toLowerCase().includes(lowerQuery)) ||
               (item.type && item.type.toLowerCase().includes(lowerQuery)) ||
               (item.tasks && item.tasks.toLowerCase().includes(lowerQuery));
      } else {
        return (item.agentName && item.agentName.toLowerCase().includes(lowerQuery)) ||
               (item.phone && item.phone.includes(lowerQuery)) ||
               (item.city && item.city.toLowerCase().includes(lowerQuery)) ||
               (item.supervisorName && item.supervisorName.toLowerCase().includes(lowerQuery));
      }
    });
  }

  // Sort
  filtered.sort((a, b) => {
    if (sortBy === 'supervisor_asc') {
      const nameA = a.supervisorName || '';
      const nameB = b.supervisorName || '';
      return nameA.localeCompare(nameB, 'ar');
    }
    if (sortBy === 'supervisor_desc') {
      const nameA = a.supervisorName || '';
      const nameB = b.supervisorName || '';
      return nameB.localeCompare(nameA, 'ar');
    }
    if (sortBy === 'date_asc') {
      return new Date(a.createdAt) - new Date(b.createdAt);
    }
    // Default is date_desc
    return new Date(b.createdAt) - new Date(a.createdAt);
  });

  return filtered;
};
