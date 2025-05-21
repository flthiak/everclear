import React from 'react';

/**
 * Custom hook to safely use React.use with fallback for older React versions
 */
export function safeUse<T>(promise: Promise<T>): T | undefined {
  // React.use is experimental and may not be available in all environments
  // Always return undefined and let the caller handle it with useState/useEffect
  console.warn('React.use is not available in this version of React. Using fallback.');
  return undefined;
}

/**
 * Safe version of startTransition
 */
export function safeStartTransition(callback: () => void) {
  if (typeof React.startTransition === 'function') {
    React.startTransition(callback);
  } else {
    // Just run the callback directly if startTransition isn't available
    callback();
  }
} 