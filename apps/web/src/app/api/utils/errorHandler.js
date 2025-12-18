/**
 * Centralized Error Handler
 * Provides standardized error responses and error code management
 */

/**
 * Standard error codes used across the application
 */
export const ErrorCodes = {
  // Authentication & Authorization
  UNAUTHORIZED: "unauthorized",
  FORBIDDEN: "forbidden",
  SESSION_EXPIRED: "session_expired",
  
  // Validation
  VALIDATION_ERROR: "validation_error",
  INVALID_INPUT: "invalid_input",
  MISSING_FIELDS: "missing_fields",
  INVALID_JSON: "invalid_json",
  
  // Resources
  NOT_FOUND: "not_found",
  ALREADY_EXISTS: "already_exists",
  CONFLICT: "conflict",
  
  // Business Logic
  INSUFFICIENT_FUNDS: "insufficient_funds",
  INVALID_AMOUNT: "invalid_amount",
  INVALID_CURRENCY: "invalid_currency",
  INVALID_STATUS: "invalid_status",
  
  // External Services
  EXTERNAL_SERVICE_ERROR: "external_service_error",
  PAYMENT_GATEWAY_ERROR: "payment_gateway_error",
  
  // Server
  SERVER_ERROR: "server_error",
  DATABASE_ERROR: "database_error",
  TIMEOUT: "timeout",
  
  // CSRF
  CSRF_TOKEN_MISMATCH: "csrf_token_mismatch",
  CSRF_ORIGIN_MISMATCH: "csrf_origin_mismatch",
};

/**
 * HTTP status code mappings for error codes
 */
const ErrorStatusMap = {
  [ErrorCodes.UNAUTHORIZED]: 401,
  [ErrorCodes.FORBIDDEN]: 403,
  [ErrorCodes.SESSION_EXPIRED]: 401,
  [ErrorCodes.VALIDATION_ERROR]: 400,
  [ErrorCodes.INVALID_INPUT]: 400,
  [ErrorCodes.MISSING_FIELDS]: 400,
  [ErrorCodes.INVALID_JSON]: 400,
  [ErrorCodes.NOT_FOUND]: 404,
  [ErrorCodes.ALREADY_EXISTS]: 409,
  [ErrorCodes.CONFLICT]: 409,
  [ErrorCodes.INSUFFICIENT_FUNDS]: 400,
  [ErrorCodes.INVALID_AMOUNT]: 400,
  [ErrorCodes.INVALID_CURRENCY]: 400,
  [ErrorCodes.INVALID_STATUS]: 400,
  [ErrorCodes.EXTERNAL_SERVICE_ERROR]: 502,
  [ErrorCodes.PAYMENT_GATEWAY_ERROR]: 502,
  [ErrorCodes.SERVER_ERROR]: 500,
  [ErrorCodes.DATABASE_ERROR]: 500,
  [ErrorCodes.TIMEOUT]: 504,
  [ErrorCodes.CSRF_TOKEN_MISMATCH]: 403,
  [ErrorCodes.CSRF_ORIGIN_MISMATCH]: 403,
};

/**
 * Standard error response format
 * @param {string} errorCode - Error code from ErrorCodes
 * @param {object} options - Additional options
 * @param {string} options.message - Human-readable error message
 * @param {object} options.details - Additional error details
 * @param {number} options.status - Override HTTP status code
 * @param {object} options.headers - Additional response headers
 * @returns {Response}
 */
export function errorResponse(errorCode, options = {}) {
  const {
    message = null,
    details = null,
    status = null,
    headers = {},
  } = options;

  const httpStatus = status || ErrorStatusMap[errorCode] || 500;
  const response = {
    ok: false,
    error: errorCode,
  };

  if (message) {
    response.message = message;
  }

  if (details) {
    response.details = details;
  }

  // Log error in development
  if (process.env.NODE_ENV !== "production") {
    console.error(`[ErrorHandler] ${errorCode}:`, {
      message,
      details,
      status: httpStatus,
    });
  }

  return Response.json(response, { status: httpStatus, headers });
}

/**
 * Success response helper
 * @param {object} data - Response data
 * @param {number} status - HTTP status code (default: 200)
 * @param {object} headers - Additional response headers
 * @returns {Response}
 */
export function successResponse(data = {}, status = 200, headers = {}) {
  return Response.json(
    {
      ok: true,
      ...data,
    },
    { status, headers }
  );
}

/**
 * Handle and format validation errors from Yup
 * @param {Error} validationError - Yup validation error
 * @returns {Response}
 */
export function handleValidationError(validationError) {
  if (validationError.name === "ValidationError") {
    const errors = {};
    if (validationError.inner) {
      validationError.inner.forEach((err) => {
        if (err.path) {
          errors[err.path] = err.message;
        }
      });
    } else if (validationError.path) {
      errors[validationError.path] = validationError.message;
    }

    return errorResponse(ErrorCodes.VALIDATION_ERROR, {
      message: "Validation failed",
      details: {
        errors,
        summary: validationError.message,
      },
    });
  }

  return errorResponse(ErrorCodes.VALIDATION_ERROR, {
    message: validationError.message || "Validation failed",
  });
}

/**
 * Handle unexpected errors
 * @param {Error} error - Error object
 * @param {object} options - Additional options
 * @returns {Response}
 */
export function handleUnexpectedError(error, options = {}) {
  const { log = true, headers = {} } = options;

  if (log) {
    console.error("[ErrorHandler] Unexpected error:", error);
  }

  // Don't expose internal error details in production
  const message =
    process.env.NODE_ENV === "production"
      ? "An unexpected error occurred"
      : error.message;

  return errorResponse(ErrorCodes.SERVER_ERROR, {
    message,
    details:
      process.env.NODE_ENV !== "production"
        ? {
            name: error.name,
            stack: error.stack,
          }
        : undefined,
    headers,
  });
}

/**
 * Wrap async route handlers with error handling
 * @param {Function} handler - Async route handler function
 * @returns {Function} Wrapped handler
 */
export function withErrorHandling(handler) {
  return async (request, ...args) => {
    try {
      return await handler(request, ...args);
    } catch (error) {
      // If the handler already returned a Response, return it
      if (error instanceof Response) {
        return error;
      }

      // Handle validation errors
      if (error.name === "ValidationError") {
        return handleValidationError(error);
      }

      // Handle unexpected errors
      return handleUnexpectedError(error);
    }
  };
}


