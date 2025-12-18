import sql from "@/app/api/utils/sql";
import lemonade from "@/app/api/utils/lemonadeClient";
import { getOrCreateWallet, nowRef } from "../_helpers";
import {
  errorResponse,
  successResponse,
  ErrorCodes,
  withErrorHandling,
} from "@/app/api/utils/errorHandler";
import * as yup from "yup";
import { CommonSchemas } from "@/app/api/middleware/validate";
import { normalizeCurrency } from "@/app/api/utils/currencies";
import { ensureAuthenticated } from "@/app/api/middleware/roleGuard";

const topupSchema = yup.object({
  amount: CommonSchemas.amount,
  method: yup.string().oneOf(['mpesa_stk', 'card', 'bank', 'card_bank']).default('mpesa_stk'),
  phone: yup.string().nullable().when('method', {
    is: 'mpesa_stk',
    then: (schema) => schema.required('Phone number is required for M-Pesa STK'),
    otherwise: (schema) => schema.nullable(),
  }),
  msisdn: yup.string().nullable(),
  currency: CommonSchemas.currency,
});

/**
 * POST /api/wallet/topup
 * Top up wallet balance
 * Body: { amount, method, phone?, currency? }
 */
export const POST = withErrorHandling(async (request) => {
  const startedAt = Date.now();
  const guard = await ensureAuthenticated(request);
  if (!guard.ok) {
    return guard.response;
  }
  const session = guard.session;

  let body = {};
  try {
    body = await request.json();
  } catch {
    return errorResponse(ErrorCodes.INVALID_JSON, {
      message: "Invalid JSON in request body",
    });
  }

  // Validate with Yup schema
  let validated;
  try {
    // Use phone or msisdn
    const phoneValue = body.phone || body.msisdn;
    validated = await topupSchema.validate(
      { ...body, phone: phoneValue },
      { abortEarly: false, stripUnknown: true }
    );
  } catch (validationError) {
    if (validationError.name === "ValidationError") {
      const errors = {};
      if (validationError.inner && validationError.inner.length > 0) {
        validationError.inner.forEach((err) => {
          if (err.path) {
            errors[err.path] = err.message;
          }
        });
      } else if (validationError.path) {
        errors[validationError.path] = validationError.message;
      }

      return errorResponse(ErrorCodes.VALIDATION_ERROR, {
        message: "Validation failed",
        details: { errors, summary: validationError.message },
      });
    }
    throw validationError;
  }

  const amount = Number(validated.amount);
  const method = validated.method.toLowerCase();
  const phone = validated.phone;
  const currency = normalizeCurrency(validated.currency);

  if (method === "mpesa_stk" && !phone) {
    return errorResponse(ErrorCodes.MISSING_FIELDS, {
      message: "Phone number is required for M-Pesa STK",
    });
  }

  const userId = session.user.id;
  const wallet = await getOrCreateWallet(userId, currency);

  const order_reference = nowRef("wl-topup");

  // Create funding session (pending)
  const ins = await sql`
    INSERT INTO wallet_funding_sessions (
      wallet_id, user_id, method, amount, currency, status, provider, order_reference, metadata
    ) VALUES (
      ${wallet.id},
      ${userId},
      ${method},
      ${amount},
      ${currency},
      'pending',
      'lemonade',
      ${order_reference},
      '{}'::jsonb
    )
    RETURNING id
  `;
  const sessionId = ins?.[0]?.id;

  // Call Lemonade: map method to action
  let action = "stk_push";
  if (method === "card" || method === "bank" || method === "card_bank")
    action = "card_payment";

  const payload = { amount, currency, reference: order_reference };
  if (action === "stk_push") {
    payload.phone_number = phone;
    payload.acc_no = phone;
  }

  try {
    const res = await lemonade.call({
      action,
      payload,
      mode: "auto",
      idempotencyKey: order_reference,
    });

    // Record provider refs
    const provider_tx_id =
      res?.data?.transaction_id || res?.data?.reference || null;
    await sql`
      UPDATE wallet_funding_sessions
      SET metadata = metadata || ${JSON.stringify({ provider_response: res?.data || null })}::jsonb,
          provider_tx_id = ${provider_tx_id},
          updated_at = now()
      WHERE id = ${sessionId}
    `;

    // Do NOT credit balance here. Wait for webhook to confirm success.
    return successResponse({
      session_id: sessionId,
      order_reference,
      provider: res?.mode || "direct",
      provider_status: res?.status,
      provider_tx_id,
      forwarded: !!res?.ok,
      eta: 30,
      startedAt,
      tookMs: Date.now() - startedAt,
    });
  } catch (error) {
    console.error("/api/wallet/topup POST error", error);
    return errorResponse(ErrorCodes.PAYMENT_GATEWAY_ERROR, {
      message: "Failed to initiate top-up",
    });
  }
});
