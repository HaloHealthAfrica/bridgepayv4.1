import sql from "@/app/api/utils/sql";
import { hash } from "argon2";

function isDev() {
  const env = process.env.ENV || process.env.NODE_ENV || "development";
  return env !== "production";
}

function shouldUseSecureCookie() {
  const url = process.env.AUTH_URL || process.env.APP_URL || "";
  return (
    (process.env.ENV || process.env.NODE_ENV) === "production" ||
    url.startsWith("https://")
  );
}

function buildSessionCookies(sessionToken) {
  const base = `Path=/; HttpOnly; SameSite=Lax; Max-Age=${60 * 60 * 24 * 30}`;
  const secure = shouldUseSecureCookie() ? "; Secure" : "";
  return [
    `authjs.session-token=${sessionToken}; ${base}${secure}`,
    `next-auth.session-token=${sessionToken}; ${base}${secure}`,
  ];
}

export async function POST(request) {
  if (!isDev()) {
    return Response.json(
      { ok: false, error: "Disabled in production" },
      { status: 403 },
    );
  }

  try {
    const body = await request.json().catch(() => ({}));
    const name = (body?.name || "").toString().trim() || "Admin";
    const email = (body?.email || "").toString().trim();
    const password = (body?.password || "").toString();

    if (!email || !password) {
      return Response.json(
        { ok: false, error: "Email and password are required" },
        { status: 400 },
      );
    }

    const existing =
      await sql`SELECT id FROM auth_users WHERE email = ${email} LIMIT 1`;
    let userId;
    if (existing?.length) {
      userId = existing[0].id;
      // Ensure role = admin
      await sql`UPDATE auth_users SET role = 'admin' WHERE id = ${userId}`;
    } else {
      const created =
        await sql`INSERT INTO auth_users (name, email, role) VALUES (${name}, ${email}, 'admin') RETURNING id`;
      userId = created?.[0]?.id;
      if (!userId) {
        return Response.json(
          { ok: false, error: "Failed to create user" },
          { status: 500 },
        );
      }
    }

    const pwHash = await hash(password);
    // Upsert credentials account
    const account =
      await sql`SELECT id FROM auth_accounts WHERE "userId" = ${userId} AND provider = 'credentials' LIMIT 1`;
    if (account?.length) {
      await sql`UPDATE auth_accounts SET password = ${pwHash} WHERE id = ${account[0].id}`;
    } else {
      await sql`INSERT INTO auth_accounts ("userId", provider, type, "providerAccountId", password) VALUES (${userId}, 'credentials', 'credentials', ${userId}, ${pwHash})`;
    }

    // Create session and redirect
    const sessionToken =
      (globalThis.crypto?.randomUUID?.() ||
        Math.random().toString(36).slice(2)) +
      "-" +
      Date.now();
    const expires = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30);
    await sql`INSERT INTO auth_sessions ("userId", expires, "sessionToken") VALUES (${userId}, ${expires.toISOString()}, ${sessionToken})`;

    return new Response(null, {
      status: 302,
      headers: {
        Location: "/dashboard",
        "set-cookie": buildSessionCookies(sessionToken),
      },
    });
  } catch (err) {
    console.error("/api/auth/dev-admin error", err);
    return Response.json(
      { ok: false, error: "Internal error" },
      { status: 500 },
    );
  }
}
