import sql from "@/app/api/utils/sql";
import { auth } from "@/auth";
import {
  applyFees,
  getOrCreatePlatformWallet,
} from "@/app/api/billing/_helpers";
import { postLedgerAndUpdateBalance } from "@/app/api/wallet/_helpers";

async function ensureUserByEmail(email, name = "Demo Merchant") {
  const u = await sql("SELECT id FROM auth_users WHERE email = $1 LIMIT 1", [
    email,
  ]);
  if (u && u[0]) return u[0].id;
  const ins = await sql(
    "INSERT INTO auth_users (name, email, role) VALUES ($1,$2,$3) RETURNING id",
    [name, email, "merchant"],
  );
  return ins?.[0]?.id;
}

async function ensureWallet(userId, currency = "KES") {
  const w = await sql(
    "SELECT id FROM wallets WHERE user_id = $1 AND currency = $2 LIMIT 1",
    [userId, currency],
  );
  if (w && w[0]) return w[0].id;
  const ins = await sql(
    "INSERT INTO wallets (user_id, currency, balance, available_balance, reserved_balance, status) VALUES ($1,$2,0,0,0,'active') RETURNING id",
    [userId, currency],
  );
  return ins?.[0]?.id;
}

async function ensureDefaultFees() {
  // Ensure a minimal set of active fees exist so demo is meaningful
  const activeTopup = await sql(
    "SELECT 1 FROM billing_fee_catalog WHERE status='active' AND applies_to='TOPUP' LIMIT 1",
  );
  if (!activeTopup?.length) {
    await sql(
      `INSERT INTO billing_fee_catalog (code, name, fee_type, applies_to, payer, rate, amount, status)
       VALUES ('TOPUP_FEE_MPESA','Top-up Convenience (M-Pesa)','percentage','TOPUP','customer',0.01,NULL,'active')
       ON CONFLICT (code) DO UPDATE SET status='active', fee_type='percentage', applies_to='TOPUP', payer='customer', rate=0.01, amount=NULL`,
    );
  }

  const activeWd = await sql(
    "SELECT 1 FROM billing_fee_catalog WHERE status='active' AND applies_to='WITHDRAWAL' LIMIT 1",
  );
  if (!activeWd?.length) {
    await sql(
      `INSERT INTO billing_fee_catalog (code, name, fee_type, applies_to, payer, rate, amount, status)
       VALUES ('WITHDRAW_FEE','Withdrawal Fee','flat','WITHDRAWAL','customer',NULL,30,'active')
       ON CONFLICT (code) DO UPDATE SET status='active', fee_type='flat', applies_to='WITHDRAWAL', payer='customer', amount=30, rate=NULL`,
    );
  }

  const activeMdr = await sql(
    "SELECT 1 FROM billing_fee_catalog WHERE status='active' AND applies_to='MERCHANT_PAYMENT' LIMIT 1",
  );
  if (!activeMdr?.length) {
    await sql(
      `INSERT INTO billing_fee_catalog (code, name, fee_type, applies_to, payer, rate, amount, status)
       VALUES ('MDR_DEFAULT','Merchant Discount Rate','percentage','MERCHANT_PAYMENT','merchant',0.015,NULL,'active')
       ON CONFLICT (code) DO UPDATE SET status='active', fee_type='percentage', applies_to='MERCHANT_PAYMENT', payer='merchant', rate=0.015, amount=NULL`,
    );
  }

  // Optional: split orchestration fee for visibility in ledger
  const activeSplit = await sql(
    "SELECT 1 FROM billing_fee_catalog WHERE status='active' AND applies_to='SPLIT' LIMIT 1",
  );
  if (!activeSplit?.length) {
    await sql(
      `INSERT INTO billing_fee_catalog (code, name, fee_type, applies_to, payer, rate, amount, status)
       VALUES ('SPLIT_ORCHESTRATION','Split Orchestration','flat','SPLIT','merchant',NULL,50,'active')
       ON CONFLICT (code) DO UPDATE SET status='active', fee_type='flat', applies_to='SPLIT', payer='merchant', amount=50, rate=NULL`,
    );
  }
}

function ref(suffix) {
  return `demo-${suffix}-${Date.now()}`.slice(0, 120);
}

export async function POST() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json({ error: "Not authenticated" }, { status: 401 });
    }

    const userId = Number(session.user.id);
    const currency = "KES";

    // Make sure we have active fees to bill
    await ensureDefaultFees();

    // Ensure wallets: customer (current user), merchant, platform
    const merchantEmail = "merchant.demo@bridge.internal";
    const merchantUserId = await ensureUserByEmail(
      merchantEmail,
      "Demo Merchant",
    );

    const customerWalletId = await ensureWallet(userId, currency);
    const merchantWalletId = await ensureWallet(merchantUserId, currency);
    const platformWallet = await getOrCreatePlatformWallet(currency);

    const results = { steps: [] };

    // 1) Seed a TOP-UP credit into customer wallet (simulate Lemonade success)
    const topupAmount = 10000; // KES
    const topupRef = ref("topup");
    await postLedgerAndUpdateBalance({
      walletId: customerWalletId,
      entryType: "credit",
      amount: topupAmount,
      currency,
      ref: topupRef,
      narration: "Wallet top-up (demo)",
      metadata: { source: "demo", kind: "TOPUP" },
    });
    results.steps.push({
      type: "TOPUP_CREDIT",
      ref: topupRef,
      amount: topupAmount,
    });

    // Record a funding session row to make this visible in sessions views
    await sql(
      `INSERT INTO wallet_funding_sessions (wallet_id, user_id, method, amount, currency, status, provider, order_reference, metadata, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,'succeeded','lemonade',$6,$7::jsonb, now(), now())
       ON CONFLICT (order_reference) DO NOTHING`,
      [
        customerWalletId,
        userId,
        "mpesa",
        topupAmount,
        currency,
        topupRef,
        JSON.stringify({ kind: "TOPUP", demo: true }),
      ],
    );

    // Apply top-up fees (customer pays) → debit customer, credit platform
    const topupFees = await applyFees({
      transactionType: "TOPUP",
      transactionId: topupRef,
      baseAmount: topupAmount,
      currency,
      customerWalletId,
    });
    results.steps.push({ type: "TOPUP_FEES", ...topupFees });

    // 2) Simulate a MERCHANT PAYMENT of 5,000 KES
    const saleAmount = 5000;
    const saleRef = ref("merchant-sale");
    // Debit customer wallet and credit merchant wallet gross
    await postLedgerAndUpdateBalance({
      walletId: customerWalletId,
      entryType: "debit",
      amount: saleAmount,
      currency,
      ref: `${saleRef}-cust`,
      narration: "Purchase (demo)",
      metadata: { ref: saleRef, kind: "MERCHANT_PAYMENT" },
    });
    await postLedgerAndUpdateBalance({
      walletId: merchantWalletId,
      entryType: "credit",
      amount: saleAmount,
      currency,
      ref: `${saleRef}-mrc`,
      narration: "Sale proceeds (gross, demo)",
      metadata: { ref: saleRef, kind: "MERCHANT_PAYMENT" },
    });
    results.steps.push({
      type: "SALE_GROSS",
      ref: saleRef,
      amount: saleAmount,
    });

    // Insert a Payment Intent row to make this discoverable in UI
    const piRows = await sql(
      `INSERT INTO payment_intents (user_id, merchant_id, amount_due, currency, status, funding_plan, created_at, updated_at)
       VALUES ($1,$2,$3,$4,'SETTLED',$5::jsonb, now(), now())
       RETURNING id`,
      [
        userId,
        String(merchantUserId),
        saleAmount,
        currency,
        JSON.stringify([
          {
            id: String(customerWalletId),
            type: "BRIDGE_WALLET",
            amount: saleAmount,
            priority: 1,
          },
        ]),
      ],
    );
    const paymentIntentId = piRows?.[0]?.id;
    if (paymentIntentId) {
      results.steps.push({ type: "PAYMENT_INTENT", id: paymentIntentId });
    }

    // Apply MDR (merchant pays) → debit merchant, credit platform
    const saleFees = await applyFees({
      transactionType: "MERCHANT_PAYMENT",
      transactionId: saleRef,
      baseAmount: saleAmount,
      currency,
      merchantId: String(merchantUserId),
      merchantWalletId,
    });
    results.steps.push({ type: "SALE_FEES", ...saleFees });

    // 3) Simulate a WITHDRAWAL of 3,000 KES
    const wdAmount = 3000;
    const wdRef = ref("withdraw");
    await postLedgerAndUpdateBalance({
      walletId: customerWalletId,
      entryType: "debit",
      amount: wdAmount,
      currency,
      ref: wdRef,
      narration: "Withdrawal principal (demo)",
      metadata: { kind: "WITHDRAWAL" },
    });
    results.steps.push({
      type: "WITHDRAWAL_PRINCIPAL",
      ref: wdRef,
      amount: wdAmount,
    });

    // Record a withdrawal row so it shows in withdrawals views
    await sql(
      `INSERT INTO wallet_withdrawals (wallet_id, user_id, method, destination, amount, currency, status, provider, order_reference, metadata, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,'succeeded','lemonade',$7,$8::jsonb, now(), now())
       ON CONFLICT (order_reference) DO NOTHING`,
      [
        customerWalletId,
        userId,
        "mpesa",
        "254700000000",
        wdAmount,
        currency,
        wdRef,
        JSON.stringify({ kind: "WITHDRAWAL", demo: true }),
      ],
    );

    const wdFees = await applyFees({
      transactionType: "WITHDRAWAL",
      transactionId: wdRef,
      baseAmount: wdAmount,
      currency,
      customerWalletId,
    });
    results.steps.push({ type: "WITHDRAWAL_FEES", ...wdFees });

    // Fetch balances
    const balances = await sql(
      `SELECT w.id, w.user_id, u.email, w.currency, w.balance FROM wallets w
       LEFT JOIN auth_users u ON u.id = w.user_id
       WHERE w.id = $1 OR w.id = $2 OR w.id = $3`,
      [customerWalletId, merchantWalletId, platformWallet.id],
    );

    return Response.json({
      ok: true,
      currency,
      customerWalletId,
      merchantWalletId,
      platformWalletId: platformWallet.id,
      paymentIntentId,
      balances,
      results,
    });
  } catch (err) {
    console.error("/api/billing/seed-demo error", err);
    return Response.json(
      {
        error: "Failed to seed demo billing",
        details: String(err?.message || err),
      },
      { status: 500 },
    );
  }
}
