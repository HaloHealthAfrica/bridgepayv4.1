import sql from "@/app/api/utils/sql";
import { hash } from "argon2";
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
  return [
    `authjs.session-token=${sessionToken}; ${base}${secure}`,
    `next-auth.session-token=${sessionToken}; ${base}${secure}`,
  ];
}

function tinyRedirectHtml(
  to = "/dashboard",
  message = "Creating your account…",
) {
  const safeTo =
    typeof to === "string" && to.startsWith("/") ? to : "/dashboard";
  return `<!doctype html><html><head><meta charset=\"utf-8\"/><meta http-equiv=\"refresh\" content=\"0; url=${safeTo}\"/><title>${message}</title><script>location.replace(${JSON.stringify(
    safeTo,
  )});</script></head><body style=\"font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 24px; color: #0f172a\"><p>${message} <a href=\"${safeTo}\">Continue</a>.</p></body></html>`;
}

export async function GET() {
  return Response.json({
    ok: true,
    message: "POST firstName, lastName, email, password to create an account",
    link: "/account/signup",
  });
}

export async function POST(request) {
  const reqMeta = startRequest({ request, route: "/api/auth/signup" });
  try {
    // Rate limit auth signup: 5/min IP, 30/hour IP
    const rl = checkRateLimits({
      request,
      route: "auth.signup",
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
    let firstName = "";
    let lastName = "";
    let email = "";
    let password = "";

    if (contentType.includes("application/json")) {
      const body = await request.json();
      firstName = (body?.firstName || "").toString();
      lastName = (body?.lastName || "").toString();
      email = (body?.email || "").toString();
      password = (body?.password || "").toString();
    } else if (contentType.includes("application/x-www-form-urlencoded")) {
      const formData = await request.formData();
      firstName = (formData.get("firstName") || "").toString();
      lastName = (formData.get("lastName") || "").toString();
      email = (formData.get("email") || "").toString();
      password = (formData.get("password") || "").toString();
    } else {
      try {
        const body = await request.json();
        firstName = (body?.firstName || "").toString();
        lastName = (body?.lastName || "").toString();
        email = (body?.email || "").toString();
        password = (body?.password || "").toString();
      } catch {}
    }

    if (!firstName || !lastName || !email || !password) {
      return Response.redirect(
        `/account/signup?error=${encodeURIComponent("Please fill in all fields")}`,
        302,
      );
    }

    const existing =
      await sql`SELECT id FROM auth_users WHERE email = ${email} LIMIT 1`;
    if (existing?.length) {
      return Response.redirect(
        `/account/signup?error=${encodeURIComponent("Email already registered")}`,
        302,
      );
    }

    const name = `${firstName} ${lastName}`.trim();
    const created = await sql`
      INSERT INTO auth_users (name, email)
      VALUES (${name}, ${email})
      RETURNING id
    `;
    const userId = created?.[0]?.id;
    if (!userId) {
      return Response.redirect(
        `/account/signup?error=${encodeURIComponent("Could not create user")}`,
        302,
      );
    }

    const passwordHash = await hash(password);
    await sql`
      INSERT INTO auth_accounts ("userId", provider, type, "providerAccountId", password)
      VALUES (${userId}, 'credentials', 'credentials', ${userId}, ${passwordHash})
    `;

    // Create session
    const sessionToken =
      (globalThis.crypto?.randomUUID?.() ||
        Math.random().toString(36).slice(2)) +
      "-" +
      Date.now();
    const expires = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30);
    await sql`
      INSERT INTO auth_sessions ("userId", expires, "sessionToken")
      VALUES (${userId}, ${expires.toISOString()}, ${sessionToken})
    `;

    await writeAudit({
      userId,
      action: "auth.signup",
      metadata: { correlationId: reqMeta.id },
    });

    const html = tinyRedirectHtml("/dashboard", "Creating your account…");
    return new Response(html, {
      status: 200,
      headers: {
        "content-type": "text/html; charset=utf-8",
        "set-cookie": buildSessionCookies(sessionToken),
        ...reqMeta.header(),
      },
    });
  } catch (err) {
    console.error("/api/auth/signup error", err);
    return Response.redirect(
      `/account/signup?error=${encodeURIComponent("Sign up failed. Please try again.")}`,
      302,
    );
  }
}
