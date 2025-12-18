import sql from "@/app/api/utils/sql";

// Table: idempotency_keys (idempotency_key text primary key, payment_id int, response jsonb, created_at timestamptz default now())
// We will name it payment_idempotency in DB migration.

export async function findIdempotent(key) {
  if (!key) return null;
  const rows =
    await sql`SELECT payment_id, response FROM payment_idempotency WHERE idempotency_key = ${key} LIMIT 1`;
  return rows?.[0] || null;
}

export async function saveIdempotent(key, paymentId, response) {
  try {
    await sql(
      "INSERT INTO payment_idempotency (idempotency_key, payment_id, response) VALUES ($1, $2, $3::jsonb) ON CONFLICT (idempotency_key) DO NOTHING",
      [key, paymentId, JSON.stringify(response || null)],
    );
  } catch (e) {
    // ignore
  }
}

export default { findIdempotent, saveIdempotent };
