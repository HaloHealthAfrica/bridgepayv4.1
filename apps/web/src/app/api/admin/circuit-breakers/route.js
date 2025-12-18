/**
 * Circuit Breaker Status Endpoint
 * Returns status of all circuit breakers (admin only)
 */

import { getCircuitBreakerStatus } from "@/lib/resilience/circuitBreaker.js";
import {
  successResponse,
  withErrorHandling,
} from "@/app/api/utils/errorHandler";
import { ensureAdmin } from "@/app/api/middleware/roleGuard";

/**
 * GET /api/admin/circuit-breakers
 * Get status of all circuit breakers (admin only)
 */
export const GET = withErrorHandling(async (request) => {
  const guard = await ensureAdmin(request);
  if (!guard.ok) {
    return guard.response;
  }

  // Get circuit breaker status
  const status = getCircuitBreakerStatus();

  // Format response with human-readable state
  const formatted = {
    lemonade: {
      state: status.lemonade.state,
      isOpen: status.lemonade.state === 'OPEN',
      isHalfOpen: status.lemonade.state === 'HALF_OPEN',
      isClosed: status.lemonade.state === 'CLOSED',
      stats: {
        fires: status.lemonade.stats.fires || 0,
        cacheHits: status.lemonade.stats.cacheHits || 0,
        cacheMisses: status.lemonade.stats.cacheMisses || 0,
        failures: status.lemonade.stats.failures || 0,
        timeouts: status.lemonade.stats.timeouts || 0,
        rejections: status.lemonade.stats.rejections || 0,
        successes: status.lemonade.stats.successes || 0,
        semaphoreRejections: status.lemonade.stats.semaphoreRejections || 0,
      },
    },
    stripe: {
      state: status.stripe.state,
      isOpen: status.stripe.state === 'OPEN',
      isHalfOpen: status.stripe.state === 'HALF_OPEN',
      isClosed: status.stripe.state === 'CLOSED',
      stats: {
        fires: status.stripe.stats.fires || 0,
        cacheHits: status.stripe.stats.cacheHits || 0,
        cacheMisses: status.stripe.stats.cacheMisses || 0,
        failures: status.stripe.stats.failures || 0,
        timeouts: status.stripe.stats.timeouts || 0,
        rejections: status.stripe.stats.rejections || 0,
        successes: status.stripe.stats.successes || 0,
        semaphoreRejections: status.stripe.stats.semaphoreRejections || 0,
      },
    },
    database: {
      state: status.database.state,
      isOpen: status.database.state === 'OPEN',
      isHalfOpen: status.database.state === 'HALF_OPEN',
      isClosed: status.database.state === 'CLOSED',
      stats: {
        fires: status.database.stats.fires || 0,
        cacheHits: status.database.stats.cacheHits || 0,
        cacheMisses: status.database.stats.cacheMisses || 0,
        failures: status.database.stats.failures || 0,
        timeouts: status.database.stats.timeouts || 0,
        rejections: status.database.stats.rejections || 0,
        successes: status.database.stats.successes || 0,
        semaphoreRejections: status.database.stats.semaphoreRejections || 0,
      },
    },
    timestamp: new Date().toISOString(),
  };

  return successResponse({ circuit_breakers: formatted });
});

