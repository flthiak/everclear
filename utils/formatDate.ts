/**
 * Formats a date string into a readable format
 * @param dateString - ISO format date string
 * @returns Formatted date string
 */
export default function formatDate(dateString: string): string {
  if (!dateString) return '';
  
  try {
    const date = new Date(dateString);
    
    // Check if the date is valid
    if (isNaN(date.getTime())) {
      return '';
    }
    
    // Format: DD-MMM-YYYY HH:MM AM/PM
    return date.toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  } catch (error) {
    console.error('Error formatting date:', error);
    return '';
  }
} 