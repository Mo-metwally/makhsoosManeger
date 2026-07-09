/**
 * Gets the logical current date string in YYYY-MM-DD format.
 * The cutoff time is 1:00 AM. 
 * Any time before 1:00 AM belongs to the previous logical day.
 * 
 * We subtract 1 hour from the given date (defaulting to now),
 * then format it based on the server's local time.
 */
const getLogicalDate = (dateParam = new Date()) => {
  const d = new Date(dateParam);
  
  // Cutoff is 1:00 AM. 
  // By subtracting 1 hour, anything between 00:00 and 00:59 becomes 23:xx of the previous day.
  // Anything 01:00 or later remains on the current calendar day.
  d.setHours(d.getHours() - 1);
  
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  
  return `${year}-${month}-${day}`;
};

module.exports = {
  getLogicalDate
};
