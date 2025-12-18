import sql from "@/app/api/utils/sql";

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

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const email = (searchParams.get("email") || "").toString();
  const redirect = (searchParams.get("redirect") || "/dashboard").toString();

  if (!isDev()) {
    return Response.json(
      { ok: false, error: "Disabled in production" },
      { status: 403 },
    );
  }

  if (!email) {
    return Response.json(
      { ok: false, error: "Missing email" },
      { status: 400 },
    );
  }

  try {
    const userRows =
      await sql`SELECT id FROM auth_users WHERE email = ${email} LIMIT 1`;
    if (!userRows?.length) {
      return Response.json(
        { ok: false, error: "User does not exist" },
        { status: 404 },
      );
    }
    const userId = userRows[0].id;
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
        Location: redirect.startsWith("/") ? redirect : "/dashboard",
        "set-cookie": buildSessionCookies(sessionToken),
      },
    });
  } catch (err) {
    console.error("/api/auth/dev-login error", err);
    return Response.json(
      { ok: false, error: "Failed to create session" },
      { status: 500 },
    );
  }
}
