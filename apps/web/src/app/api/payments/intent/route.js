import { auth } from "@/auth";
import sql from "@/app/api/utils/sql";
import { getOrCreateWallet } from "@/app/api/wallet/_helpers";

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

export async function POST(request) {
  try {
    const session = await auth();
    if (!session?.user?.id) return bad(401, "unauthorized");

    let body = {};
    try {
      body = await request.json();
    } catch {}

    const amountDue = toNumber(body?.amountDue || body?.amount || 0);
    const currency = String(body?.currency || "KES");
    const merchantId = body?.merchantId ? String(body.merchantId) : null;
    const providedPlan = Array.isArray(body?.fundingPlan)
      ? body.fundingPlan
      : null;

    if (!(amountDue > 0)) return bad(400, "invalid_amount");

    // Build funding plan
    let fundingPlan = [];
    if (providedPlan && providedPlan.length) {
      // Validate provided plan shape
      let sum = 0;
      for (const fs of providedPlan) {
        if (!fs || typeof fs !== "object")
          return bad(400, "invalid_funding_source");
        const type = String(fs.type || "");
        const amount = toNumber(fs.amount);
        const priority = Number(fs.priority ?? 0);
        if (!amount || amount < 0) return bad(400, "invalid_funding_amount");
        if (
          !type ||
          ![
            "BRIDGE_WALLET",
            "LEMONADE_MPESA",
            "LEMONADE_BANK",
            "LEMONADE_CARD",
          ].includes(type)
        ) {
          return bad(400, "invalid_funding_type");
        }
        sum += amount;
        fundingPlan.push({
          id: fs.id ? String(fs.id) : null,
          type,
          amount,
          priority: Number.isFinite(priority) ? priority : 0,
        });
      }
      if (Math.round(sum * 100) !== Math.round(amountDue * 100)) {
        return bad(400, "funding_plan_sum_mismatch", { amountDue, sum });
      }
      // Normalize priorities
      fundingPlan.sort((a, b) => (a.priority || 0) - (b.priority || 0));
    } else {
      // Autopilot plan: wallet first, then mpesa; for banks, fall back using virtual sources if available
      const wallet = await getOrCreateWallet(session.user.id, currency);
      const bridgeAvailable = Math.max(0, toNumber(wallet.balance));

      // Load virtual sources
      const sources = await sql(
        "SELECT source, balance, hold FROM wallet_sources WHERE user_id = $1 AND currency = $2 AND status = 'active'",
        [session.user.id, currency],
      );
      const avail = { kcb: 0, dtb: 0, mpesa: 0 };
      for (const r of sources || []) {
        const a = Math.max(0, toNumber(r.balance) - toNumber(r.hold));
        const key = String(r.source);
        if (key === "kcb") avail.kcb = a;
        else if (key === "dtb") avail.dtb = a;
        else if (key === "mpesa") avail.mpesa = a;
      }

      let rem = amountDue;
      const plan = [];
      const take = (type, id, a) => {
        if (rem <= 0) return;
        const t = Math.min(rem, Math.max(0, a));
        if (t > 0) {
          plan.push({ type, id, amount: t });
          rem -= t;
        }
      };

      take("BRIDGE_WALLET", wallet.id, bridgeAvailable);
      if (rem > 0) take("LEMONADE_MPESA", "mpesa", avail.mpesa);
      if (rem > 0) take("LEMONADE_BANK", "kcb", avail.kcb);
      if (rem > 0) take("LEMONADE_BANK", "dtb", avail.dtb);
      if (rem > 0) {
        // still remainder — assign the rest to mpesa as default external source
        plan.push({ type: "LEMONADE_MPESA", id: "mpesa", amount: rem });
        rem = 0;
      }
      // Add priorities in order
      fundingPlan = plan.map((p, i) => ({ ...p, priority: i + 1 }));
    }

    // Persist intent
    const rows = await sql(
      "INSERT INTO payment_intents (user_id, merchant_id, amount_due, currency, status, funding_plan) VALUES ($1,$2,$3,$4,'PENDING',$5::jsonb) RETURNING id, user_id, merchant_id, amount_due, currency, status, funding_plan, created_at",
      [
        session.user.id,
        merchantId,
        amountDue,
        currency,
        JSON.stringify(fundingPlan),
      ],
    );
    const intent = rows[0];

    return ok({
      intentId: intent.id,
      fundingPlan: intent.funding_plan,
      currency: intent.currency,
      amountDue: intent.amount_due,
    });
  } catch (e) {
    console.error("/api/payments/intent POST error", e);
    return bad(500, "server_error");
  }
}
