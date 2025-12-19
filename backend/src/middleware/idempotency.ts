import { Request, Response, NextFunction } from "express";
import { createHash } from "crypto";
import { prisma } from "../lib/prisma";
import { AppError } from "./errorHandler";

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
    // Idempotency key is required for payment endpoints
    return next(new AppError("Idempotency-Key header is required", 400));
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

  void checkAndHandleIdempotency(
    idempotencyKey,
    userId,
    endpoint,
    requestHash,
    req,
    res,
    next
  );
}

async function checkAndHandleIdempotency(
  key: string,
  userId: string,
  endpoint: string,
  requestHash: string,
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    // Check if this exact request was already processed
    const existing = await prisma.idempotencyKey.findUnique({
      where: {
        userId_endpoint_requestHash: {
          userId,
          endpoint,
          requestHash,
        },
      },
    });

    if (existing) {
      // Request already processed, return cached response
      if (existing.response && existing.statusCode) {
        return res.status(existing.statusCode).json(existing.response);
      }
      // Request is being processed (no response yet)
      return res.status(409).json({
        error: {
          message: "Request is already being processed",
        },
      });
    }

    // Create idempotency record (marks request as "in progress")
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
    await prisma.idempotencyKey.create({
      data: {
        id: key,
        userId,
        endpoint,
        requestHash,
        expiresAt,
      },
    });

    // Intercept response to cache it
    const originalJson = res.json.bind(res);
    res.json = function (body: any) {
      // Store the response in the database
      void prisma.idempotencyKey
        .update({
          where: { id: key },
          data: {
            response: body,
            statusCode: res.statusCode,
          },
        })
        .catch((err) => {
          console.error("Failed to cache idempotency response:", err);
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
  await prisma.idempotencyKey.deleteMany({
    where: {
      expiresAt: {
        lt: new Date(),
      },
    },
  });
}
