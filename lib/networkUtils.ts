/**
 * Utility functions for network error handling
 */

/**
 * Check if an error is a network-related error
 */
export const isNetworkError = (error: any): boolean => {
  if (!error) return false;
  
  // Check for common network error messages
  const errorMessage = error.message || '';
  const networkErrorMessages = [
    'network request failed',
    'failed to fetch',
    'network error',
    'connection failed',
    'internet connection',
    'timeout',
    'offline',
    'abort',
    'cannot connect',
    'ECONNREFUSED',
    'ECONNRESET',
    'ETIMEDOUT',
    'connect timed out',
    'network connectivity',
    'no internet',
    'unable to resolve host'
  ];
  
  // Check for network error messages
  const isNetworkMessage = networkErrorMessages.some(msg => 
    errorMessage.toLowerCase().includes(msg.toLowerCase())
  );
  
  // Check for fetch/xhr abort/timeout
  const isAbortOrTimeout = error.name === 'AbortError' || 
    error.name === 'TimeoutError' || 
    error.code === 'ECONNABORTED';
  
  // Check for navigator.onLine status if available
  const isOffline = typeof navigator !== 'undefined' && 
    typeof navigator.onLine === 'boolean' && 
    !navigator.onLine;
  
  return isNetworkMessage || isAbortOrTimeout || isOffline;
};

/**
 * Check Supabase connection by making a simple request
 */
export const checkSupabaseConnection = async (supabase: any): Promise<boolean> => {
  try {
    // Try to fetch a small amount of data to test connectivity
    const { count, error } = await supabase
      .from('system_status') // You can replace this with any lightweight table
      .select('*', { count: 'exact', head: true })
      .limit(1);
    
    return !error;
  } catch (err) {
    console.error('Connection check failed:', err);
    return false;
  }
};

/**
 * Get a user-friendly network error message
 */
export const getNetworkErrorMessage = (error: any): string => {
  if (!error) return 'Unknown network error occurred';
  
  const message = error.message || '';
  
  // Check for specific error types to provide more helpful messages
  if (message.includes('timeout')) {
    return 'The connection timed out. Please check your internet speed and try again.';
  }
  
  if (message.includes('offline') || !navigator.onLine) {
    return 'You appear to be offline. Please check your internet connection and try again.';
  }
  
  // Default friendly message
  return 'Unable to connect to the server. Please check your internet connection and try again.';
}; 