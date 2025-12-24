import { auth } from "@/auth";
import sql from "@/app/api/utils/sql"; // not used but kept for symmetry
import { snapshot } from "@/app/api/utils/metrics";

async function ensureAdmin() {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, status: 401 };
  let role = session.user.role;
  if (!role) {
    try {
      const r =
        await sql`SELECT role FROM auth_users WHERE id = ${session.user.id} LIMIT 1`;
      role = r?.[0]?.role;
    } catch {}
  }
  if (role !== "admin") return { ok: false, status: 403 };
  return { ok: true };
}

export async function GET() {
  const guard = await ensureAdmin();
  if (!guard.ok)
    return Response.json(
      { ok: false, error: "forbidden" },
      { status: guard.status },
    );
  return Response.json({ ok: true, metrics: snapshot() });
}
