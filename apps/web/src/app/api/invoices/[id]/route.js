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
  const tax = 0;
  const total = subtotal + tax;
  return { subtotal, tax, total };
}

export async function GET(request, { params: { id } }) {
  const reqMeta = startRequest({ request, route: "/api/invoices/[id][GET]" });
  try {
    const rows =
      await sql`SELECT * FROM invoices WHERE id = ${Number(id)} LIMIT 1`;
    const invoice = rows?.[0];
    if (!invoice) {
      return Response.json(
        { ok: false, error: "not_found" },
        { status: 404, headers: reqMeta.header() },
      );
    }
    const items =
      await sql`SELECT id, name, qty, price, description, line_total FROM invoice_items WHERE invoice_id = ${invoice.id} ORDER BY id ASC`;
    return Response.json(
      { ok: true, invoice, items },
      { headers: reqMeta.header() },
    );
  } catch (e) {
    return Response.json(
      { ok: false, error: e?.message || "unknown_error" },
      { status: 500 },
    );
  }
}

export async function PATCH(request, { params: { id } }) {
  const reqMeta = startRequest({ request, route: "/api/invoices/[id][PATCH]" });
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

    // Only allow edits while draft
    const rows =
      await sql`SELECT * FROM invoices WHERE id = ${Number(id)} LIMIT 1`;
    const invoice = rows?.[0];
    if (!invoice) {
      return Response.json(
        { ok: false, error: "not_found" },
        { status: 404, headers: reqMeta.header() },
      );
    }
    if (invoice.status !== "draft") {
      return Response.json(
        { ok: false, error: "not_editable" },
        { status: 400, headers: reqMeta.header() },
      );
    }

    let body = null;
    try {
      body = await request.json();
    } catch {}

    const currency = body?.currency || invoice.currency || "KES";
    const items = Array.isArray(body?.items) ? body.items : [];
    const { subtotal, tax, total } = computeTotals(items);
    if (!(total > 0)) {
      return Response.json(
        { ok: false, error: "invalid_total" },
        { status: 400, headers: reqMeta.header() },
      );
    }

    await sql(
      "UPDATE invoices SET customer_email=$1, customer_phone=$2, customer_name=$3, due_date=$4, currency=$5, subtotal=$6, tax=$7, total=$8, updated_at=NOW() WHERE id=$9",
      [
        body?.customer_email || null,
        body?.customer_phone || null,
        body?.customer_name || null,
        body?.due_date ? new Date(body.due_date) : null,
        currency,
        subtotal,
        tax,
        total,
        Number(id),
      ],
    );

    // Replace items
    await sql`DELETE FROM invoice_items WHERE invoice_id = ${Number(id)}`;
    for (const it of items) {
      const qty = Number(it?.qty || 0);
      const price = Number(it?.price || 0);
      const line_total = qty * price;
      await sql(
        "INSERT INTO invoice_items (invoice_id, name, qty, price, description, line_total) VALUES ($1,$2,$3,$4,$5,$6)",
        [
          Number(id),
          String(it?.name || "Item"),
          qty,
          price,
          it?.description || null,
          line_total,
        ],
      );
    }

    return Response.json(
      { ok: true, id: Number(id), total },
      { headers: reqMeta.header() },
    );
  } catch (e) {
    return Response.json(
      { ok: false, error: e?.message || "unknown_error" },
      { status: 500 },
    );
  }
}
