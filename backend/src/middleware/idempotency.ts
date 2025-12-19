import { Request, Response, NextFunction } from "express";
import { createHash } from "crypto";
import { AppError } from "./errorHandler";

type CachedResponse = {
  statusCode?: number;
  response?: any;
  expiresAt: number;
  inProgress: boolean;
};

// Best-effort in-memory idempotency cache (single-instance).
// If you need cross-instance idempotency, back this with Redis or a DB table.
const cache = new Map<string, CachedResponse>();

// Extend Express Request to include idempotency key
declare global {
  namespace Express {
    interface Request {
      idempotencyKey?: string;
    }
  }
}

/**
 * Idempotency middleware to prevent duplicate payment processing
 *
 * Usage:
 * - Client sends header: Idempotency-Key: <unique-uuid>
 * - If request with same key + userId + endpoint already processed, return cached response
 * - If request is new, process it and cache the response
 * - Keys expire after 24 hours
 */
export function idempotencyMiddleware(req: Request, res: Response, next: NextFunction) {
  const idempotencyKey = req.headers["idempotency-key"] as string;

  if (!idempotencyKey) {
    // Optional: if client doesn't send a key, proceed without idempotency guarantees.
    return next();
  }

  // Validate key format (should be UUID or similar unique string)
  if (idempotencyKey.length < 10 || idempotencyKey.length > 100) {
    return next(new AppError("Invalid Idempotency-Key format", 400));
  }

  req.idempotencyKey = idempotencyKey;

  // Check if this request was already processed
  const userId = (req as any).user?.userId || "anonymous";
  const endpoint = req.path;
  const requestHash = createHash("sha256")
    .update(JSON.stringify(req.body))
    .digest("hex");

  void checkAndHandleIdempotency(idempotencyKey, userId, endpoint, requestHash, res, next);
}

async function checkAndHandleIdempotency(
  key: string,
  userId: string,
  endpoint: string,
  requestHash: string,
  res: Response,
  next: NextFunction
) {
  try {
    const now = Date.now();
    // Cleanup opportunistically
    for (const [k, v] of cache.entries()) {
      if (v.expiresAt <= now) cache.delete(k);
    }

    const dedupeKey = `${userId}:${endpoint}:${requestHash}`;
    const existing = cache.get(dedupeKey);

    if (existing) {
      if (existing.inProgress) {
        return res.status(409).json({ error: { message: "Request is already being processed" } });
      }
      if (typeof existing.statusCode === "number") {
        return res.status(existing.statusCode).json(existing.response);
      }
    }

    cache.set(dedupeKey, { inProgress: true, expiresAt: now + 24 * 60 * 60 * 1000 });

    // Intercept response to cache it
    const originalJson = res.json.bind(res);
    res.json = function (body: any) {
      const now = Date.now();
      const dedupeKey = `${userId}:${endpoint}:${requestHash}`;
      cache.set(dedupeKey, {
        inProgress: false,
        expiresAt: now + 24 * 60 * 60 * 1000,
        statusCode: res.statusCode,
        response: body,
      });

      return originalJson(body);
    };

    next();
  } catch (error) {
    console.error("Idempotency middleware error:", error);
    // On error, continue without idempotency protection (fail open)
    next();
  }
}

/**
 * Cleanup function to remove expired idempotency keys
 * Should be called periodically (e.g., via cron job)
 */
export async function cleanupExpiredIdempotencyKeys() {
  const now = Date.now();
  for (const [k, v] of cache.entries()) {
    if (v.expiresAt <= now) cache.delete(k);
  }
}
