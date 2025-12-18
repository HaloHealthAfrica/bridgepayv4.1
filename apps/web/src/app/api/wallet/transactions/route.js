import { auth } from "@/auth";
import { listUserLedger } from "../_helpers";
import {
  errorResponse,
  successResponse,
  ErrorCodes,
  withErrorHandling,
} from "@/app/api/utils/errorHandler";
import { parsePaginationParams, createPaginationResponse } from "@/app/api/utils/pagination";

/**
 * GET /api/wallet/transactions
 * Get wallet transaction history
 * Query params: limit (default: 20), cursor (optional), currency (optional)
 */
export const GET = withErrorHandling(async (request) => {
  const session = await auth();
  if (!session?.user?.id) {
    return errorResponse(ErrorCodes.UNAUTHORIZED);
  }

  const { limit, cursor } = parsePaginationParams(new URL(request.url).searchParams);
  const { searchParams } = new URL(request.url);
  const currency = searchParams.get("currency") || null; // Optional currency filter

  const rows = await listUserLedger({
    userId: session.user.id,
    limit: limit + 1, // Fetch one extra to check if there are more
    cursor,
    currency,
  });

  const hasMore = rows.length > limit;
  const items = (hasMore ? rows.slice(0, limit) : rows).map((r) => ({
    id: r.id,
    type: r.entry_type === "credit" ? "credit" : "debit",
    amount: Number(r.amount || 0),
    currency: r.currency,
    status: r.status,
    title:
      r.narration ||
      (r.entry_type === "credit" ? "Wallet credit" : "Wallet debit"),
    counterparty: r.counterparty_wallet_id ? "Bridge user" : undefined,
    time: new Date(r.created_at).toISOString(),
    external_ref: r.external_ref || null,
    ref: r.ref,
  }));

  const nextCursor = hasMore && items.length > 0 ? items[items.length - 1].time : null;

  return successResponse(createPaginationResponse(items, nextCursor, hasMore, limit));
});
