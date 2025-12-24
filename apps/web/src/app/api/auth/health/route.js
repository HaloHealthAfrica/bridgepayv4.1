import sql from "@/app/api/utils/sql";

export async function GET() {
  const env = process.env.ENV || process.env.NODE_ENV || "development";
  let hasDatabase = false;
  let sessionsTableOk = false;
  const hasAuthSecret = !!process.env.AUTH_SECRET;
  let message = "";

  try {
    if (!process.env.DATABASE_URL) {
      message = "Missing DATABASE_URL";
    } else {
      // Basic connectivity check
      const ping = await sql`SELECT 1 as ok`;
      hasDatabase = !!(ping && ping[0] && ping[0].ok === 1);

      // Check for auth_sessions table existence
      const tableCheck = await sql`
        SELECT EXISTS (
          SELECT 1 FROM information_schema.tables
          WHERE table_schema = 'public' AND table_name = 'auth_sessions'
        ) as exists
      `;
      sessionsTableOk = !!(tableCheck && tableCheck[0] && tableCheck[0].exists);

      if (!sessionsTableOk) {
        message = "auth_sessions table missing";
      }
    }
  } catch (err) {
    console.error("/api/auth/health error", err);
    message = "Database error during health check";
  }
  const ok = hasDatabase && hasAuthSecret && sessionsTableOk;
  return Response.json({
    ok,
    hasDatabase,
    hasAuthSecret,
    sessionsTableOk,
    env,
    message: ok ? undefined : message,
  });
}
