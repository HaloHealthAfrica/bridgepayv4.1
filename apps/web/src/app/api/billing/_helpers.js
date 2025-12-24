import sql from "@/app/api/utils/sql";
import { postLedgerAndUpdateBalance } from "@/app/api/wallet/_helpers";

// Ensure there is a dedicated Platform user + wallet to collect fees
export async function getOrCreatePlatformWallet(currency = "KES") {
  // We identify the platform user by a fixed email
  const platformEmail = "platform@bridge.internal";
  // 1) Ensure user exists
  const users = await sql(
    "SELECT id FROM auth_users WHERE email = $1 LIMIT 1",
    [platformEmail],
  );
  let userId = users?.[0]?.id || null;
  if (!userId) {
    const ins = await sql(
      "INSERT INTO auth_users (name, email, role) VALUES ($1,$2,$3) RETURNING id",
      ["Bridge Platform", platformEmail, "admin"],
    );
    userId = ins?.[0]?.id;
  }
  // 2) Ensure wallet exists
  const wal = await sql(
    "SELECT id FROM wallets WHERE user_id = $1 AND currency = $2 LIMIT 1",
    [userId, currency],
  );
  if (wal && wal[0]) return { id: wal[0].id, userId };
  const insw = await sql(
    "INSERT INTO wallets (user_id, currency, balance, available_balance, reserved_balance, status) VALUES ($1, $2, 0, 0, 0, 'active') RETURNING id",
    [userId, currency],
  );
  return { id: insw?.[0]?.id, userId };
}

// Basic fee calculator: flat and percentage; tiered placeholder
export async function calculateFees({
  appliesTo,
  amount,
  currency = "KES",
  merchantId = null,
  fundingPlan = null,
}) {
  const now = new Date();
  // Load active catalog items for appliesTo
  const rows = await sql(
    `SELECT * FROM billing_fee_catalog
     WHERE status = 'active' AND applies_to = $1
       AND (effective_start IS NULL OR effective_start <= NOW())
       AND (effective_end   IS NULL OR effective_end   >= NOW())`,
    [appliesTo],
  );

  // Load merchant overrides (by fee_code)
  const profiles = merchantId
    ? await sql(
        "SELECT fee_code, overrides, status FROM merchant_fee_profiles WHERE merchant_id = $1 AND status = 'active'",
        [merchantId],
      )
    : [];
  const overrideByCode = Object.create(null);
  for (const p of profiles || [])
    overrideByCode[p.fee_code] = p.overrides || {};

  const items = [];
  for (const fee of rows || []) {
    const ov = overrideByCode[fee.code] || {};
    const ft = ov.fee_type || fee.fee_type;
    const rate =
      ov.rate != null
        ? Number(ov.rate)
        : fee.rate != null
          ? Number(fee.rate)
          : null;
    const flat =
      ov.amount != null
        ? Number(ov.amount)
        : fee.amount != null
          ? Number(fee.amount)
          : null;

    let feeAmt = 0;
    if (ft === "flat" && flat != null) {
      feeAmt = flat;
    } else if (ft === "percentage" && rate != null) {
      feeAmt = Math.round(Number(amount) * Number(rate) * 100) / 100; // 2dp
    } else if (ft === "tiered") {
      try {
        const tiers = Array.isArray(ov.tiers) ? ov.tiers : fee.tiers || [];
        // simple: pick first tier whose upto >= amount; else last
        const sorted = [...tiers].sort(
          (a, b) => Number(a.upto || 0) - Number(b.upto || 0),
        );
        let r = rate || 0;
        for (const t of sorted) {
          if (Number(amount) <= Number(t.upto)) {
            r = Number(t.rate || r);
            break;
          }
          r = Number(t.rate || r);
        }
        feeAmt = Math.round(Number(amount) * Number(r) * 100) / 100;
      } catch {
        feeAmt = 0;
      }
    }

    if (feeAmt > 0) {
      items.push({
        fee_code: fee.code,
        name: fee.name,
        payer: fee.payer,
        amount: feeAmt,
        currency,
      });
    }
  }

  const total = items.reduce((s, x) => s + Number(x.amount || 0), 0);
  return { items, total, currency };
}

// Apply billing entries and optionally move funds between wallets when possible
export async function applyFees({
  transactionType,
  transactionId,
  baseAmount,
  currency = "KES",
  merchantId = null,
  fundingPlan = null,
  idempotencyKey = null,
  customerWalletId = null, // when payer = customer and charging from wallet
  merchantWalletId = null, // when payer = merchant and you have a merchant wallet enabled
}) {
  const calc = await calculateFees({
    appliesTo: transactionType,
    amount: baseAmount,
    currency,
    merchantId,
    fundingPlan,
  });
  if (!calc.items.length) return { applied: [], total: 0 };

  const platformWallet = await getOrCreatePlatformWallet(currency);
  const applied = [];

  for (const item of calc.items) {
    const ref =
      `fee-${transactionType.toLowerCase()}-${transactionId}-${item.fee_code}`.slice(
        0,
        120,
      );
    // insert billing_ledger (idempotent)
    await sql(
      `INSERT INTO billing_ledger (transaction_type, transaction_id, fee_code, amount, currency, payer_account, platform_account, direction, status, ref, metadata)
       VALUES ($1,$2,$3,$4,$5,$6,'platform_revenue','CREDIT','posted',$7,$8::jsonb)
       ON CONFLICT (ref) DO UPDATE SET
         status = 'posted',
         metadata = billing_ledger.metadata || EXCLUDED.metadata`,
      [
        transactionType,
        String(transactionId),
        item.fee_code,
        Number(item.amount),
        currency,
        item.payer === "merchant"
          ? "merchant"
          : item.payer === "platform"
            ? "platform"
            : "customer",
        ref,
        JSON.stringify({ baseAmount, merchantId, fundingPlan }),
      ],
    );

    // Move funds from payer wallet to platform wallet when available
    // 1) Customer-paid fees
    if (item.payer === "customer" && customerWalletId) {
      try {
        await sql.transaction((txn) => [
          // debit customer wallet via ledger
          txn(
            `WITH ins AS (
               INSERT INTO wallet_ledger (wallet_id, entry_type, amount, currency, status, ref, narration, metadata, created_at)
               VALUES ($1,'debit',$2,$3,'posted',$4,$5,$6::jsonb, now())
               ON CONFLICT (ref) DO NOTHING
               RETURNING id
             ), upd AS (
               UPDATE wallets SET balance = balance - $2, updated_at = now() WHERE id = $1
               RETURNING balance
             )
             SELECT (SELECT id FROM ins) AS ledger_id, (SELECT balance FROM upd) AS balance_after`,
            [
              customerWalletId,
              Number(item.amount),
              currency,
              `${ref}-cust`,
              `Fee ${item.fee_code}`,
              JSON.stringify({ billing_ref: ref }),
            ],
          ),
          // credit platform wallet
          txn(
            `WITH ins AS (
               INSERT INTO wallet_ledger (wallet_id, entry_type, amount, currency, status, ref, narration, metadata, created_at)
               VALUES ($1,'credit',$2,$3,'posted',$4,$5,$6::jsonb, now())
               ON CONFLICT (ref) DO NOTHING
               RETURNING id
             ), upd AS (
               UPDATE wallets SET balance = balance + $2, updated_at = now() WHERE id = $1
               RETURNING balance
             )
             SELECT (SELECT id FROM ins) AS ledger_id, (SELECT balance FROM upd) AS balance_after`,
            [
              platformWallet.id,
              Number(item.amount),
              currency,
              `${ref}-plat`,
              `Fee ${item.fee_code}`,
              JSON.stringify({ billing_ref: ref }),
            ],
          ),
        ]);
      } catch (e) {
        // do not break main flow
        console.error("applyFees move funds (customer) error", e);
      }
    }

    // 2) Merchant-paid fees (optional; only if merchantWalletId provided)
    if (item.payer === "merchant" && merchantWalletId) {
      try {
        await sql.transaction((txn) => [
          // debit merchant wallet
          txn(
            `WITH ins AS (
               INSERT INTO wallet_ledger (wallet_id, entry_type, amount, currency, status, ref, narration, metadata, created_at)
               VALUES ($1,'debit',$2,$3,'posted',$4,$5,$6::jsonb, now())
               ON CONFLICT (ref) DO NOTHING
               RETURNING id
             ), upd AS (
               UPDATE wallets SET balance = balance - $2, updated_at = now() WHERE id = $1
               RETURNING balance
             )
             SELECT (SELECT id FROM ins) AS ledger_id, (SELECT balance FROM upd) AS balance_after`,
            [
              merchantWalletId,
              Number(item.amount),
              currency,
              `${ref}-mrc`,
              `Fee ${item.fee_code}`,
              JSON.stringify({ billing_ref: ref }),
            ],
          ),
          // credit platform wallet
          txn(
            `WITH ins AS (
               INSERT INTO wallet_ledger (wallet_id, entry_type, amount, currency, status, ref, narration, metadata, created_at)
               VALUES ($1,'credit',$2,$3,'posted',$4,$5,$6::jsonb, now())
               ON CONFLICT (ref) DO NOTHING
               RETURNING id
             ), upd AS (
               UPDATE wallets SET balance = balance + $2, updated_at = now() WHERE id = $1
               RETURNING balance
             )
             SELECT (SELECT id FROM ins) AS ledger_id, (SELECT balance FROM upd) AS balance_after`,
            [
              platformWallet.id,
              Number(item.amount),
              currency,
              `${ref}-plat`,
              `Fee ${item.fee_code}`,
              JSON.stringify({ billing_ref: ref }),
            ],
          ),
        ]);
      } catch (e) {
        console.error("applyFees move funds (merchant) error", e);
      }
    }

    applied.push({ ...item, ref });
  }

  return { applied, total: calc.total };
}
