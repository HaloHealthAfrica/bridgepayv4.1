export function isEnum(value, list) {
  return list.includes(value);
}

export function isPositiveNumber(n) {
  const x = Number(n);
  return Number.isFinite(x) && x > 0;
}

export function isString(v) {
  return typeof v === "string" && v.length > 0;
}

export function looksLikeMsisdn(v) {
  if (!isString(v)) return false;
  // allow starting 0 or +254 or 254 and 9-12 digits total
  return /^(\+?\d{9,15}|0\d{9})$/.test(v);
}

export function isObject(v) {
  return !!v && typeof v === "object" && !Array.isArray(v);
}

export function validateCreateInput(body) {
  const errors = [];
  const action = body?.action;
  if (!isEnum(action, ["stk_push", "wallet_payment"])) {
    errors.push({ field: "action", message: "invalid action" });
  }
  const payload = body?.payload;
  if (!isObject(payload)) {
    errors.push({ field: "payload", message: "payload must be object" });
  } else {
    if (!isPositiveNumber(payload.amount)) {
      errors.push({ field: "amount", message: "amount must be > 0" });
    }
    if (action === "stk_push") {
      if (!looksLikeMsisdn(payload.phone_number)) {
        errors.push({ field: "phone_number", message: "invalid phone_number" });
      }
    }
    if (action === "wallet_payment") {
      if (!isString(payload.wallet_no)) {
        errors.push({ field: "wallet_no", message: "invalid wallet_no" });
      }
    }
    if (payload.order_reference && !isString(payload.order_reference)) {
      errors.push({
        field: "order_reference",
        message: "order_reference must be string",
      });
    }
  }
  return errors;
}

export function validateStatusSyncInput(body) {
  const errors = [];
  const id = body?.payment_id;
  // Our DB uses integer ids; accept numeric or numeric string
  const n = Number(id);
  if (!Number.isFinite(n) || n <= 0) {
    errors.push({
      field: "payment_id",
      message: "payment_id must be a positive number",
    });
  }
  return errors;
}

export function validateTraceInput(body) {
  const errors = [];
  const action = body?.action;
  if (
    action &&
    !isEnum(action, [
      "stk_push",
      "wallet_payment",
      "card_payment",
      "mpesa_transfer",
      "pesalink_transfer",
      "transaction_status",
    ])
  ) {
    errors.push({ field: "action", message: "invalid action" });
  }
  const payload = body?.payload;
  if (payload !== undefined && !isObject(payload)) {
    errors.push({ field: "payload", message: "payload must be object" });
  }
  return errors;
}
