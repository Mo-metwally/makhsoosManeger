/**
 * Gets the logical current date string in YYYY-MM-DD format.
 * The cutoff time is 1:00 AM. 
 * Any time before 1:00 AM belongs to the previous logical day.
 */
export const getLogicalDateString = (dateParam = new Date()) => {
  const d = new Date(dateParam);
  const cutoff = parseInt(localStorage.getItem('logicalDayCutoff')) || 5;
  d.setHours(d.getHours() - cutoff);
  
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  
  return `${year}-${month}-${day}`;
};

/**
 * Gets the logical Date object (which corresponds to the logical date).
 */
export const getLogicalDateObj = (dateParam = new Date()) => {
  const d = new Date(dateParam);
  const cutoff = parseInt(localStorage.getItem('logicalDayCutoff')) || 5;
  d.setHours(d.getHours() - cutoff);
  return d;
};
