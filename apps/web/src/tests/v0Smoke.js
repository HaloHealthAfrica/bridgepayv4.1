// Minimal V0 test scaffolding (documentation as code)
// This file is not executed by the app; it documents the smoke test steps.

export const v0SmokePlan = {
  payNow: {
    route: "/api/payments/shopping/orders/[id]/pay-now",
    verify: [
      "orders.status becomes COMPLETED",
      "wallet_ledger debit customer + credit merchant",
      "applyFees MERCHANT_PAYMENT entries in billing_ledger",
      "idempotent on repeated calls with Idempotency-Key",
    ],
  },
  escrow: {
    fund: {
      route: "/api/payments/shopping/orders/[id]/escrow/fund",
      verify: [
        "orders.status becomes IN_ESCROW",
        "wallet_ledger debit customer + credit escrow wallet",
        "applyFees PROJECT entries",
      ],
    },
    cancel: {
      route: "/api/shopping/orders/[id]/escrow/cancel",
      verify: [
        "orders.status becomes CANCELLED",
        "wallet_ledger debit escrow + credit customer (refund)",
        "goods_escrows.status = cancelled",
      ],
    },
    release: {
      route: "/api/payments/shopping/orders/[id]/escrow/release",
      verify: [
        "orders.status becomes COMPLETED",
        "wallet_ledger debit escrow + credit merchant",
        "optional MERCHANT_PAYMENT fees",
      ],
    },
  },
  installments: {
    pay: {
      route: "/api/payments/shopping/installments/[id]/pay",
      verify: [
        "DELIVER_THEN_COLLECT: debit customer + credit merchant per leg",
        "INSTALLMENT_PAY_AFTER: debit customer + credit escrow per leg",
        "SCHEDULED fees applied",
      ],
    },
    complete: {
      route: "/api/payments/shopping/installments/[id]/complete",
      verify: [
        "plan.status is completed",
        "if pay-after, escrow released to merchant via OrderService",
        "INSTALLMENT_COMPLETED fees emitted",
      ],
    },
  },
  splitMultiRail: {
    execute: {
      route: "/api/payments/split/[id]",
      verify: [
        "bridge_wallet legs move funds internally with helper",
        "external legs initiated via Lemonade",
        "per-leg SPLIT fees applied",
        "group status reflects member statuses",
      ],
    },
  },
  webhooks: {
    verify: [
      "lemonade webhook idempotent on replay",
      "wallet webhook idempotent on replay",
    ],
  },
};
