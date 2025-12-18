import sql from "@/app/api/utils/sql";
import { verify } from "argon2";
import { startRequest } from "@/app/api/utils/logger";
import { checkRateLimits } from "@/app/api/utils/ratelimit";
import { writeAudit } from "@/app/api/utils/audit";

function isProd() {
  const env = process.env.ENV || process.env.NODE_ENV;
  return env === "production";
}

function shouldUseSecureCookie() {
  const url = process.env.AUTH_URL || process.env.APP_URL || "";
  return isProd() || url.startsWith("https://");
}

function buildSessionCookies(sessionToken) {
  const base = `Path=/; HttpOnly; SameSite=Lax; Max-Age=${60 * 60 * 24 * 30}`; // 30 days
  const secure = shouldUseSecureCookie() ? "; Secure" : "";
  // Set both common cookie names to be compatible with different auth runtimes
  return [
    `authjs.session-token=${sessionToken}; ${base}${secure}`,
    `next-auth.session-token=${sessionToken}; ${base}${secure}`,
  ];
}

function tinyRedirectHtml(to = "/dashboard", message = "Signing you in…") {
  const safeTo =
    typeof to === "string" && to.startsWith("/") ? to : "/dashboard";
  return `<!doctype html><html><head><meta charset="utf-8"/><meta http-equiv="refresh" content="0; url=${safeTo}"/><title>${message}</title><script>location.replace(${JSON.stringify(
    safeTo,
  )});</script></head><body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 24px; color: #0f172a"><p>${message} <a href="${safeTo}">Continue</a>.</p></body></html>`;
}

export async function GET() {
  // Friendly hint for humans opening this in a tab
  return Response.json({
    ok: true,
    message: "POST email/password to sign in",
    link: "/account/signin",
  });
}

export async function POST(request) {
  const reqMeta = startRequest({ request, route: "/api/auth/login" });
  try {
    // rate limit auth: per IP 5/min, 30/hour; per user 10/min if email present
    const rl = checkRateLimits({
      request,
      route: "auth.login",
      rules: [
        { scope: "ip", limit: 5, burst: 5, windowMs: 60_000 },
        { scope: "ip", limit: 30, burst: 30, windowMs: 60 * 60_000 },
      ],
    });
    if (!rl.allowed) {
      return Response.json(
        { ok: false, error: "rate_limited", retryAfter: rl.retryAfter },
        {
          status: 429,
          headers: {
            ...reqMeta.header(),
            "Retry-After": String(rl.retryAfter),
          },
        },
      );
    }

    const contentType = request.headers.get("content-type") || "";
    let email = "";
    let password = "";

    if (contentType.includes("application/json")) {
      const body = await request.json();
      email = (body?.email || "").toString();
      password = (body?.password || "").toString();
    } else if (contentType.includes("application/x-www-form-urlencoded")) {
      const formData = await request.formData();
      email = (formData.get("email") || "").toString();
      password = (formData.get("password") || "").toString();
    } else {
      // Try best-effort
      try {
        const body = await request.json();
        email = (body?.email || "").toString();
        password = (body?.password || "").toString();
      } catch {}
    }

    if (!email || !password) {
      return Response.redirect(
        `/account/signin?error=${encodeURIComponent("Missing credentials")}`,
        302,
      );
    }

    const rows = await sql`
      SELECT u.id, u.email, COALESCE(u.role, 'customer') AS role, a.password
      FROM auth_users u
      JOIN auth_accounts a ON u.id = a."userId"
      WHERE u.email = ${email} AND a.provider = 'credentials'
      LIMIT 1
    `;

    if (!rows?.length || !rows[0]?.password) {
      return Response.redirect(
        `/account/signin?error=${encodeURIComponent("Invalid credentials")}`,
        302,
      );
    }

    // Rate limit failed login attempts (additional protection)
    const ok = await verify(rows[0].password, password).catch(() => false);
    if (!ok) {
      // Log failed login attempt for security monitoring
      console.warn(`[SECURITY] Failed login attempt for email: ${email} from IP: ${request.headers.get('x-forwarded-for') || 'unknown'}`);
      
      return Response.redirect(
        `/account/signin?error=${encodeURIComponent("Invalid credentials")}`,
        302,
      );
    }

    // Create session
    const sessionToken =
      (globalThis.crypto?.randomUUID?.() ||
        Math.random().toString(36).slice(2)) +
      "-" +
      Date.now();
    const expires = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30); // 30 days

    await sql`
      INSERT INTO auth_sessions ("userId", expires, "sessionToken")
      VALUES (${rows[0].id}, ${expires.toISOString()}, ${sessionToken})
    `;

    await writeAudit({
      userId: rows[0].id,
      action: "auth.login",
      metadata: { correlationId: reqMeta.id },
    });

    // Get user role for redirect
    const roleRows = await sql`SELECT role FROM auth_users WHERE id = ${rows[0].id} LIMIT 1`;
    const userRole = roleRows?.[0]?.role || 'customer';
    
    // Redirect based on role
    let redirectPath = "/dashboard";
    if (userRole === 'merchant') {
      redirectPath = "/merchant/dashboard";
    } else if (userRole === 'admin') {
      redirectPath = "/admin";
    } else if (userRole === 'implementer') {
      redirectPath = "/implementer/dashboard";
    } else if (userRole === 'kyc-verifier') {
      redirectPath = "/kyc-verifier/dashboard";
    } else if (userRole === 'project-verifier') {
      redirectPath = "/project-verifier/dashboard";
    } else if (userRole === 'project-owner') {
      redirectPath = "/projects";
    }

    const html = tinyRedirectHtml(redirectPath, "Signing you in…");
    return new Response(html, {
      status: 200,
      headers: {
        "content-type": "text/html; charset=utf-8",
        "set-cookie": buildSessionCookies(sessionToken),
        ...reqMeta.header(),
      },
    });
  } catch (err) {
    console.error("/api/auth/login error", err);
    return Response.json(
      {
        ok: false,
        error: "Password verification unavailable (dev)",
        hint: "Use /api/auth/dev-login for now",
      },
      { status: 500, headers: reqMeta.header() },
    );
  }
}
