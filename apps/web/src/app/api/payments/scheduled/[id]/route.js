import { auth } from "@/auth";
import sql from "@/app/api/utils/sql";
import { writeAudit } from "@/app/api/utils/audit";

function addInterval(from, cadence) {
  const d = new Date(from);
  if (cadence === "daily") d.setDate(d.getDate() + 1);
  else if (cadence === "weekly") d.setDate(d.getDate() + 7);
  else if (cadence === "monthly") d.setMonth(d.getMonth() + 1);
  return d.toISOString();
}

export async function PATCH(request, { params }) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  const id = params?.id;
  if (!id)
    return Response.json({ ok: false, error: "missing_id" }, { status: 400 });

  let body = {};
  try {
    body = await request.json();
  } catch {}

  // Load schedule to verify ownership
  const found =
    await sql`SELECT * FROM scheduled_payments WHERE id = ${id} LIMIT 1`;
  const sched = found?.[0];
  if (!sched) {
    return Response.json({ ok: false, error: "not_found" }, { status: 404 });
  }
  if (sched.user_id !== session.user.id) {
    return Response.json({ ok: false, error: "forbidden" }, { status: 403 });
  }

  const allowedStatus = ["active", "paused", "cancelled", "failed"];
  const updates = [];
  const values = [];

  if (body.cadence && ["daily", "weekly", "monthly"].includes(body.cadence)) {
    updates.push(`cadence = $${updates.length + 1}`);
    values.push(body.cadence);
  }
  if (body.amount !== undefined) {
    const amt = Number(body.amount);
    if (!amt || amt <= 0) {
      return Response.json(
        {
          ok: false,
          error: "validation_error",
          details: ["amount must be > 0"],
        },
        { status: 400 },
      );
    }
    updates.push(`amount = $${updates.length + 1}`);
    values.push(amt);
  }
  if (body.status && allowedStatus.includes(body.status)) {
    updates.push(`status = $${updates.length + 1}`);
    values.push(body.status);
  }

  // recompute next_run_at safely if cadence changed or status moved to active
  let recomputeNext = false;
  if (body.cadence && body.cadence !== sched.cadence) recomputeNext = true;
  if (body.status && body.status === "active" && sched.status !== "active")
    recomputeNext = true;

  if (recomputeNext) {
    const base =
      new Date() > new Date(sched.start_date || 0)
        ? new Date()
        : new Date(sched.start_date || new Date());
    const next = addInterval(base.toISOString(), body.cadence || sched.cadence);
    updates.push(`next_run_at = $${updates.length + 1}`);
    values.push(next);
  }

  if (!updates.length) {
    return Response.json(
      { ok: false, error: "nothing_to_update" },
      { status: 400 },
    );
  }

  updates.push(`updated_at = NOW()`);
  const sqlText = `UPDATE scheduled_payments SET ${updates.join(", ")} WHERE id = $${updates.length + 1}`;
  values.push(id);
  await sql(sqlText, values);

  await writeAudit({
    userId: session.user.id,
    action: "scheduled.update",
    metadata: { id },
  });

  return Response.json({ ok: true });
}
