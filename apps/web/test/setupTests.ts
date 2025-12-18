/**
 * Test Setup File
 * Runs before all tests
 */

// Set test environment variables if not already set
if (!process.env.NODE_ENV) {
  process.env.NODE_ENV = 'test';
}

// Suppress console errors in tests unless explicitly needed
if (process.env.VITEST_SILENT !== 'false') {
  const originalError = console.error;
  console.error = (...args: any[]) => {
    // Only suppress known test-related errors
    const message = args[0]?.toString() || '';
    if (
      message.includes('Warning:') ||
      message.includes('ReactDOM.render')
    ) {
      return;
    }
    originalError(...args);
  };
}