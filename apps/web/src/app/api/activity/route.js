import { auth } from "@/auth";
import { listUserLedger } from "../wallet/_helpers";
import {
  errorResponse,
  successResponse,
  ErrorCodes,
  withErrorHandling,
} from "@/app/api/utils/errorHandler";

/**
 * GET /api/activity
 * Get recent wallet activity for authenticated user
 * Query params: limit (default: 20), filter (all|sent|received)
 */
export const GET = withErrorHandling(async (request) => {
  const session = await auth();
  if (!session?.user?.id) {
    return errorResponse(ErrorCodes.UNAUTHORIZED);
  }

  const { searchParams } = new URL(request.url);
  const limit = Number(searchParams.get("limit") || 20);
  const filter = searchParams.get("filter") || "all";

  // Validate limit
  if (limit < 1 || limit > 100) {
    return errorResponse(ErrorCodes.INVALID_INPUT, {
      message: "Limit must be between 1 and 100",
    });
  }

  // Validate filter
  const validFilters = ["all", "sent", "received"];
  if (!validFilters.includes(filter)) {
    return errorResponse(ErrorCodes.INVALID_INPUT, {
      message: `Filter must be one of: ${validFilters.join(", ")}`,
    });
  }

  const rows = await listUserLedger({ userId: session.user.id, limit });
  
  const items = rows
    .filter((r) => {
      if (filter === "sent") return r.entry_type === "debit";
      if (filter === "received") return r.entry_type === "credit";
      return true;
    })
    .map((r) => ({
      id: r.id,
      type: r.entry_type,
      amount: Number(r.amount || 0),
      currency: r.currency,
      status: r.status,
      title:
        r.narration ||
        (r.entry_type === "credit" ? "Wallet credit" : "Wallet debit"),
      counterparty: r.counterparty_wallet_id ? "Bridge user" : undefined,
      time: new Date(r.created_at).toISOString(),
    }));

  return successResponse({ items });
});
