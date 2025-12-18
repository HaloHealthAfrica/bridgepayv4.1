/**
 * Retry Utility with Exponential Backoff
 * Implements retry logic with exponential backoff and jitter
 */

/**
 * Sleep utility
 */
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Check if error is retryable
 */
function isRetryableError(error) {
  // Don't retry client errors (4xx)
  if (error.status >= 400 && error.status < 500) {
    return false;
  }
  
  // Retry server errors (5xx) and network errors
  if (error.status >= 500 || error.status === 0) {
    return true;
  }
  
  // Retry specific error codes
  const retryableCodes = [
    'ECONNRESET',
    'ETIMEDOUT',
    'ECONNREFUSED',
    'ENOTFOUND',
    'EAI_AGAIN',
  ];
  
  return retryableCodes.includes(error.code);
}

/**
 * Retry a function with exponential backoff
 * 
 * @param {Function} fn - Function to retry
 * @param {Object} options - Retry options
 * @param {number} options.maxAttempts - Maximum number of attempts (default: 3)
 * @param {number} options.initialDelay - Initial delay in ms (default: 1000)
 * @param {number} options.maxDelay - Maximum delay in ms (default: 10000)
 * @param {number} options.factor - Exponential factor (default: 2)
 * @param {boolean} options.jitter - Add jitter to prevent thundering herd (default: true)
 * @param {Function} options.shouldRetry - Custom retry condition function
 * @returns {Promise} Result of the function
 */
export async function retryWithBackoff(fn, options = {}) {
  const {
    maxAttempts = 3,
    initialDelay = 1000,
    maxDelay = 10000,
    factor = 2,
    jitter = true,
    shouldRetry = isRetryableError,
  } = options;

  let lastError;
  const errors = [];

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const result = await fn();
      return result;
    } catch (error) {
      lastError = error;
      errors.push({
        attempt,
        error: error.message,
        timestamp: new Date().toISOString(),
      });

      // Check if error is retryable
      if (!shouldRetry(error)) {
        throw error;
      }

      // Last attempt - throw error
      if (attempt === maxAttempts) {
        const retryError = new Error(
          `Failed after ${maxAttempts} attempts: ${error.message}`
        );
        retryError.originalError = error;
        retryError.attempts = errors;
        throw retryError;
      }

      // Calculate delay with exponential backoff
      let delay = Math.min(
        initialDelay * Math.pow(factor, attempt - 1),
        maxDelay
      );

      // Add jitter to prevent thundering herd
      if (jitter) {
        delay = delay * (0.5 + Math.random() * 0.5);
      }

      console.log(
        `[Retry] Attempt ${attempt}/${maxAttempts} failed, retrying in ${Math.round(delay)}ms`,
        { error: error.message }
      );

      await sleep(delay);
    }
  }

  throw lastError;
}

/**
 * Retry with fixed delay (for rate limiting scenarios)
 */
export async function retryWithFixedDelay(fn, options = {}) {
  const { maxAttempts = 3, delay = 1000, shouldRetry = isRetryableError } =
    options;

  let lastError;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      if (!shouldRetry(error)) {
        throw error;
      }

      if (attempt === maxAttempts) {
        throw error;
      }

      await sleep(delay);
    }
  }

  throw lastError;
}

/**
 * Retry with custom strategy
 */
export async function retryWithStrategy(fn, strategy) {
  const { delays, shouldRetry = isRetryableError } = strategy;

  let lastError;

  for (let i = 0; i < delays.length; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      if (!shouldRetry(error)) {
        throw error;
      }

      if (i === delays.length - 1) {
        throw error;
      }

      await sleep(delays[i]);
    }
  }

  throw lastError;
}



