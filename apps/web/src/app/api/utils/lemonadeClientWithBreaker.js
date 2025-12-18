/**
 * Lemonade Client with Circuit Breaker
 * Wrapper around lemonadeClient that uses circuit breaker
 */

import { lemonadeBreaker } from '../../../../lib/resilience/circuitBreaker.js';
import lemonadeClient from './lemonadeClient.js';

/**
 * Call Lemonade API with circuit breaker protection
 */
export async function callWithBreaker(options) {
  const { action, payload, mode, correlationId, idempotencyKey } = options;

  try {
    // Use circuit breaker to call Lemonade
    const result = await lemonadeBreaker.fire(action, {
      payload,
      mode,
      correlationId,
      idempotencyKey,
    });

    // The breaker wraps the actual call, so we need to call the client
    // But we've already wrapped it in the breaker, so we need to adjust
    return await lemonadeClient.call(options);
  } catch (error) {
    // Circuit breaker errors
    if (error.code === 'ECIRCUITOPEN' || error.message?.includes('circuit is open')) {
      return {
        ok: false,
        error: 'circuit_breaker_open',
        message: 'Lemonade service is temporarily unavailable',
        mode: mode || 'auto',
        circuitBreakerOpen: true,
      };
    }

    // Other errors
    throw error;
  }
}

// Export default for compatibility
export default {
  call: callWithBreaker,
};

