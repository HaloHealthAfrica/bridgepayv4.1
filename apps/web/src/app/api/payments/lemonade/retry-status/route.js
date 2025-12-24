import { auth } from "@/auth";
import { startRequest } from "@/app/api/utils/logger";

function isAdmin(role) {
  return role === "admin";
}

export async function POST(request) {
  const reqMeta = startRequest({
    request,
    route: "/api/payments/lemonade/retry-status",
  });
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json(
        { ok: false, error: "unauthorized" },
        { status: 401, headers: reqMeta.header() },
      );
    }
    let role = session?.user?.role;
    try {
      if (!role) {
        const res = await fetch(
          `${process.env.APP_URL || ""}/api/debug/session`,
        );
        // best-effort; we only need admin
      }
    } catch {}
    if (role !== "admin") {
      // fetch role via db would be better; keep consistent with other routes if needed
    }

    // Force admin only
    if (role !== "admin") {
      return Response.json(
        { ok: false, error: "forbidden" },
        { status: 403, headers: reqMeta.header() },
      );
    }

    let body = null;
    try {
      body = await request.json();
    } catch {}
    const payment_id = Number(body?.payment_id);
    if (!payment_id) {
      return Response.json(
        {
          ok: false,
          error: "validation_error",
          details: [{ field: "payment_id", message: "required" }],
        },
        { status: 400, headers: reqMeta.header() },
      );
    }

    // call existing status-sync route internally
    const r = await fetch(
      `${process.env.APP_URL || ""}/api/payments/lemonade/status-sync`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Request-Id": reqMeta.id,
        },
        body: JSON.stringify({ payment_id }),
      },
    );
    const data = await r.json().catch(() => ({ ok: false }));

    return Response.json(
      { ok: !!data?.ok, payment_id, data },
      { status: 200, headers: reqMeta.header() },
    );
  } catch (e) {
    return Response.json(
      { ok: false, error: e?.message || "unknown_error" },
      { status: 500, headers: reqMeta.header() },
    );
  }
}
