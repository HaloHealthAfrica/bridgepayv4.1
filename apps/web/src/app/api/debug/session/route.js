import { auth } from "@/auth";
import sql from "@/app/api/utils/sql";

export async function GET() {
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

      return Response.json({
        user: {
          id,
          email,
          role: role || "customer",
        },
      });
    } else {
      return Response.json({
        user: null,
      });
    }
  } catch (error) {
    console.error("Session debug error:", error);
    // Never crash; always return JSON as specified
    return Response.json({
      user: null,
      error: "Failed to retrieve session",
    });
  }
}
