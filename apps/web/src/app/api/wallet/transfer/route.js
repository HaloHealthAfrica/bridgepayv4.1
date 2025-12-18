import sql from "@/app/api/utils/sql";
import {
  getOrCreateWallet,
  postLedgerAndUpdateBalance,
  nowRef,
} from "../_helpers";
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

const transferSchema = yup.object({
  amount: CommonSchemas.amount,
  recipient_user_id: yup.string().uuid().nullable().default(null),
  recipient_email: yup.string().email().nullable().default(null),
  narration: yup.string().max(500).default("P2P transfer"),
  currency: CommonSchemas.currency,
  client_ref: yup.string().nullable().default(null),
});

/**
 * POST /api/wallet/transfer
 * Transfer funds between wallets
 * Body: { amount, recipient_user_id?, recipient_email?, narration?, currency? }
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
    validated = await transferSchema.validate(body, {
      abortEarly: false,
      stripUnknown: true,
    });
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
  const currency = normalizeCurrency(validated.currency);

  if (!validated.recipient_user_id && !validated.recipient_email) {
    return errorResponse(ErrorCodes.MISSING_FIELDS, {
      message: "Either recipient_user_id or recipient_email is required",
    });
  }

  // Resolve recipient
  let toUserId = validated.recipient_user_id;
  if (!toUserId && validated.recipient_email) {
    const r = await sql`
      SELECT id FROM auth_users WHERE LOWER(email) = LOWER(${validated.recipient_email}) LIMIT 1
    `;
    toUserId = r?.[0]?.id || null;
  }
  if (!toUserId) {
    return errorResponse(ErrorCodes.NOT_FOUND, {
      message: "Recipient not found",
    });
  }

  const fromUserId = session.user.id;
  if (Number(toUserId) === Number(fromUserId)) {
    return errorResponse(ErrorCodes.INVALID_INPUT, {
      message: "Cannot send to yourself",
    });
  }

  const sender = await getOrCreateWallet(fromUserId, currency);
  const receiver = await getOrCreateWallet(toUserId, currency);

  if (Number(sender.balance || 0) < amount) {
    return errorResponse(ErrorCodes.INSUFFICIENT_FUNDS, {
      message: "Insufficient funds",
    });
  }

  const ref = validated.client_ref || nowRef("wl-p2p");

  // Perform double-entry in one transaction
  try {
    const res = await sql.transaction((txn) => [
      txn`
        WITH ins AS (
          INSERT INTO wallet_ledger (
            wallet_id, counterparty_wallet_id, entry_type, amount, currency, status, ref, narration, metadata, created_at
          )
          VALUES (
            ${sender.id}, ${receiver.id}, 'debit', ${amount}, ${currency}, 'posted', ${ref}, ${validated.narration}, ${JSON.stringify({ type: "p2p", direction: "out" })}::jsonb, now()
          )
          ON CONFLICT (ref) DO NOTHING
          RETURNING id
        ), upd AS (
          UPDATE wallets SET balance = balance - ${amount}, updated_at = now() WHERE id = ${sender.id}
          RETURNING balance
        )
        SELECT (SELECT id FROM ins) AS ledger_id, (SELECT balance FROM upd) AS balance_after
      `,
      txn`
        WITH ins AS (
          INSERT INTO wallet_ledger (
            wallet_id, counterparty_wallet_id, entry_type, amount, currency, status, ref, narration, metadata, created_at
          )
          VALUES (
            ${receiver.id}, ${sender.id}, 'credit', ${amount}, ${currency}, 'posted', ${ref}, ${validated.narration}, ${JSON.stringify({ type: "p2p", direction: "in" })}::jsonb, now()
          )
          ON CONFLICT (ref) DO NOTHING
          RETURNING id
        ), upd AS (
          UPDATE wallets SET balance = balance + ${amount}, updated_at = now() WHERE id = ${receiver.id}
          RETURNING balance
        )
        SELECT (SELECT id FROM ins) AS ledger_id, (SELECT balance FROM upd) AS balance_after
      `,
    ]);

    const debited = res?.[0]?.[0]?.ledger_id;
    const credited = res?.[1]?.[0]?.ledger_id;

    if (!debited || !credited) {
      // idempotency: if ref already used, return ok
      const exists = await sql`
        SELECT id FROM wallet_ledger WHERE ref = ${ref} LIMIT 1
      `;
      if (exists && exists[0]) {
        return successResponse({ ref, idempotent: true });
      }
      return errorResponse(ErrorCodes.SERVER_ERROR, {
        message: "Transfer failed",
      });
    }

    return successResponse({
      ref,
      amount,
      currency,
      sender_wallet_id: sender.id,
      receiver_wallet_id: receiver.id,
    });
  } catch (error) {
    console.error("/api/wallet/transfer POST error", error);
    return errorResponse(ErrorCodes.SERVER_ERROR, {
      message: "Transfer failed",
    });
  }
});
