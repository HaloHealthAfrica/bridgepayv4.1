import sql from "@/app/api/utils/sql";

export async function writeAudit({
  userId = null,
  action = "",
  metadata = {},
}) {
  try {
    await sql(
      "INSERT INTO audit_logs (user_id, action, metadata) VALUES ($1, $2, $3::jsonb)",
      [userId, action, JSON.stringify(metadata || {})],
    );
  } catch (e) {
    // never throw from audit
    console.error("audit.write failed", e?.message);
  }
}

export default { writeAudit };
