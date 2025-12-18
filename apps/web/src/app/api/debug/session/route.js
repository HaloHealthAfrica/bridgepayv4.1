import { auth } from "@/auth";
import sql from "@/app/api/utils/sql";
import { ensureAdmin } from '@/app/api/middleware/adminOnly';

/**
 * Debug endpoint to check current session
 * SECURITY: Admin-only or disabled in production
 */
export async function GET(request) {
  // SECURITY: Disable in production unless explicitly enabled via environment variable
  const isProduction = process.env.NODE_ENV === 'production';
  const debugEnabled = process.env.ENABLE_DEBUG_ENDPOINTS === 'true';
  
  if (isProduction && !debugEnabled) {
    // Return 404 to hide endpoint existence
    return Response.json(
      { ok: false, error: 'not_found' },
      { status: 404 }
    );
  }

  // SECURITY: Require admin access
  const guard = await ensureAdmin(request);
  if (!guard.ok) {
    // Log unauthorized access attempts
    console.warn(`[SECURITY] Unauthorized access attempt to /api/debug/session from IP: ${request.headers.get('x-forwarded-for') || 'unknown'}`);
    return Response.json(guard.json, { status: guard.status });
  }

  try {
    const session = await auth();

    if (session && session.user) {
      const id = session.user.id;
      const email = session.user.email;

      // Ensure we return the actual role from the DB (session may not include it)
      let role = session.user.role || null;
      try {
        const rows =
          await sql`SELECT role FROM auth_users WHERE id = ${id} LIMIT 1`;
        if (rows && rows[0] && rows[0].role) {
          role = rows[0].role;
        }
      } catch (e) {
        // If DB lookup fails, fall back safely
        console.error("/api/debug/session role lookup error", e);
      }

      // Log access for audit
      console.log(`[AUDIT] Debug session endpoint accessed by admin: ${guard.session.user.id}`);

      return Response.json({
        ok: true,
        user: {
          id,
          email,
          role: role || "customer",
        },
      });
    } else {
      return Response.json({
        ok: true,
        user: null,
      });
    }
  } catch (error) {
    console.error("Session debug error:", error);
    // Never crash; always return JSON as specified
    return Response.json({
      ok: false,
      user: null,
      error: "Failed to retrieve session",
    });
  }
}
