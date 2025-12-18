import { auth } from "@/auth";
import sql from "@/app/api/utils/sql";
import { checkRateLimits } from "@/app/api/utils/ratelimit";
import { writeAudit } from "@/app/api/utils/audit";
import {
  getOrCreateWallet,
  postLedgerAndUpdateBalance,
} from "@/app/api/wallet/_helpers";
import { applyFees } from "@/app/api/billing/_helpers";
// ADD: idempotency helpers for orchestrator-style execution
import { findIdempotent, saveIdempotent } from "@/app/api/utils/idempotency";

function shortId(id) {
  return String(id || "").slice(0, 8);
}

export async function GET(request, { params }) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  const id = params?.id;
  const grp = await sql`SELECT * FROM split_groups WHERE id = ${id} LIMIT 1`;
  if (!grp?.[0])
    return Response.json({ ok: false, error: "not_found" }, { status: 404 });
  if (
    grp[0].user_id !== session.user.id &&
    session.user.role !== "admin" &&
    session.user.role !== "merchant"
  ) {
    return Response.json({ ok: false, error: "forbidden" }, { status: 403 });
  }
  const members =
    await sql`SELECT * FROM split_group_members WHERE group_id = ${id} ORDER BY created_at ASC`;
  return Response.json({ ok: true, group: grp[0], members });
}

export async function POST(request, { params }) {
  // Execute a split group
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  const id = params?.id;

  // ADD: Idempotency support — reuse orchestrator style keying
  const idemKey =
    request.headers.get("Idempotency-Key") || `payments-split-execute-${id}`;
  const found = await findIdempotent(idemKey);
  if (found?.response) {
    return Response.json({ ok: true, ...found.response });
  }

  const rl = checkRateLimits({
    request,
    route: "payments.split.execute",
    rules: [{ scope: "user", limit: 10, burst: 10, windowMs: 60_000 }],
  });
  if (!rl.allowed)
    return Response.json(
      { ok: false, error: "rate_limited", retryAfter: rl.retryAfter },
      { status: 429 },
    );

  const grpRows =
    await sql`SELECT * FROM split_groups WHERE id = ${id} LIMIT 1`;
  const grp = grpRows?.[0];
  if (!grp)
    return Response.json({ ok: false, error: "not_found" }, { status: 404 });
  if (
    grp.user_id !== session.user.id &&
    session.user.role !== "admin" &&
    session.user.role !== "merchant"
  ) {
    return Response.json({ ok: false, error: "forbidden" }, { status: 403 });
  }

  const members =
    await sql`SELECT * FROM split_group_members WHERE group_id = ${id}`;
  if (!members?.length)
    return Response.json({ ok: false, error: "no_members" }, { status: 400 });

  let completed = 0,
    pending = 0,
    failed = 0;

  // Resolve payer wallet for potential BRIDGE_WALLET legs
  let payerWallet = null;
  try {
    payerWallet = await getOrCreateWallet(grp.user_id, grp.currency || "KES");
  } catch {}

  for (const m of members) {
    // Skip already completed members (idempotent)
    if (m.status === "completed") {
      completed++;
      continue;
    }

    const order_reference = `${grp.id}-${m.id}`; // idempotent per member
    const method = m.metadata?.method || grp.metadata?.method || "wallet"; // existing default
    const phone = m.metadata?.phone_number || m.metadata?.msisdn || null;
    const wallet =
      m.metadata?.wallet_no ||
      m.metadata?.wallet_number ||
      m.metadata?.account ||
      null;

    try {
      if (method === "bridge_wallet") {
        // Internal leg: debit payer (group owner) and credit recipient wallet
        if (!m.recipient_user_id) {
          // cannot run internal transfer without a recipient user
          await sql`UPDATE split_group_members SET status = 'failed', updated_at = NOW() WHERE id = ${m.id}`;
          failed++;
          continue;
        }
        const recipientWallet = await getOrCreateWallet(
          m.recipient_user_id,
          grp.currency || "KES",
        );
        if (!payerWallet) {
          payerWallet = await getOrCreateWallet(
            grp.user_id,
            grp.currency || "KES",
          );
        }

        const amt = Number(m.amount);
        const debitRef = `split-${grp.id}-${m.id}-cust`;
        const creditRef = `split-${grp.id}-${m.id}-rcpt`;

        await postLedgerAndUpdateBalance({
          walletId: payerWallet.id,
          entryType: "debit",
          amount: amt,
          currency: grp.currency || "KES",
          ref: debitRef,
          narration: `Split ${shortId(grp.id)}`,
          metadata: { split_group_id: grp.id, member_id: m.id },
        });
        await postLedgerAndUpdateBalance({
          walletId: recipientWallet.id,
          entryType: "credit",
          amount: amt,
          currency: grp.currency || "KES",
          ref: creditRef,
          narration: `Split ${shortId(grp.id)}`,
          metadata: { split_group_id: grp.id, member_id: m.id },
        });

        await sql`UPDATE split_group_members SET status = 'completed', updated_at = NOW() WHERE id = ${m.id}`;
        completed++;

        // Apply per-leg fees using existing catalog applies_to = 'SPLIT'
        try {
          await applyFees({
            transactionType: "SPLIT",
            transactionId: String(m.id),
            baseAmount: amt,
            currency: grp.currency || "KES",
            merchantId: null,
            customerWalletId: payerWallet?.id || null,
          });
        } catch (e) {
          console.error("split.applyFees wallet leg", e);
        }
        continue; // next member
      }

      // Existing external legs: STK or external wallet via Lemonade
      const action = method === "stk" ? "stk_push" : "wallet_payment";
      const payload =
        method === "stk"
          ? {
              amount: Number(m.amount),
              phone_number: phone,
              order_reference,
              currency: grp.currency || "KES",
              description: `Split ${shortId(grp.id)}`,
              channel: "100001",
            }
          : {
              amount: Number(m.amount),
              wallet_no: wallet,
              order_reference,
              currency: grp.currency || "KES",
              description: `Split ${shortId(grp.id)}`,
              channel: "111111",
            };

      const res = await fetch(
        `${process.env.APP_URL || ""}/api/payments/lemonade/create`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action, payload }),
        },
      );
      const json = await res.json().catch(() => null);
      await sql`UPDATE split_group_members SET payment_id = ${json?.payment_id || null}, provider_ref = ${json?.provider_ref || null}, updated_at = NOW() WHERE id = ${m.id}`;
      if (res.ok && json?.status === "completed") {
        await sql`UPDATE split_group_members SET status = 'completed' WHERE id = ${m.id}`;
        completed++;
        // Apply per-leg fees even for external legs (ledger move may be skipped if no internal wallet)
        try {
          await applyFees({
            transactionType: "SPLIT",
            transactionId: String(m.id),
            baseAmount: Number(m.amount),
            currency: grp.currency || "KES",
            merchantId: null,
            customerWalletId: null, // unknown external payer wallet
          });
        } catch (e) {
          console.error("split.applyFees external leg", e);
        }
      } else if (res.ok) {
        await sql`UPDATE split_group_members SET status = 'pending' WHERE id = ${m.id}`;
        pending++;
      } else {
        await sql`UPDATE split_group_members SET status = 'failed' WHERE id = ${m.id}`;
        failed++;
      }
      await sql`INSERT INTO mpesa_transactions (payment_id, status, raw) VALUES (${json?.payment_id || null}, ${json?.status || (res.ok ? "pending" : "failed")}, ${JSON.stringify({ split_group_id: grp.id, member_id: m.id, response: json })}::jsonb)`;
    } catch (e) {
      failed++;
      await sql`UPDATE split_group_members SET status = 'failed', updated_at = NOW() WHERE id = ${m.id}`;
      await sql`INSERT INTO mpesa_transactions (payment_id, status, raw) VALUES (${null}, ${"failed"}, ${JSON.stringify({ split_group_id: grp.id, member_id: m.id, crashed: true })}::jsonb)`;
    }
  }

  // Update group status
  const latest =
    await sql`SELECT status FROM split_group_members WHERE group_id = ${id}`;
  const allCompleted = latest.every((r) => r.status === "completed");
  const anyPending = latest.some((r) => r.status === "pending");
  const groupStatus = allCompleted
    ? "completed"
    : anyPending
      ? "pending"
      : "failed";
  await sql`UPDATE split_groups SET status = ${groupStatus}, updated_at = NOW() WHERE id = ${id}`;

  await writeAudit({
    userId: session.user.id,
    action: "split.execute",
    metadata: { id, completed, pending, failed },
  });

  // ADD: Save idempotent response and return
  const resp = { completed, pending, failed };
  await saveIdempotent(idemKey, 0, resp);
  return Response.json({ ok: true, ...resp });
}
