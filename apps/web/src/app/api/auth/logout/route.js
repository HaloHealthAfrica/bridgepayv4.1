function isProd() {
  const env = process.env.ENV || process.env.NODE_ENV;
  return env === "production";
}

function shouldUseSecureCookie() {
  const url = process.env.AUTH_URL || process.env.APP_URL || "";
  return isProd() || url.startsWith("https://");
}

function clearSessionCookies() {
  const base = "Path=/; HttpOnly; SameSite=Lax; Max-Age=0";
  const secure = shouldUseSecureCookie() ? "; Secure" : "";
  return [
    `authjs.session-token=; ${base}${secure}`,
    `next-auth.session-token=; ${base}${secure}`,
  ];
}

export async function GET() {
  return new Response(null, {
    status: 302,
    headers: {
      Location: "/",
      "set-cookie": clearSessionCookies(),
    },
  });
}


