export const applyFiltersAndSort = (data, { timeFilter, supervisorFilter, searchQuery, sortBy }, isLogs = false) => {
  let filtered = [...data];
  const now = new Date();
  
  if (timeFilter && timeFilter !== 'all') {
    filtered = filtered.filter(item => {
      const itemDate = new Date(item.createdAt || new Date());
      if (timeFilter === 'today') {
        return itemDate.toDateString() === now.toDateString();
      }
      if (timeFilter === 'yesterday') {
        const yesterday = new Date(now);
        yesterday.setDate(yesterday.getDate() - 1);
        return itemDate.toDateString() === yesterday.toDateString();
      }
      if (timeFilter === 'week') {
        const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        return itemDate >= oneWeekAgo;
      }
      if (timeFilter === 'month') {
        return itemDate.getMonth() === now.getMonth() && itemDate.getFullYear() === now.getFullYear();
      }
      return true;
    });
  }

  if (supervisorFilter && supervisorFilter !== 'all') {
    filtered = filtered.filter(item => item.supervisorName === supervisorFilter);
  }

  if (searchQuery && searchQuery.trim() !== '') {
    const lowerQuery = searchQuery.trim().toLowerCase();
    filtered = filtered.filter(item => {
      if (isLogs) {
        return (item.supervisorName && item.supervisorName.toLowerCase().includes(lowerQuery)) ||
               (item.type && item.type.toLowerCase().includes(lowerQuery));
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
