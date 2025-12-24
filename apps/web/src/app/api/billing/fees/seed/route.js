import { auth } from "@/auth";
import sql from "@/app/api/utils/sql";

function ok(data, status = 200) {
  return Response.json({ ok: true, ...data }, { status });
}
function bad(status, error, extra = {}) {
  return Response.json({ ok: false, error, ...extra }, { status });
}

function isAdmin(role) {
  return role === "admin";
}

// Expanded defaults to cover all monetizable use cases the team listed.
// Admins can edit these in the catalog UI after seeding.
const DEFAULTS = [
  // Customer add-on fee for merchant payments (platform revenue)
  // This is charged to the customer on top of the principal, where wallets exist.
  // For external rails, it is recorded in billing_ledger and should be netted/settled operationally.
  {
    code: "CHECKOUT_CUSTOMER_FEE",
    name: "Checkout Convenience Fee (Customer)",
    fee_type: "percentage",
    applies_to: "MERCHANT_PAYMENT",
    payer: "customer",
    rate: 0.01, // 1.0% add-on
    amount: null,
    status: "active",
    metadata: {},
  },

  // Merchant acquiring fees (wallet-only, external-only, split legs)
  {
    code: "MDR_DEFAULT",
    name: "Merchant Discount Rate (Default)",
    fee_type: "percentage",
    applies_to: "MERCHANT_PAYMENT",
    payer: "merchant",
    rate: 0.015, // 1.5%
    amount: null,
    status: "active",
    metadata: {},
  },
  {
    code: "MDR_WALLET",
    name: "MDR (Bridge Wallet)",
    fee_type: "percentage",
    applies_to: "MERCHANT_PAYMENT",
    payer: "merchant",
    rate: 0.01, // 1.0%
    amount: null,
    status: "active",
    metadata: { funding_source: "BRIDGE_WALLET" },
  },
  {
    code: "MDR_MPESA",
    name: "MDR (M-Pesa)",
    fee_type: "percentage",
    applies_to: "MERCHANT_PAYMENT",
    payer: "merchant",
    rate: 0.015, // 1.5% (tune as needed)
    amount: null,
    status: "inactive", // leave off by default to avoid double-charging with MDR_DEFAULT
    metadata: { funding_source: "LEMONADE_MPESA" },
  },
  {
    code: "MDR_BANK",
    name: "MDR (Bank/Card)",
    fee_type: "percentage",
    applies_to: "MERCHANT_PAYMENT",
    payer: "merchant",
    rate: 0.012, // 1.2%
    amount: null,
    status: "inactive",
    metadata: { funding_source: "LEMONADE_BANK" },
  },

  // Split payment orchestration fee (per checkout when split is used)
  {
    code: "SPLIT_ORCHESTRATION",
    name: "Split Payment Orchestration",
    fee_type: "flat",
    applies_to: "SPLIT",
    payer: "merchant",
    rate: null,
    amount: 50,
    status: "active",
    metadata: {},
  },

  // Top-up convenience/processing fees (by rail)
  {
    code: "TOPUP_FEE_MPESA",
    name: "Top-up Convenience (M-Pesa)",
    fee_type: "percentage",
    applies_to: "TOPUP",
    payer: "customer",
    rate: 0.01, // 1%
    amount: null,
    status: "active",
    metadata: { rail: "mpesa" },
  },
  {
    code: "TOPUP_FEE_BANK",
    name: "Top-up Convenience (Bank)",
    fee_type: "percentage",
    applies_to: "TOPUP",
    payer: "customer",
    rate: 0.008, // 0.8%
    amount: null,
    status: "active",
    metadata: { rail: "bank" },
  },
  {
    code: "TOPUP_FEE_CARD",
    name: "Top-up Convenience (Card)",
    fee_type: "percentage",
    applies_to: "TOPUP",
    payer: "customer",
    rate: 0.015, // 1.5%
    amount: null,
    status: "active",
    metadata: { rail: "card" },
  },

  // Withdrawals
  {
    code: "WITHDRAW_FEE",
    name: "Withdrawal Fee",
    fee_type: "flat",
    applies_to: "WITHDRAWAL",
    payer: "customer",
    rate: null,
    amount: 30,
    status: "active",
    metadata: {},
  },

  // Project Contributions / Crowdfunding (disabled by default; pick who pays)
  {
    code: "PROJECT_PLATFORM_FEE",
    name: "Project Platform Fee",
    fee_type: "percentage",
    applies_to: "PROJECT",
    payer: "merchant", // project owner as merchant by default
    rate: 0.025, // 2.5%
    amount: null,
    status: "inactive",
    metadata: {},
  },

  // Scheduled payment execution (monetize execution only)
  {
    code: "SCHEDULED_EXEC_FEE",
    name: "Scheduled Payment Execution Fee",
    fee_type: "flat",
    applies_to: "SCHEDULED",
    payer: "customer",
    rate: null,
    amount: 10,
    status: "inactive",
    metadata: {},
  },

  // FX conversion spread (framework; disabled by default)
  {
    code: "FX_SPREAD",
    name: "FX Conversion Spread",
    fee_type: "percentage",
    applies_to: "FX",
    payer: "customer",
    rate: 0.015, // 1.5% spread example
    amount: null,
    status: "inactive",
    metadata: {},
  },
];

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) return bad(401, "unauthorized");
  let role = session?.user?.role;
  if (!role) {
    try {
      const r = await sql("SELECT role FROM auth_users WHERE id = $1", [
        session.user.id,
      ]);
      role = r?.[0]?.role;
    } catch {}
  }
  if (!isAdmin(role)) return bad(403, "forbidden");

  try {
    for (const f of DEFAULTS) {
      await sql(
        `INSERT INTO billing_fee_catalog (code, name, fee_type, applies_to, payer, amount, rate, tiers, status, metadata)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9,$10::jsonb)
         ON CONFLICT (code) DO UPDATE SET
           name = EXCLUDED.name,
           fee_type = EXCLUDED.fee_type,
           applies_to = EXCLUDED.applies_to,
           payer = EXCLUDED.payer,
           amount = EXCLUDED.amount,
           rate = EXCLUDED.rate,
           tiers = EXCLUDED.tiers,
           status = EXCLUDED.status,
           metadata = EXCLUDED.metadata,
           updated_at = NOW()`,
        [
          f.code,
          f.name,
          f.fee_type,
          f.applies_to,
          f.payer,
          f.amount == null ? null : Number(f.amount),
          f.rate == null ? null : Number(f.rate),
          JSON.stringify([]),
          f.status,
          JSON.stringify(f.metadata || {}),
        ],
      );
    }
    const rows = await sql(
      "SELECT id, code, name, fee_type, applies_to, payer, amount, rate, tiers, status, metadata FROM billing_fee_catalog ORDER BY created_at DESC",
    );
    return ok({ seeded: true, fees: rows || [] });
  } catch (e) {
    console.error("/api/billing/fees/seed POST error", e);
    return bad(500, "server_error");
  }
}
