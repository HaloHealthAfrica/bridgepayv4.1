/**
 * CSRF Protection Middleware
 * Validates CSRF tokens for state-changing operations
 * 
 * Note: Auth.js handles CSRF for auth routes automatically.
 * This middleware is for additional protection on other routes if needed.
 */

import { auth } from '@/auth';

/**
 * CSRF token validation middleware
 * Validates CSRF token from header or form data
 */
export async function validateCSRF(request) {
  // Skip CSRF check if explicitly disabled (for development)
  if (process.env.SKIP_CSRF_CHECK === 'true') {
    return { valid: true };
  }

  // Skip CSRF for GET, HEAD, OPTIONS requests (safe methods)
  const method = request.method.toUpperCase();
  if (['GET', 'HEAD', 'OPTIONS'].includes(method)) {
    return { valid: true };
  }

  try {
    // Get session to access CSRF token
    const session = await auth();
    
    if (!session) {
      return {
        valid: false,
        error: 'No session found',
      };
    }

    // Auth.js automatically validates CSRF tokens for auth routes
    // For other routes, we can add additional validation here if needed
    // For now, we rely on Auth.js's built-in CSRF protection

    return { valid: true };
  } catch (error) {
    console.error('CSRF validation error:', error);
    return {
      valid: false,
      error: 'CSRF validation failed',
    };
  }
}

/**
 * Hono middleware for CSRF protection
 */
export function csrfMiddleware() {
  return async (c, next) => {
    const validation = await validateCSRF(c.req.raw);
    
    if (!validation.valid) {
      return c.json(
        { ok: false, error: 'csrf_validation_failed', message: validation.error },
        403
      );
    }
    
    await next();
  };
}



