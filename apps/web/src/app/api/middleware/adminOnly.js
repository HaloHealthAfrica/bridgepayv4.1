/**
 * Admin-Only Middleware
 * Ensures only admin users can access protected routes
 */

import { auth } from '@/auth';
import sql from '@/app/api/utils/sql';

/**
 * Middleware to ensure user is authenticated and has admin role
 * @param {Request} request - The incoming request
 * @returns {Promise<{ok: boolean, session?: object, status?: number, json?: object}>}
 */
export async function ensureAdmin(request) {
  try {
    const session = await auth();
    
    if (!session || !session.user?.id) {
      return {
        ok: false,
        status: 401,
        json: { ok: false, error: 'unauthorized' },
      };
    }

    // Get role from session or database
    let role = session.user.role;
    if (!role) {
      try {
        const rows = await sql`SELECT role FROM auth_users WHERE id = ${session.user.id} LIMIT 1`;
        role = rows?.[0]?.role;
      } catch (error) {
        console.error('Error fetching user role:', error);
        return {
          ok: false,
          status: 500,
          json: { ok: false, error: 'server_error' },
        };
      }
    }

    if (role !== 'admin') {
      return {
        ok: false,
        status: 403,
        json: { ok: false, error: 'forbidden', message: 'Admin access required' },
      };
    }

    return {
      ok: true,
      session,
    };
  } catch (error) {
    console.error('ensureAdmin error:', error);
    return {
      ok: false,
      status: 500,
      json: { ok: false, error: 'server_error' },
    };
  }
}

/**
 * Hono middleware for admin-only routes
 */
export function adminOnlyMiddleware() {
  return async (c, next) => {
    const guard = await ensureAdmin(c.req.raw);
    if (!guard.ok) {
      return c.json(guard.json, guard.status);
    }
    // Store session in context for use in route handler
    c.set('session', guard.session);
    await next();
  };
}

