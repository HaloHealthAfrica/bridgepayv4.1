import { auth } from "@/auth";
import sql from "@/app/api/utils/sql";
import lemonade from "@/app/api/utils/lemonadeClient";
import {
  getOrCreateWallet,
  postLedgerAndUpdateBalance,
  nowRef,
} from "@/app/api/wallet/_helpers";
import { applyFees, calculateFees } from "@/app/api/billing/_helpers"; // billing

function bad(status, error, extra = {}) {
  return Response.json({ ok: false, error, ...extra }, { status });
}

function ok(json) {
  return Response.json({ ok: true, ...json }, { status: 200 });
}

function toNumber(n) {
  const v = Number(n);
  return Number.isFinite(v) ? v : 0;
}

function sumPlan(plan) {
  return (plan || []).reduce((s, x) => s + toNumber(x.amount), 0);
}

function mapExtType(idOrType) {
  // We only support MPESA explicitly for now; banks are grouped
  if (idOrType === "mpesa" || idOrType === "LEMONADE_MPESA")
    return "LEMONADE_MPESA";
  return "LEMONADE_BANK";
}

export async function POST(request, { params }) {
  const { id } = params || {};
  try {
    const session = await auth();
    if (!session?.user?.id) return bad(401, "unauthorized");

    let body = {};
    try {
      body = await request.json();
    } catch {}

    const idempo = request.headers.get("Idempotency-Key") || null;

    // Load intent
    const rows = await sql(
      "SELECT * FROM payment_intents WHERE id = $1 LIMIT 1",
      [id],
    );
    const intent = rows?.[0];
    if (!intent) return bad(404, "not_found");
    if (intent.user_id !== session.user.id) return bad(403, "forbidden");
    if (intent.status !== "PENDING")
      return bad(400, "invalid_status", { status: intent.status });

    // Allow client to override fundingPlan on confirm if provided (must match amount)
    const plan =
      Array.isArray(body?.fundingPlan) && body.fundingPlan.length
        ? body.fundingPlan
        : intent.funding_plan || [];
    const totalPlanned = Math.round(sumPlan(plan) * 100);
    const due = Math.round(Number(intent.amount_due) * 100);
    if (totalPlanned !== due)
      return bad(400, "funding_plan_sum_mismatch", {
        amountDue: intent.amount_due,
        totalPlanned: totalPlanned / 100,
      });

    // Collect external source metadata (e.g., msisdn for mpesa)
    const sourcesMeta = body?.sourcesMeta || {};

    const walletDebits = [];
    const externalStarts = [];

    // 1) Process Bridge wallet debits
    for (let i = 0; i < plan.length; i++) {
      const fs = plan[i];
      if (fs.type !== "BRIDGE_WALLET") continue;
      const amount = toNumber(fs.amount);
      if (!(amount > 0)) continue;

      // Use provided wallet id or create default
      const walletId =
        fs.id || (await getOrCreateWallet(session.user.id, intent.currency)).id;
      const ref = `pi-${id}-wallet-${i}`;
      const res = await postLedgerAndUpdateBalance({
        walletId,
        entryType: "debit",
        amount,
        currency: intent.currency,
        ref,
        externalRef: null,
        narration: "Checkout debit",
        metadata: { payment_intent_id: id, source_index: i },
      });
      // Record UX transaction row (non-blocking if fails)
      try {
        await sql(
          "INSERT INTO wallet_transactions (wallet_id, type, direction, amount, currency, external_ref, status, metadata) VALUES ($1,'DEBIT','OUT',$2,$3,$4,'SUCCESS',$5::jsonb)",
          [
            walletId,
            amount,
            intent.currency,
            ref,
            JSON.stringify({ payment_intent_id: id, source_index: i }),
          ],
        );
      } catch {}
      walletDebits.push({ walletId, amount, ref });
    }

    // 2) Initiate external payments via Lemonade
    for (let i = 0; i < plan.length; i++) {
      const fs = plan[i];
      if (fs.type === "BRIDGE_WALLET") continue;
      const amount = toNumber(fs.amount);
      if (!(amount > 0)) continue;
      const sourceType = mapExtType(fs.id || fs.type);
      const orderRef = `pi${String(id).replace(/-/g, "").slice(0, 18)}${i}`; // short and relay-safe

      if (sourceType === "LEMONADE_MPESA") {
        const details =
          sourcesMeta.mpesa || sourcesMeta["LEMONADE_MPESA"] || {};
        const phone = String(
          details.phone_number || details.msisdn || "",
        ).trim();
        if (!phone) {
          return bad(400, "mpesa_phone_required", { sourceIndex: i });
        }
        const payload = {
          phone_number: phone,
          amount: amount,
          currency: intent.currency,
          reference: orderRef,
          description: "Bridge Checkout",
        };
        const resp = await lemonade.call({
          action: "stk_push",
          payload,
          idempotencyKey: idempo || orderRef,
        });
        const txId =
          resp?.data?.transaction_id ||
          resp?.data?.data?.transaction_id ||
          null;
        await sql(
          "INSERT INTO external_payments (payment_intent_id, type, amount, currency, lemon_tx_id, status, metadata) VALUES ($1,'LEMONADE_MPESA',$2,$3,$4,$5,$6::jsonb)",
          [
            id,
            amount,
            intent.currency,
            txId,
            resp && resp.ok ? "PENDING" : "PENDING",
            JSON.stringify({
              order_reference: orderRef,
              provider_response: resp?.data || null,
            }),
          ],
        );
        externalStarts.push({
          index: i,
          type: sourceType,
          order_reference: orderRef,
          lemon_tx_id: txId,
        });
      } else {
        // Bank/Card placeholder: record and wait for out-of-band initiation (or add later)
        await sql(
          "INSERT INTO external_payments (payment_intent_id, type, amount, currency, status, metadata) VALUES ($1,$2,$3,$4,'PENDING',$5::jsonb)",
          [
            id,
            sourceType,
            amount,
            intent.currency,
            JSON.stringify({
              order_reference: orderRef,
              note: "bank_pending_stub",
            }),
          ],
        );
        externalStarts.push({
          index: i,
          type: sourceType,
          order_reference: orderRef,
        });
      }
    }

    // 3) Mark as funded pending settlement
    const hasExternal = externalStarts.length > 0;
    await sql(
      "UPDATE payment_intents SET status = $1, updated_at = NOW() WHERE id = $2",
      [hasExternal ? "FUNDED_PENDING_SETTLEMENT" : "SETTLED", id],
    );

    // NEW: Pre-calc and freeze fees at confirm time (record as pending)
    try {
      const planJson = JSON.stringify(plan || []);
      const fees = await calculateFees({
        appliesTo:
          Array.isArray(plan) && plan.length > 1 ? "SPLIT" : "MERCHANT_PAYMENT",
        amount: Number(intent.amount_due || 0),
        currency: intent.currency || "KES",
        merchantId: intent.merchant_id || null,
        fundingPlan: plan || null,
      });
      const txType =
        Array.isArray(plan) && plan.length > 1 ? "SPLIT" : "MERCHANT_PAYMENT";
      for (const item of fees.items || []) {
        // IMPORTANT: Use the same ref format as applyFees() so settlement can
        // upsert pending -> posted without double-counting.
        const ref = `fee-${txType.toLowerCase()}-${id}-${item.fee_code}`.slice(
          0,
          120,
        );
        await sql(
          `INSERT INTO billing_ledger (transaction_type, transaction_id, fee_code, amount, currency, payer_account, platform_account, direction, status, ref, metadata)
           VALUES ($1,$2,$3,$4,$5,$6,'platform_revenue','CREDIT','pending',$7,$8::jsonb)
           ON CONFLICT (ref) DO NOTHING`,
          [
            txType,
            String(id),
            item.fee_code,
            Number(item.amount),
            intent.currency || "KES",
            item.payer === "merchant"
              ? "merchant"
              : item.payer === "platform"
                ? "platform"
                : "customer",
            ref,
            JSON.stringify({
              frozen_at: new Date().toISOString(),
              fundingPlan: plan,
            }),
          ],
        );
      }

      // If this is a wallet-only payment (no external legs), apply fees now so
      // the platform actually collects revenue immediately.
      if (!hasExternal) {
        const customerWalletId = walletDebits?.[0]?.walletId || null;
        // Promote frozen rows to posted + upsert via applyFees (idempotent)
        await sql(
          "UPDATE billing_ledger SET status = 'posted' WHERE transaction_type = $1 AND transaction_id = $2 AND status = 'pending'",
          [txType, String(id)],
        );
        await applyFees({
          transactionType: txType,
          transactionId: String(id),
          baseAmount: Number(intent.amount_due || 0),
          currency: intent.currency || "KES",
          merchantId: intent.merchant_id || null,
          fundingPlan: plan || null,
          customerWalletId,
          merchantWalletId: null,
        });
      }
    } catch (e) {
      console.error("pre-calc fees failed", e);
    }

    return ok({
      intentId: id,
      status: hasExternal ? "FUNDED_PENDING_SETTLEMENT" : "SETTLED",
      walletDebits,
      external: externalStarts,
    });
  } catch (e) {
    console.error(`/api/payments/${id}/confirm POST error`, e);
    return bad(500, "server_error");
  }
}
