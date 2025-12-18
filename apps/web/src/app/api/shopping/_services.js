import sql from "@/app/api/utils/sql";
import { auth } from "@/auth";
import {
  getOrCreateWallet,
  postLedgerAndUpdateBalance,
} from "@/app/api/wallet/_helpers";
import {
  applyFees,
  getOrCreatePlatformWallet,
} from "@/app/api/billing/_helpers";

// Feature flag (can be toggled via env if desired)
const SHOPPING_ENABLED = true;

function asNumber(n, d = 0) {
  const v = Number(n);
  return Number.isFinite(v) ? v : d;
}

// Create a dedicated escrow wallet holder so funds can be held safely without touching merchant/customer until release
export async function getOrCreateEscrowWallet(currency = "KES") {
  const email = "escrow@bridge.internal";
  const users = await sql(
    "SELECT id FROM auth_users WHERE email = $1 LIMIT 1",
    [email],
  );
  let userId = users?.[0]?.id || null;
  if (!userId) {
    const ins = await sql(
      "INSERT INTO auth_users (name, email, role) VALUES ($1,$2,$3) RETURNING id",
      ["Bridge Escrow", email, "admin"],
    );
    userId = ins?.[0]?.id;
  }
  const w = await sql(
    "SELECT id FROM wallets WHERE user_id = $1 AND currency = $2 LIMIT 1",
    [userId, currency],
  );
  if (w?.[0]?.id) return { id: w[0].id, userId };
  const created = await sql(
    "INSERT INTO wallets (user_id, currency, balance, available_balance, reserved_balance, status) VALUES ($1,$2,0,0,0,'active') RETURNING id",
    [userId, currency],
  );
  return { id: created?.[0]?.id, userId };
}

// Billing mapping: keep existing catalog's applies_to constraint intact
// - ORDER_PAY_NOW -> MERCHANT_PAYMENT
// - ESCROW_FUND   -> PROJECT (treated like an escrow contribution)
// - ESCROW_RELEASE-> MERCHANT_PAYMENT (usually no extra fee; call only if you define such a rule)
// - INSTALLMENT_PAYMENT -> SCHEDULED
// - INSTALLMENT_COMPLETED -> SCHEDULED (optional)
function mapEventToAppliesTo(eventType) {
  switch (eventType) {
    case "ORDER_PAY_NOW":
      return "MERCHANT_PAYMENT";
    case "ESCROW_FUND":
      return "PROJECT";
    case "ESCROW_RELEASE":
      return "MERCHANT_PAYMENT";
    case "INSTALLMENT_PAYMENT":
    case "INSTALLMENT_COMPLETED":
      return "SCHEDULED";
    default:
      return "MERCHANT_PAYMENT";
  }
}

export const ShopService = {
  async createShop({ merchantUserId, name, description = "", metadata = {} }) {
    const rows = await sql(
      "INSERT INTO shops (merchant_user_id, name, description, metadata) VALUES ($1,$2,$3,$4::jsonb) RETURNING *",
      [merchantUserId, name, description, JSON.stringify(metadata)],
    );
    return rows?.[0] || null;
  },
  async listMyShops(merchantUserId) {
    return await sql(
      "SELECT * FROM shops WHERE merchant_user_id = $1 ORDER BY created_at DESC",
      [merchantUserId],
    );
  },
  async getById(id) {
    const rows = await sql("SELECT * FROM shops WHERE id = $1 LIMIT 1", [id]);
    return rows?.[0] || null;
  },
};

export const ProductService = {
  async createProduct({
    shopId,
    name,
    description = "",
    price,
    currency = "KES",
    stock = null,
    metadata = {},
  }) {
    const rows = await sql(
      "INSERT INTO products (shop_id, name, description, price, currency, stock, metadata) VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb) RETURNING *",
      [
        shopId,
        name,
        description,
        asNumber(price),
        currency,
        stock,
        JSON.stringify(metadata),
      ],
    );
    return rows?.[0] || null;
  },
  async listByShop(shopId) {
    return await sql(
      "SELECT * FROM products WHERE shop_id = $1 ORDER BY created_at DESC",
      [shopId],
    );
  },
  async getById(id) {
    const rows = await sql("SELECT * FROM products WHERE id = $1 LIMIT 1", [
      id,
    ]);
    return rows?.[0] || null;
  },
};

export const OrderService = {
  // items: [{ productId, qty }]
  async createOrder({
    shopId,
    customerUserId,
    items = [],
    currency = "KES",
    paymentMode = "PAY_NOW",
  }) {
    if (!items?.length) throw new Error("items_required");
    let total = 0;
    for (const it of items) {
      const p = await ProductService.getById(it.productId);
      if (!p || String(p.shop_id) !== String(shopId))
        throw new Error("invalid_product");
      const qty = asNumber(it.qty, 1);
      total += asNumber(p.price) * qty;
    }
    const rows = await sql(
      "INSERT INTO orders (shop_id, customer_user_id, total_amount, currency, payment_mode, status, metadata) VALUES ($1,$2,$3,$4,$5,'PENDING_PAYMENT',$6::jsonb) RETURNING *",
      [
        shopId,
        customerUserId,
        total,
        currency,
        paymentMode,
        JSON.stringify({ items }),
      ],
    );
    return rows?.[0] || null;
  },

  async getById(id) {
    const rows = await sql("SELECT * FROM orders WHERE id = $1 LIMIT 1", [id]);
    return rows?.[0] || null;
  },

  // PAY NOW: debit customer wallet, credit merchant wallet, bill MDR
  async payNow({ orderId }) {
    const order = await this.getById(orderId);
    if (!order) throw new Error("order_not_found");
    if (order.status !== "PENDING_PAYMENT") throw new Error("invalid_status");

    const shop = await ShopService.getById(order.shop_id);
    if (!shop) throw new Error("shop_not_found");

    // Resolve wallets
    const customerWallet = await getOrCreateWallet(
      order.customer_user_id,
      order.currency,
    );
    const merchantWallet = await getOrCreateWallet(
      shop.merchant_user_id,
      order.currency,
    );

    // Move principal funds using standard helper (idempotent by ref)
    const debitRef = `ord-${orderId}-cust-debit`;
    const creditRef = `ord-${orderId}-mrc-credit`;

    await postLedgerAndUpdateBalance({
      walletId: customerWallet.id,
      entryType: "debit",
      amount: asNumber(order.total_amount),
      currency: order.currency,
      ref: debitRef,
      narration: "Order payment",
      metadata: { order_id: orderId },
    });

    await postLedgerAndUpdateBalance({
      walletId: merchantWallet.id,
      entryType: "credit",
      amount: asNumber(order.total_amount),
      currency: order.currency,
      ref: creditRef,
      narration: "Order payment",
      metadata: { order_id: orderId },
    });

    // update order
    await sql(
      "UPDATE orders SET status = 'COMPLETED', updated_at = now() WHERE id = $1",
      [orderId],
    );

    // Apply MDR fees (maps to MERCHANT_PAYMENT)
    await applyFees({
      transactionType: mapEventToAppliesTo("ORDER_PAY_NOW"),
      transactionId: orderId,
      baseAmount: asNumber(order.total_amount),
      currency: order.currency,
      merchantId: String(shop.merchant_user_id),
      customerWalletId: customerWallet.id,
      merchantWalletId: merchantWallet.id,
    });

    return { ok: true };
  },

  // ESCROW: debit customer to escrow wallet; later release to merchant
  async escrowFund({ orderId, releaseCondition = "" }) {
    const order = await this.getById(orderId);
    if (!order) throw new Error("order_not_found");
    if (!["PENDING_PAYMENT", "FUNDED"].includes(order.status))
      throw new Error("invalid_status");

    const shop = await ShopService.getById(order.shop_id);
    const customerWallet = await getOrCreateWallet(
      order.customer_user_id,
      order.currency,
    );
    const escrowWallet = await getOrCreateEscrowWallet(order.currency);

    const debitRef = `esc-${orderId}-fund-cust`;
    const creditRef = `esc-${orderId}-fund-escrow`;

    await postLedgerAndUpdateBalance({
      walletId: customerWallet.id,
      entryType: "debit",
      amount: asNumber(order.total_amount),
      currency: order.currency,
      ref: debitRef,
      narration: "Escrow funding",
      metadata: { order_id: orderId },
    });

    await postLedgerAndUpdateBalance({
      walletId: escrowWallet.id,
      entryType: "credit",
      amount: asNumber(order.total_amount),
      currency: order.currency,
      ref: creditRef,
      narration: "Escrow funding",
      metadata: { order_id: orderId },
    });

    // ensure goods_escrows row
    await sql(
      "INSERT INTO goods_escrows (order_id, hold_amount, currency, status, release_condition, escrow_wallet_id, metadata) VALUES ($1,$2,$3,'funded',$4,$5,$6::jsonb) ON CONFLICT (order_id) DO UPDATE SET hold_amount = EXCLUDED.hold_amount, updated_at = now()",
      [
        orderId,
        asNumber(order.total_amount),
        order.currency,
        releaseCondition || "",
        escrowWallet.id,
        JSON.stringify({}),
      ],
    );

    // update order
    await sql(
      "UPDATE orders SET status = 'IN_ESCROW', updated_at = now() WHERE id = $1",
      [orderId],
    );

    // Apply escrow funding fees (mapped to PROJECT)
    await applyFees({
      transactionType: mapEventToAppliesTo("ESCROW_FUND"),
      transactionId: orderId,
      baseAmount: asNumber(order.total_amount),
      currency: order.currency,
      merchantId: String(shop.merchant_user_id),
      customerWalletId: customerWallet.id,
    });

    return { ok: true };
  },

  async escrowRelease({ orderId }) {
    const order = await this.getById(orderId);
    if (!order) throw new Error("order_not_found");
    if (order.status !== "IN_ESCROW") throw new Error("invalid_status");

    const shop = await ShopService.getById(order.shop_id);
    const merchantWallet = await getOrCreateWallet(
      shop.merchant_user_id,
      order.currency,
    );

    const esc = (
      await sql("SELECT * FROM goods_escrows WHERE order_id = $1 LIMIT 1", [
        orderId,
      ])
    )?.[0];
    if (!esc) throw new Error("escrow_missing");

    const debitRef = `esc-${orderId}-rel-escrow`;
    const creditRef = `esc-${orderId}-rel-merchant`;

    await postLedgerAndUpdateBalance({
      walletId: esc.escrow_wallet_id,
      entryType: "debit",
      amount: asNumber(esc.hold_amount),
      currency: esc.currency,
      ref: debitRef,
      narration: "Escrow release",
      metadata: { order_id: orderId },
    });

    await postLedgerAndUpdateBalance({
      walletId: merchantWallet.id,
      entryType: "credit",
      amount: asNumber(esc.hold_amount),
      currency: esc.currency,
      ref: creditRef,
      narration: "Escrow release",
      metadata: { order_id: orderId },
    });

    await sql(
      "UPDATE goods_escrows SET status = 'released', updated_at = now() WHERE id = $1",
      [esc.id],
    );
    await sql(
      "UPDATE orders SET status = 'COMPLETED', updated_at = now() WHERE id = $1",
      [orderId],
    );

    // Optional fees at release (mapped to MERCHANT_PAYMENT). Define such rules only if desired.
    await applyFees({
      transactionType: mapEventToAppliesTo("ESCROW_RELEASE"),
      transactionId: orderId,
      baseAmount: asNumber(order.total_amount),
      currency: order.currency,
      merchantId: String(shop.merchant_user_id),
      merchantWalletId: merchantWallet.id,
    });

    return { ok: true };
  },
};

export const InstallmentService = {
  async createPlan({ orderId, mode, schedule }) {
    const order = await OrderService.getById(orderId);
    if (!order) throw new Error("order_not_found");
    if (!["INSTALLMENT_PAY_AFTER", "DELIVER_THEN_COLLECT"].includes(mode))
      throw new Error("invalid_mode");
    // basic validation of schedule amounts
    const totalSched = (Array.isArray(schedule) ? schedule : []).reduce(
      (s, x) => s + asNumber(x.amount),
      0,
    );
    if (
      Math.round(totalSched * 100) !==
      Math.round(asNumber(order.total_amount) * 100)
    )
      throw new Error("schedule_sum_mismatch");

    const rows = await sql(
      "INSERT INTO installment_plans (order_id, mode, total_amount, currency, schedule, status) VALUES ($1,$2,$3,$4,$5::jsonb,'active') RETURNING *",
      [
        orderId,
        mode,
        asNumber(order.total_amount),
        order.currency,
        JSON.stringify(schedule),
      ],
    );
    return rows?.[0] || null;
  },

  async payInstallment({ planId, index }) {
    const plan = (
      await sql("SELECT * FROM installment_plans WHERE id = $1 LIMIT 1", [
        planId,
      ])
    )?.[0];
    if (!plan) throw new Error("plan_not_found");
    if (plan.status !== "active") throw new Error("plan_inactive");
    const order = (
      await sql("SELECT * FROM orders WHERE id = $1 LIMIT 1", [plan.order_id])
    )?.[0];
    if (!order) throw new Error("order_not_found");

    const schedule = Array.isArray(plan.schedule) ? plan.schedule : [];
    const item = schedule[index];
    if (!item) throw new Error("invalid_index");
    if (item.status === "paid") return { ok: true, already: true };

    const customerWallet = await getOrCreateWallet(
      order.customer_user_id,
      order.currency,
    );
    const shop = await ShopService.getById(order.shop_id);

    // Move funds depending on mode
    const amt = asNumber(item.amount);
    const debitRef = `inst-${planId}-${index}-cust`;

    if (plan.mode === "DELIVER_THEN_COLLECT") {
      const merchantWallet = await getOrCreateWallet(
        shop.merchant_user_id,
        order.currency,
      );
      const creditRef = `inst-${planId}-${index}-mrc`;

      await postLedgerAndUpdateBalance({
        walletId: customerWallet.id,
        entryType: "debit",
        amount: amt,
        currency: order.currency,
        ref: debitRef,
        narration: "Installment payment",
        metadata: { plan_id: planId, idx: index },
      });

      await postLedgerAndUpdateBalance({
        walletId: merchantWallet.id,
        entryType: "credit",
        amount: amt,
        currency: order.currency,
        ref: creditRef,
        narration: "Installment payment",
        metadata: { plan_id: planId, idx: index },
      });

      // Bill installment payment (mapped to SCHEDULED)
      await applyFees({
        transactionType: mapEventToAppliesTo("INSTALLMENT_PAYMENT"),
        transactionId: String(planId),
        baseAmount: amt,
        currency: order.currency,
        merchantId: String(shop.merchant_user_id),
        customerWalletId: customerWallet.id,
        merchantWalletId: merchantWallet.id,
      });
    } else {
      // INSTALLMENT_PAY_AFTER: hold in escrow until final completion
      const escrowWallet = await getOrCreateEscrowWallet(order.currency);
      const creditRef = `inst-${planId}-${index}-escrow`;

      await postLedgerAndUpdateBalance({
        walletId: customerWallet.id,
        entryType: "debit",
        amount: amt,
        currency: order.currency,
        ref: debitRef,
        narration: "Installment funding",
        metadata: { plan_id: planId, idx: index },
      });

      await postLedgerAndUpdateBalance({
        walletId: escrowWallet.id,
        entryType: "credit",
        amount: amt,
        currency: order.currency,
        ref: creditRef,
        narration: "Installment funding",
        metadata: { plan_id: planId, idx: index },
      });

      // Bill installment payment (mapped to SCHEDULED)
      await applyFees({
        transactionType: mapEventToAppliesTo("INSTALLMENT_PAYMENT"),
        transactionId: String(planId),
        baseAmount: amt,
        currency: order.currency,
        merchantId: String(shop.merchant_user_id),
        customerWalletId: customerWallet.id,
      });
    }

    // Mark schedule row paid and advance totals
    const newSchedule = schedule.map((x, i) =>
      i === index
        ? { ...x, status: "paid", paid_at: new Date().toISOString() }
        : x,
    );
    const newPaid = asNumber(plan.paid_amount) + amt;
    let newStatus = plan.status;
    let completedAt = plan.completed_at;
    if (
      Math.round(newPaid * 100) >= Math.round(asNumber(plan.total_amount) * 100)
    ) {
      newStatus = "completed";
      completedAt = new Date().toISOString();
    }
    await sql(
      "UPDATE installment_plans SET schedule = $1::jsonb, paid_amount = $2, status = $3, completed_at = COALESCE($4::timestamptz, completed_at), updated_at = now() WHERE id = $5",
      [JSON.stringify(newSchedule), newPaid, newStatus, completedAt, planId],
    );

    // If pay-after and now completed, release escrow to merchant
    if (plan.mode === "INSTALLMENT_PAY_AFTER" && newStatus === "completed") {
      // reuse escrow release path via OrderService
      await OrderService.escrowRelease({ orderId: order.id });
      // Also emit a completion billing event (mapped to SCHEDULED)
      await applyFees({
        transactionType: mapEventToAppliesTo("INSTALLMENT_COMPLETED"),
        transactionId: String(planId),
        baseAmount: asNumber(plan.total_amount),
        currency: order.currency,
        merchantId: String(shop.merchant_user_id),
      });
    }

    return { ok: true };
  },
};

export default {
  ShopService,
  ProductService,
  OrderService,
  InstallmentService,
  getOrCreateEscrowWallet,
  getOrCreatePlatformWallet,
};
