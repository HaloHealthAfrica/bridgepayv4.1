/**
 * Test Utilities and Helpers
 * Provides common utilities for testing API routes and utilities
 */

/**
 * Create a mock request object
 * @param {object} options - Request options
 * @param {string} options.method - HTTP method
 * @param {string} options.url - Request URL
 * @param {object} options.body - Request body
 * @param {object} options.headers - Request headers
 * @returns {Request} Mock request object
 */
export function createMockRequest(options = {}) {
  const {
    method = "GET",
    url = "http://localhost/api/test",
    body = null,
    headers = {},
  } = options;

  const requestInit = {
    method,
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
  };

  if (body) {
    requestInit.body = JSON.stringify(body);
  }

  return new Request(url, requestInit);
}

/**
 * Create a mock session object
 * @param {object} options - Session options
 * @param {string} options.userId - User ID
 * @param {string} options.email - User email
 * @param {string} options.role - User role
 * @returns {object} Mock session object
 */
export function createMockSession(options = {}) {
  const {
    userId = "00000000-0000-0000-0000-000000000001",
    email = "test@example.com",
    role = "customer",
  } = options;

  return {
    user: {
      id: userId,
      email,
      role,
      name: "Test User",
    },
    expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
  };
}

/**
 * Mock auth function for testing
 * @param {object} session - Session to return (or null for unauthenticated)
 * @returns {Function} Mock auth function
 */
export function createMockAuth(session = null) {
  return async () => {
    return session;
  };
}

/**
 * Extract JSON from Response
 * @param {Response} response - Response object
 * @returns {Promise<object>} Parsed JSON
 */
export async function getJson(response) {
  return await response.json();
}

/**
 * Assert response is successful
 * @param {Response} response - Response object
 * @param {number} expectedStatus - Expected status code
 * @returns {Promise<object>} Response JSON
 */
export async function expectSuccess(response, expectedStatus = 200) {
  if (!response.ok) {
    const text = await response.text();
    throw new Error(
      `Expected success (${expectedStatus}) but got ${response.status}: ${text}`
    );
  }
  if (response.status !== expectedStatus) {
    const text = await response.text();
    throw new Error(
      `Expected status ${expectedStatus} but got ${response.status}: ${text}`
    );
  }
  return await response.json();
}

/**
 * Assert response is an error
 * @param {Response} response - Response object
 * @param {string} expectedError - Expected error code
 * @param {number} expectedStatus - Expected status code
 * @returns {Promise<object>} Response JSON
 */
export async function expectError(
  response,
  expectedError = null,
  expectedStatus = null
) {
  const json = await response.json();
  
  if (json.ok !== false) {
    throw new Error(`Expected error response but got success: ${JSON.stringify(json)}`);
  }

  if (expectedError && json.error !== expectedError) {
    throw new Error(
      `Expected error "${expectedError}" but got "${json.error}": ${JSON.stringify(json)}`
    );
  }

  if (expectedStatus && response.status !== expectedStatus) {
    throw new Error(
      `Expected status ${expectedStatus} but got ${response.status}: ${JSON.stringify(json)}`
    );
  }

  return json;
}

/**
 * Wait for a condition to be true
 * @param {Function} condition - Function that returns a boolean
 * @param {number} timeout - Timeout in milliseconds
 * @param {number} interval - Check interval in milliseconds
 * @returns {Promise<void>}
 */
export function waitFor(condition, timeout = 5000, interval = 100) {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    const check = () => {
      if (condition()) {
        resolve();
      } else if (Date.now() - startTime > timeout) {
        reject(new Error(`Timeout waiting for condition after ${timeout}ms`));
      } else {
        setTimeout(check, interval);
      }
    };
    check();
  });
}

/**
 * Create a test database connection string
 * Uses TEST_DATABASE_URL if available, otherwise uses DATABASE_URL with _test suffix
 */
export function getTestDatabaseUrl() {
  if (process.env.TEST_DATABASE_URL) {
    return process.env.TEST_DATABASE_URL;
  }
  
  const baseUrl = process.env.DATABASE_URL;
  if (!baseUrl) {
    throw new Error("DATABASE_URL or TEST_DATABASE_URL must be set for tests");
  }
  
  // Append _test to database name
  return baseUrl.replace(/\/[^\/]+$/, "/bridge_test");
}

