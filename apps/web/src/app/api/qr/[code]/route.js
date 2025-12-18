import { auth } from "@/auth";
import sql from "@/app/api/utils/sql";
import { startRequest } from "@/app/api/utils/logger";
import { writeAudit } from "@/app/api/utils/audit";

function sanitizeMeta(meta) {
  try {
    const m = meta || {};
    const clone = typeof m === "object" ? { ...m } : {};
    if (clone.phone_number) {
      const pn = String(clone.phone_number);
      clone.phone_number =
        pn.length > 4
          ? `${"*".repeat(Math.max(0, pn.length - 4))}${pn.slice(-4)}`
          : "***";
    }
    if (clone.wallet_no) {
      const w = String(clone.wallet_no);
      clone.wallet_no =
        w.length > 4
          ? `${"*".repeat(Math.max(0, w.length - 4))}${w.slice(-4)}`
          : "***";
    }
    return clone;
  } catch {
    return {};
  }
}

async function getQrByCode(code) {
  const rows = await sql`SELECT * FROM qr_codes WHERE code = ${code} LIMIT 1`;
  return rows?.[0] || null;
}

export async function GET(request, { params: { code } }) {
  const reqMeta = startRequest({ request, route: "/api/qr/[code]" });
  try {
    const qr = await getQrByCode(code);
    if (!qr) {
      return Response.json(
        { ok: false, error: "not_found" },
        { status: 404, headers: reqMeta.header() },
      );
    }
    const now = new Date();
    let status = qr.status;
    const expired = qr.expires_at ? new Date(qr.expires_at) < now : false;
    if (expired && status !== "expired") {
      try {
        await sql`UPDATE qr_codes SET status = 'expired', updated_at = NOW() WHERE code = ${code}`;
        status = "expired";
      } catch {}
    }
    return Response.json(
      {
        ok: true,
        code: qr.code,
        mode: qr.mode,
        amount: qr.amount,
        currency: qr.currency,
        status,
        expires_at: qr.expires_at,
        metadata: sanitizeMeta(qr.metadata || {}),
      },
      { headers: reqMeta.header() },
    );
  } catch (e) {
    return Response.json(
      { ok: false, error: e?.message || "unknown_error" },
      { status: 500, headers: reqMeta.header() },
    );
  }
}

export async function PATCH(request, { params: { code } }) {
  const reqMeta = startRequest({ request, route: "/api/qr/[code]#patch" });
  try {
    const session = await auth();
    let role = session?.user?.role || null;
    if (!role && session?.user?.id) {
      try {
        const r =
          await sql`SELECT role FROM auth_users WHERE id = ${session.user.id} LIMIT 1`;
        role = r?.[0]?.role || null;
      } catch {}
    }
    if (!session?.user?.id || !["admin", "merchant"].includes(role)) {
      return Response.json(
        { ok: false, error: "forbidden" },
        { status: 403, headers: reqMeta.header() },
      );
    }

    let body = null;
    try {
      body = await request.json();
    } catch {}
    const nextStatus = body?.status === "disabled" ? "disabled" : null;
    if (!nextStatus) {
      return Response.json(
        {
          ok: false,
          error: "validation_error",
          details: ["status must be 'disabled'"],
        },
        { status: 400, headers: reqMeta.header() },
      );
    }
    const res =
      await sql`UPDATE qr_codes SET status = 'disabled', updated_at = NOW() WHERE code = ${code} RETURNING code, status`;
    if (!res?.[0]) {
      return Response.json(
        { ok: false, error: "not_found" },
        { status: 404, headers: reqMeta.header() },
      );
    }
    await writeAudit({
      userId: session.user.id,
      action: "qr.deactivate",
      metadata: { code },
    });
    return Response.json(
      { ok: true, code, status: "disabled" },
      { headers: reqMeta.header() },
    );
  } catch (e) {
    return Response.json(
      { ok: false, error: e?.message || "unknown_error" },
      { status: 500, headers: reqMeta.header() },
    );
  }
}
