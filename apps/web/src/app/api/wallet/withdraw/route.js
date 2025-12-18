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

const withdrawSchema = yup.object({
  amount: CommonSchemas.amount,
  method: yup.string().oneOf(['mpesa']).default('mpesa'),
  phone: yup.string().required("Phone number is required"),
  currency: CommonSchemas.currency,
});

/**
 * POST /api/wallet/withdraw
 * Withdraw funds from wallet
 * Body: { amount, method, phone, currency? }
 */
export const POST = withErrorHandling(async (request) => {
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
    validated = await withdrawSchema.validate(
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

  if (method === "mpesa" && !phone) {
    return errorResponse(ErrorCodes.MISSING_FIELDS, {
      message: "Phone number is required for M-Pesa withdrawal",
    });
  }

  const userId = session.user.id;
  const wallet = await getOrCreateWallet(userId, currency);

  // Ensure sufficient balance
  if (Number(wallet.balance || 0) < amount) {
    return errorResponse(ErrorCodes.INSUFFICIENT_FUNDS, {
      message: "Insufficient funds",
    });
  }

  const order_reference = nowRef("wl-wd");

  // Create withdrawal (pending)
  const ins = await sql`
    INSERT INTO wallet_withdrawals (
      wallet_id, user_id, method, destination, amount, currency, status, provider, order_reference, metadata
    ) VALUES (
      ${wallet.id},
      ${userId},
      ${method},
      ${phone},
      ${amount},
      ${currency},
      'pending',
      'lemonade',
      ${order_reference},
      '{}'::jsonb
    )
    RETURNING id
  `;
  const wdId = ins?.[0]?.id;

  // Initiate provider payout
  const action = "mpesa_transfer";
  const payload = { amount, currency, reference: order_reference };
  if (method === "mpesa") {
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
    const provider_tx_id =
      res?.data?.transaction_id || res?.data?.reference || null;

    await sql`
      UPDATE wallet_withdrawals
      SET 
        metadata = metadata || ${JSON.stringify({ provider_response: res?.data || null })}::jsonb,
        provider_tx_id = ${provider_tx_id},
        updated_at = now()
      WHERE id = ${wdId}
    `;

    // Do NOT debit balance until webhook confirms success
    return successResponse({
      withdrawal_id: wdId,
      order_reference,
      provider: res?.mode || "direct",
      provider_tx_id,
      provider_status: res?.status,
    });
  } catch (error) {
    console.error("/api/wallet/withdraw POST error", error);
    return errorResponse(ErrorCodes.PAYMENT_GATEWAY_ERROR, {
      message: "Failed to initiate withdrawal",
    });
  }
});
