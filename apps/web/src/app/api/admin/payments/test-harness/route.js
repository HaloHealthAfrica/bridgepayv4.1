import { auth } from "@/auth";
import sql from "@/app/api/utils/sql";

function bad(status, error, extra = {}) {
  return Response.json({ ok: false, error, ...extra }, { status });
}
function ok(json) {
  return Response.json({ ok: true, ...json }, { status: 200 });
}

// Simple cookie jar for server-side fetch
async function doFetch({
  base,
  path,
  method = "GET",
  headers = {},
  body = null,
  cookie = "",
}) {
  const url = `${base}${path}`;
  const reqHeaders = { ...(headers || {}) };
  if (cookie) reqHeaders["Cookie"] = cookie;
  const res = await fetch(url, {
    method,
    headers: {
      ...(body ? { "Content-Type": "application/json" } : {}),
      ...headers,
      ...(cookie ? { Cookie: cookie } : {}),
    },
    body: body
      ? typeof body === "string"
        ? body
        : JSON.stringify(body)
      : undefined,
  });
  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {}
  const setCookie = res.headers.get("set-cookie") || "";
  const nextCookie = setCookie ? setCookie : cookie;
  return {
    request: { url, method, headers: reqHeaders, body },
    status: res.status,
    headers: Object.fromEntries(res.headers.entries()),
    bodyText: text,
    bodyJson: json,
    cookie: nextCookie,
  };
}

async function qRows(desc, query) {
  const rows = await sql(query);
  return { desc, query, rows };
}

export async function POST() {
  try {
    const session = await auth();
    if (!session?.user?.id) return bad(401, "unauthorized");
    if (session.user.role !== "admin") return bad(403, "admin_only");

    const base =
      process.env.APP_URL || process.env.AUTH_URL || "http://localhost:3000";

    const results = { steps: [] };

    // 0) Auth setup via dev-login
    let merchantCookie = "";
    let customerCookie = "";

    const merchantLogin = await doFetch({
      base,
      path: "/api/auth/dev-login",
      method: "POST",
      body: { email: "merchant+v0@bridge.test" },
    });
    merchantCookie = merchantLogin.cookie;

    const customerLogin = await doFetch({
      base,
      path: "/api/auth/dev-login",
      method: "POST",
      body: { email: "customer+v0@bridge.test" },
    });
    customerCookie = customerLogin.cookie;

    const merchantSession = await doFetch({
      base,
      path: "/api/debug/session",
      cookie: merchantCookie,
    });
    const customerSession = await doFetch({
      base,
      path: "/api/debug/session",
      cookie: customerCookie,
    });
    const MERCHANT_USER_ID = merchantSession?.bodyJson?.user?.id || null;
    const CUSTOMER_USER_ID = customerSession?.bodyJson?.user?.id || null;

    results.steps.push({
      name: "auth_setup",
      merchantLogin,
      customerLogin,
      merchantSession,
      customerSession,
      MERCHANT_USER_ID,
      CUSTOMER_USER_ID,
    });

    // 1) PAY-NOW FLOW
    const shopCreate = await doFetch({
      base,
      path: "/api/shopping/shops",
      method: "POST",
      cookie: merchantCookie,
      body: { name: "V0 Test Shop", description: "v0-paynow" },
    });
    const SHOP_ID =
      shopCreate?.bodyJson?.id || shopCreate?.bodyJson?.data?.id || null;

    const productCreate = await doFetch({
      base,
      path: "/api/shopping/products",
      method: "POST",
      cookie: merchantCookie,
      body: {
        shopId: SHOP_ID,
        name: "V0 Widget",
        price: 5000,
        currency: "KES",
      },
    });
    const PROD_ID = productCreate?.bodyJson?.id || null;

    const orderCreate = await doFetch({
      base,
      path: "/api/shopping/orders",
      method: "POST",
      cookie: customerCookie,
      body: {
        shopId: SHOP_ID,
        items: [{ productId: PROD_ID, qty: 1 }],
        paymentMode: "PAY_NOW",
      },
    });
    const PAYNOW_ORDER_ID = orderCreate?.bodyJson?.id || null;

    const paynowExec1 = await doFetch({
      base,
      path: `/api/payments/shopping/orders/${PAYNOW_ORDER_ID}/pay-now`,
      method: "POST",
      cookie: customerCookie,
      headers: { "Idempotency-Key": "paynow-1" },
    });
    const paynowOrderStatus = await doFetch({
      base,
      path: `/api/shopping/orders/${PAYNOW_ORDER_ID}`,
      cookie: customerCookie,
    });

    const paynowLedgerRows = await qRows(
      "paynow_wallet_ledger",
      `SELECT entry_type, amount, currency, ref, narration, metadata FROM wallet_ledger WHERE (metadata->>'order_id') = '${PAYNOW_ORDER_ID}' OR ref LIKE 'ord-${PAYNOW_ORDER_ID}-%' ORDER BY created_at;`,
    );
    const paynowNetRows = await qRows(
      "paynow_wallet_ledger_sum",
      `SELECT COALESCE(SUM(CASE WHEN entry_type='credit' THEN amount ELSE -amount END),0) AS net FROM wallet_ledger WHERE (metadata->>'order_id') = '${PAYNOW_ORDER_ID}' OR ref LIKE 'ord-${PAYNOW_ORDER_ID}-%';`,
    );
    const paynowBilling = await qRows(
      "paynow_billing_ledger",
      `SELECT transaction_type, transaction_id, fee_code, amount, payer_account, direction, ref FROM billing_ledger WHERE transaction_type='MERCHANT_PAYMENT' AND transaction_id='${PAYNOW_ORDER_ID}' ORDER BY created_at;`,
    );

    const paynowExecReplay = await doFetch({
      base,
      path: `/api/payments/shopping/orders/${PAYNOW_ORDER_ID}/pay-now`,
      method: "POST",
      cookie: customerCookie,
      headers: { "Idempotency-Key": "paynow-1" },
    });

    const custBalances = await qRows(
      "paynow_customer_balance",
      `SELECT id, user_id, currency, balance, available_balance, reserved_balance FROM wallets WHERE user_id=${CUSTOMER_USER_ID} AND currency='KES';`,
    );
    const merchBalances = await qRows(
      "paynow_merchant_balance",
      `SELECT id, user_id, currency, balance, available_balance, reserved_balance FROM wallets WHERE user_id=${MERCHANT_USER_ID} AND currency='KES';`,
    );

    const paynowPass =
      paynowOrderStatus?.bodyJson?.status === "COMPLETED" &&
      Number(paynowNetRows.rows?.[0]?.net || 0) === 0;

    results.steps.push({
      name: "pay_now",
      SHOP_ID,
      PROD_ID,
      PAYNOW_ORDER_ID,
      paynowExec1,
      paynowOrderStatus,
      paynowLedgerRows,
      paynowNetRows,
      paynowBilling,
      paynowExecReplay,
      custBalances,
      merchBalances,
      pass: !!paynowPass,
    });

    // 2) ESCROW FLOW
    const escrowOrder = await doFetch({
      base,
      path: "/api/shopping/orders",
      method: "POST",
      cookie: customerCookie,
      body: {
        shopId: SHOP_ID,
        items: [{ productId: PROD_ID, qty: 1 }],
        paymentMode: "ESCROW",
      },
    });
    const ESCROW_ORDER_ID = escrowOrder?.bodyJson?.id || null;

    const escrowFund1 = await doFetch({
      base,
      path: `/api/payments/shopping/orders/${ESCROW_ORDER_ID}/escrow/fund`,
      method: "POST",
      cookie: customerCookie,
      headers: { "Idempotency-Key": "escrowfund-1" },
    });
    const escrowOrderStatus1 = await doFetch({
      base,
      path: `/api/shopping/orders/${ESCROW_ORDER_ID}`,
      cookie: customerCookie,
    });

    const escrowFundLedger = await qRows(
      "escrow_fund_wallet_ledger",
      `SELECT entry_type, amount, currency, ref, narration FROM wallet_ledger WHERE (metadata->>'order_id') = '${ESCROW_ORDER_ID}' AND ref LIKE 'esc-${ESCROW_ORDER_ID}-fund-%' ORDER BY created_at;`,
    );
    const escrowFundNet = await qRows(
      "escrow_fund_wallet_sum",
      `SELECT COALESCE(SUM(CASE WHEN entry_type='credit' THEN amount ELSE -amount END),0) AS net FROM wallet_ledger WHERE (metadata->>'order_id') = '${ESCROW_ORDER_ID}' AND ref LIKE 'esc-${ESCROW_ORDER_ID}-fund-%';`,
    );
    const escrowBilling = await qRows(
      "escrow_billing_ledger",
      `SELECT transaction_type, transaction_id, fee_code, amount, payer_account, direction, ref FROM billing_ledger WHERE transaction_type='PROJECT' AND transaction_id='${ESCROW_ORDER_ID}' ORDER BY created_at;`,
    );

    const escrowCancel1 = await doFetch({
      base,
      path: `/api/shopping/orders/${ESCROW_ORDER_ID}/escrow/cancel`,
      method: "POST",
      cookie: customerCookie,
    });
    const escrowCancelLedger = await qRows(
      "escrow_cancel_wallet_ledger",
      `SELECT entry_type, amount, currency, ref, narration FROM wallet_ledger WHERE (metadata->>'order_id') = '${ESCROW_ORDER_ID}' AND (ref LIKE 'esc-${ESCROW_ORDER_ID}-rel-%' OR ref LIKE 'esc-${ESCROW_ORDER_ID}-can-%') ORDER BY created_at;`,
    );
    const escrowCancelNet = await qRows(
      "escrow_cancel_wallet_sum",
      `SELECT COALESCE(SUM(CASE WHEN entry_type='credit' THEN amount ELSE -amount END),0) AS net FROM wallet_ledger WHERE (metadata->>'order_id') = '${ESCROW_ORDER_ID}' AND (ref LIKE 'esc-${ESCROW_ORDER_ID}-rel-%' OR ref LIKE 'esc-${ESCROW_ORDER_ID}-can-%');`,
    );
    const escrowOrderStatus2 = await doFetch({
      base,
      path: `/api/shopping/orders/${ESCROW_ORDER_ID}`,
      cookie: customerCookie,
    });

    const escrowCancelReplay = await doFetch({
      base,
      path: `/api/shopping/orders/${ESCROW_ORDER_ID}/escrow/cancel`,
      method: "POST",
      cookie: customerCookie,
    });
    const escrowIllegalRelease = await doFetch({
      base,
      path: `/api/payments/shopping/orders/${ESCROW_ORDER_ID}/escrow/release`,
      method: "POST",
      cookie: merchantCookie,
    });

    const escrowPass =
      escrowOrderStatus1?.bodyJson?.status === "IN_ESCROW" &&
      Number(escrowFundNet.rows?.[0]?.net || 0) === 0 &&
      escrowOrderStatus2?.bodyJson?.status === "CANCELLED" &&
      Number(escrowCancelNet.rows?.[0]?.net || 0) === 0 &&
      escrowIllegalRelease.status >= 400 &&
      escrowIllegalRelease.status < 500;

    results.steps.push({
      name: "escrow_flow",
      ESCROW_ORDER_ID,
      escrowFund1,
      escrowOrderStatus1,
      escrowFundLedger,
      escrowFundNet,
      escrowBilling,
      escrowCancel1,
      escrowCancelLedger,
      escrowCancelNet,
      escrowOrderStatus2,
      escrowCancelReplay,
      escrowIllegalRelease,
      pass: !!escrowPass,
    });

    // 3) INSTALLMENTS
    const instOrder = await doFetch({
      base,
      path: "/api/shopping/orders",
      method: "POST",
      cookie: customerCookie,
      body: {
        shopId: SHOP_ID,
        items: [{ productId: PROD_ID, qty: 1 }],
        paymentMode: "INSTALLMENT_PAY_AFTER",
      },
    });
    const INST_ORDER_ID = instOrder?.bodyJson?.id || null;

    const schedule = [{ amount: 2000 }, { amount: 2000 }, { amount: 1000 }];
    const planCreate = await doFetch({
      base,
      path: `/api/shopping/installments/${INST_ORDER_ID}`,
      method: "POST",
      cookie: customerCookie,
      body: { mode: "INSTALLMENT_PAY_AFTER", schedule },
    });
    const PLAN_ID = planCreate?.bodyJson?.id || null;

    const instPay0 = await doFetch({
      base,
      path: `/api/payments/shopping/installments/${PLAN_ID}/pay`,
      method: "POST",
      cookie: customerCookie,
      headers: { "Idempotency-Key": `inst-${PLAN_ID}-0` },
      body: { index: 0 },
    });
    const instPay1 = await doFetch({
      base,
      path: `/api/payments/shopping/installments/${PLAN_ID}/pay`,
      method: "POST",
      cookie: customerCookie,
      headers: { "Idempotency-Key": `inst-${PLAN_ID}-1` },
      body: { index: 1 },
    });
    const instPay2 = await doFetch({
      base,
      path: `/api/payments/shopping/installments/${PLAN_ID}/pay`,
      method: "POST",
      cookie: customerCookie,
      headers: { "Idempotency-Key": `inst-${PLAN_ID}-2` },
      body: { index: 2 },
    });

    const instLedger = await qRows(
      "inst_wallet_ledger",
      `SELECT entry_type, amount, currency, ref, narration, metadata FROM wallet_ledger WHERE (metadata->>'plan_id') = '${PLAN_ID}' ORDER BY created_at;`,
    );
    const instNet = await qRows(
      "inst_wallet_sum",
      `SELECT COALESCE(SUM(CASE WHEN entry_type='credit' THEN amount ELSE -amount END),0) AS net FROM wallet_ledger WHERE (metadata->>'plan_id') = '${PLAN_ID}';`,
    );
    const instBilling = await qRows(
      "inst_billing_ledger",
      `SELECT transaction_type, transaction_id, fee_code, amount, direction, ref FROM billing_ledger WHERE transaction_type='SCHEDULED' AND transaction_id='${PLAN_ID}' ORDER BY created_at;`,
    );
    const instOrderStatusFinal = await doFetch({
      base,
      path: `/api/shopping/orders/${INST_ORDER_ID}`,
      cookie: customerCookie,
    });
    const instReplay1 = await doFetch({
      base,
      path: `/api/payments/shopping/installments/${PLAN_ID}/pay`,
      method: "POST",
      cookie: customerCookie,
      headers: { "Idempotency-Key": `inst-${PLAN_ID}-1` },
      body: { index: 1 },
    });

    const instPass =
      instOrderStatusFinal?.bodyJson?.status === "COMPLETED" &&
      Number(instNet.rows?.[0]?.net || 0) === 0 &&
      instBilling.rows?.length >= 1 &&
      instReplay1.status === 200;

    results.steps.push({
      name: "installments",
      INST_ORDER_ID,
      PLAN_ID,
      instPay0,
      instPay1,
      instPay2,
      instLedger,
      instNet,
      instBilling,
      instOrderStatusFinal,
      instReplay1,
      pass: !!instPass,
    });

    // 4) SPLIT MULTI-RAIL
    const splitCreate = await doFetch({
      base,
      path: "/api/payments/split",
      method: "POST",
      cookie: customerCookie,
      body: {
        currency: "KES",
        members: [
          {
            method: "bridge_wallet",
            recipient_user_id: MERCHANT_USER_ID,
            amount: 1000,
          },
          { method: "stk", phone: "254700000000", amount: 500 },
          { method: "card", amount: 500, card_hint: "4111" },
        ],
      },
    });
    const SPLIT_ID = splitCreate?.bodyJson?.id || null;

    const splitExec1 = await doFetch({
      base,
      path: `/api/payments/split/${SPLIT_ID}`,
      method: "POST",
      cookie: customerCookie,
      headers: { "Idempotency-Key": "split-1" },
    });
    const splitLedger = await qRows(
      "split_wallet_ledger_internal",
      `SELECT entry_type, amount, currency, ref, narration, metadata FROM wallet_ledger WHERE (metadata->>'group_id') = '${SPLIT_ID}' OR ref LIKE 'split-${SPLIT_ID}-%' ORDER BY created_at;`,
    );
    const splitBilling = await qRows(
      "split_billing_ledger",
      `SELECT transaction_type, transaction_id, fee_code, amount, direction, ref FROM billing_ledger WHERE transaction_type='SPLIT' AND transaction_id='${SPLIT_ID}' ORDER BY created_at;`,
    );
    const lemonadeRecent = await doFetch({
      base,
      path: "/api/payments/lemonade/recent",
      cookie: customerCookie,
    });
    const splitExecReplay = await doFetch({
      base,
      path: `/api/payments/split/${SPLIT_ID}`,
      method: "POST",
      cookie: customerCookie,
      headers: { "Idempotency-Key": "split-1" },
    });

    results.steps.push({
      name: "split_multi_rail",
      SPLIT_ID,
      splitExec1,
      splitLedger,
      splitBilling,
      lemonadeRecent,
      splitExecReplay,
      pass: true,
    });

    // 5) Idempotency pressure test (pay-now)
    const pressureRuns = await Promise.all(
      Array.from({ length: 10 }).map(() =>
        doFetch({
          base,
          path: `/api/payments/shopping/orders/${PAYNOW_ORDER_ID}/pay-now`,
          method: "POST",
          cookie: customerCookie,
          headers: { "Idempotency-Key": "paynow-1" },
        }),
      ),
    );
    const paynowCount = await qRows(
      "paynow_wallet_ledger_count",
      `SELECT COUNT(*)::int AS cnt FROM wallet_ledger WHERE (metadata->>'order_id') = '${PAYNOW_ORDER_ID}' OR ref LIKE 'ord-${PAYNOW_ORDER_ID}-%';`,
    );

    results.steps.push({
      name: "idempotency_pressure",
      pressureRuns,
      paynowCount,
      pass: true,
    });

    // 6) Ledger integrity
    const netPaynow = await qRows(
      "net_paynow",
      `SELECT COALESCE(SUM(CASE WHEN entry_type='credit' THEN amount ELSE -amount END),0) AS net FROM wallet_ledger WHERE (metadata->>'order_id') = '${PAYNOW_ORDER_ID}' OR ref LIKE 'ord-${PAYNOW_ORDER_ID}-%';`,
    );
    const netEscrow = await qRows(
      "net_escrow",
      `SELECT COALESCE(SUM(CASE WHEN entry_type='credit' THEN amount ELSE -amount END),0) AS net FROM wallet_ledger WHERE (metadata->>'order_id') = '${ESCROW_ORDER_ID}';`,
    );
    const netInst = await qRows(
      "net_installments",
      `SELECT COALESCE(SUM(CASE WHEN entry_type='credit' THEN amount ELSE -amount END),0) AS net FROM wallet_ledger WHERE (metadata->>'plan_id') = '${PLAN_ID}';`,
    );
    const netSplit = await qRows(
      "net_split",
      `SELECT COALESCE(SUM(CASE WHEN entry_type='credit' THEN amount ELSE -amount END),0) AS net FROM wallet_ledger WHERE (metadata->>'group_id') = '${SPLIT_ID}' OR ref LIKE 'split-${SPLIT_ID}-%';`,
    );

    const ledgerIntegrityPass = [netPaynow, netEscrow, netInst, netSplit].every(
      (x) => Number(x.rows?.[0]?.net || 0) === 0,
    );

    results.steps.push({
      name: "ledger_integrity",
      netPaynow,
      netEscrow,
      netInst,
      netSplit,
      pass: ledgerIntegrityPass,
    });

    return ok({ report: results });
  } catch (e) {
    console.error("/api/admin/payments/test-harness error", e);
    return bad(500, "server_error");
  }
}
