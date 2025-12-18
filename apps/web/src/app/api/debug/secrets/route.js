import { ensureAdmin } from '@/app/api/middleware/adminOnly';

/**
 * Debug endpoint to check if secrets are configured
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
    console.warn(`[SECURITY] Unauthorized access attempt to /api/debug/secrets from IP: ${request.headers.get('x-forwarded-for') || 'unknown'}`);
    return Response.json(guard.json, { status: guard.status });
  }

  try {
    // Check for Lemonade secrets (only true/false, never values)
    const secretsStatus = {
      LEMONADE_CONSUMER_KEY: !!process.env.LEMONADE_CONSUMER_KEY,
      LEMONADE_CONSUMER_SECRET: !!process.env.LEMONADE_CONSUMER_SECRET,
      LEMONADE_BASE_URL: !!process.env.LEMONADE_BASE_URL,
      LEMONADE_CLIENT_ID: !!process.env.LEMONADE_CLIENT_ID,
      LEMONADE_CLIENT_SECRET: !!process.env.LEMONADE_CLIENT_SECRET,
      LEMONADE_RELAY_URL: !!process.env.LEMONADE_RELAY_URL,
    };

    // Log access for audit
    console.log(`[AUDIT] Debug secrets endpoint accessed by admin: ${guard.session.user.id}`);

    return Response.json({ ok: true, ...secretsStatus });
  } catch (error) {
    console.error("Secrets check error:", error);
    // Never crash; always return JSON
    return Response.json({
      ok: false,
      LEMONADE_CONSUMER_KEY: false,
      LEMONADE_CONSUMER_SECRET: false,
      LEMONADE_BASE_URL: false,
      error: "Failed to check secrets",
    });
  }
}
