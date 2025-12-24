import { auth } from "@/auth";
import sql from "@/app/api/utils/sql";
import { startRequest } from "@/app/api/utils/logger";

function isPrivileged(role) {
  return role === "admin" || role === "merchant";
}

function computeTotals(items = []) {
  let subtotal = 0;
  for (const it of items) {
    const qty = Number(it?.qty || 0);
    const price = Number(it?.price || 0);
    if (qty > 0 && price >= 0) subtotal += qty * price;
  }
  const tax = 0; // Phase 9: tax = 0 for now
  const total = subtotal + tax;
  return { subtotal, tax, total };
}

export async function POST(request) {
  const reqMeta = startRequest({ request, route: "/api/invoices[POST]" });
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json(
        { ok: false, error: "unauthorized" },
        { status: 401, headers: reqMeta.header() },
      );
    }
    let role = session.user.role;
    if (!role) {
      try {
        const r =
          await sql`SELECT role FROM auth_users WHERE id = ${session.user.id} LIMIT 1`;
        role = r?.[0]?.role;
      } catch {}
    }
    if (!isPrivileged(role)) {
      return Response.json(
        { ok: false, error: "forbidden" },
        { status: 403, headers: reqMeta.header() },
      );
    }

    let body = null;
    try {
      body = await request.json();
    } catch {}

    const currency = body?.currency || "KES";
    const items = Array.isArray(body?.items) ? body.items : [];
    const { subtotal, tax, total } = computeTotals(items);

    if (!(total > 0)) {
      return Response.json(
        { ok: false, error: "invalid_total" },
        { status: 400, headers: reqMeta.header() },
      );
    }

    const inserted = await sql(
      "INSERT INTO invoices (customer_email, customer_phone, customer_name, due_date, currency, status, subtotal, tax, total) VALUES ($1,$2,$3,$4,$5,'draft',$6,$7,$8) RETURNING id",
      [
        body?.customer_email || null,
        body?.customer_phone || null,
        body?.customer_name || null,
        body?.due_date ? new Date(body.due_date) : null,
        currency,
        subtotal,
        tax,
        total,
      ],
    );
    const invoiceId = inserted?.[0]?.id;

    for (const it of items) {
      const qty = Number(it?.qty || 0);
      const price = Number(it?.price || 0);
      const line_total = qty * price;
      await sql(
        "INSERT INTO invoice_items (invoice_id, name, qty, price, description, line_total) VALUES ($1,$2,$3,$4,$5,$6)",
        [
          invoiceId,
          String(it?.name || "Item"),
          qty,
          price,
          it?.description || null,
          line_total,
        ],
      );
    }

    const hosted_url = `${process.env.APP_URL || ""}/i/${invoiceId}`;
    return Response.json(
      { ok: true, id: invoiceId, total, hosted_url },
      { headers: reqMeta.header() },
    );
  } catch (e) {
    return Response.json(
      { ok: false, error: e?.message || "unknown_error" },
      { status: 500 },
    );
  }
}

// Optional: simple list for merchant (last 50)
export async function GET(request) {
  const reqMeta = startRequest({ request, route: "/api/invoices[GET]" });
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json(
        { ok: false, error: "unauthorized" },
        { status: 401, headers: reqMeta.header() },
      );
    }
    let role = session.user.role;
    if (!role) {
      try {
        const r =
          await sql`SELECT role FROM auth_users WHERE id = ${session.user.id} LIMIT 1`;
        role = r?.[0]?.role;
      } catch {}
    }
    if (!isPrivileged(role)) {
      return Response.json(
        { ok: false, error: "forbidden" },
        { status: 403, headers: reqMeta.header() },
      );
    }

    const rows = await sql`
      SELECT * FROM invoices
      ORDER BY created_at DESC
      LIMIT 50
    `;
    return Response.json(
      { ok: true, invoices: rows || [] },
      { headers: reqMeta.header() },
    );
  } catch (e) {
    return Response.json(
      { ok: false, error: e?.message || "unknown_error" },
      { status: 500 },
    );
  }
}
