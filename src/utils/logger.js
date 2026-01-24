// Logger utility with production guards
// Only logs in development mode or when explicitly enabled

const isDevelopment = __DEV__ || process.env.NODE_ENV !== 'production';

/**
 * Logs a message (only in development)
 * @param {...any} args - Arguments to log
 */
export const log = (...args) => {
  if (isDevelopment) {
    console.log(...args);
  }
};

/**
 * Logs a warning (always logged, but can be filtered in production)
 * @param {...any} args - Arguments to log
 */
export const warn = (...args) => {
  if (isDevelopment) {
    console.warn(...args);
  }
  // In production, you might want to send to error tracking service
  // if (errorTrackingService) errorTrackingService.logWarning(...args);
};

/**
 * Logs an error (always logged, but can be filtered in production)
 * @param {...any} args - Arguments to log
 */
export const error = (...args) => {
  if (isDevelopment) {
    console.error(...args);
  }
  // In production, you might want to send to error tracking service
  // if (errorTrackingService) errorTrackingService.logError(...args);
};

/**
 * Logs debug information (only in development)
 * @param {...any} args - Arguments to log
 */
export const debug = (...args) => {
  if (isDevelopment) {
    console.debug(...args);
  }
};
