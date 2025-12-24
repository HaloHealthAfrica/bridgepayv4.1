// /apps/web/src/app/api/payments/lemonade/_mapping.js
/**
 * Verified unified Lemonade v2 API mapping for:
 *  - STK Push
 *  - Wallet Payment
 *  - Transaction Status
 *
 * Both payments hit POST /api/v2/payment and require:
 *   acc_no, acc_name, amount, reference, currency, description, channel
 *
 * STK: acc_no = phone_number / msisdn, acc_name = "MSISDN"
 * WALLET: acc_no = wallet_no / wallet_number / account_number / account, acc_name = "Wallet"
 */

function toNumberOrUndefined(v) {
  if (v === undefined || v === null || v === "") return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

export function mapToLemonadePayload(action, payload = {}) {
  const cleaned = {
    ...payload,
    amount: toNumberOrUndefined(payload.amount),
  };

  // Normalize possible input fields
  const msisdn =
    cleaned.phone_number ||
    cleaned.msisdn ||
    cleaned.phone ||
    cleaned.mobile ||
    cleaned.phoneNumber ||
    null;

  const wallet =
    cleaned.wallet_no ||
    cleaned.wallet_number ||
    cleaned.wallet ||
    cleaned.account_number ||
    cleaned.account ||
    cleaned.wallet_id ||
    cleaned.walletId ||
    null;

  const reference =
    cleaned.reference ||
    cleaned.order_reference ||
    cleaned.orderRef ||
    cleaned.external_ref ||
    cleaned.ref ||
    null;

  const amount = cleaned.amount;
  const description = cleaned.description || "Payment";
  const currency = cleaned.currency || "KES";

  // STK → acc_no = phone, acc_name = "MSISDN"
  if (action === "stk_push") {
    return {
      acc_no: msisdn || null,
      acc_name: "MSISDN",
      amount,
      reference,
      currency,
      description,
      channel: cleaned.channel || "100001",
    };
  }

  // Wallet Payment → acc_no = wallet number, acc_name = "Wallet"
  if (action === "wallet_payment") {
    return {
      acc_no: wallet || null,
      acc_name: "Wallet",
      amount,
      reference,
      currency,
      description,
      channel: cleaned.channel || "111111",
    };
  }

  // Transaction Status
  if (action === "transaction_status") {
    return {
      payment_id:
        cleaned.payment_id ||
        cleaned.paymentId ||
        cleaned.reference ||
        cleaned.id ||
        null,
    };
  }

  // Default: pass-through (with numeric normalization of amount)
  return cleaned;
}

export function validateLemonadePayload(action, mapped) {
  const missing = [];
  if (action === "stk_push" || action === "wallet_payment") {
    if (!mapped?.acc_no) missing.push("acc_no");
    if (!mapped?.acc_name) missing.push("acc_name");
    if (!mapped?.amount || mapped.amount <= 0) missing.push("amount");
    if (!mapped?.reference) missing.push("reference");
  }
  if (action === "transaction_status") {
    if (!mapped?.payment_id) missing.push("payment_id");
  }
  return missing.length ? missing : null;
}

export default { mapToLemonadePayload, validateLemonadePayload };
