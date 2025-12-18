# Circuit Breakers Documentation

Documentation for the circuit breaker pattern implementation to prevent cascading failures.

## Overview

Circuit breakers protect the system from cascading failures when external services are down or slow. They automatically "open" (stop making requests) when failure rates exceed thresholds, and "close" (resume requests) when services recover.

## Architecture

```
API Request
    ↓
Circuit Breaker Check
    ├── CLOSED: Execute request
    ├── OPEN: Return error immediately
    └── HALF_OPEN: Test with single request
    ↓
External Service
    ├── Success: Update stats, close if half-open
    └── Failure: Update stats, open if threshold exceeded
```

## Circuit Breaker States

### CLOSED (Normal Operation)
- Requests pass through normally
- Failures are tracked
- Opens if error threshold exceeded

### OPEN (Service Down)
- Requests are rejected immediately
- No external calls made
- Automatically transitions to HALF_OPEN after reset timeout

### HALF_OPEN (Testing Recovery)
- Single test request allowed
- Success → CLOSED
- Failure → OPEN

## Implemented Circuit Breakers

### Lemonade API Circuit Breaker

**Configuration**:
- **Timeout**: 12 seconds
- **Error Threshold**: 40% (opens after 40% failures)
- **Reset Timeout**: 30 seconds
- **Rolling Window**: 60 seconds

**Usage**:
```javascript
import { lemonadeBreaker } from '@/lib/resilience/circuitBreaker';

try {
  const result = await lemonadeBreaker.fire('stk_push', payload);
  // Process result
} catch (error) {
  if (error.code === 'ECIRCUITOPEN') {
    // Circuit is open - service unavailable
    return { ok: false, error: 'service_unavailable' };
  }
  throw error;
}
```

### Stripe API Circuit Breaker

**Configuration**:
- **Timeout**: 10 seconds
- **Error Threshold**: 50%
- **Reset Timeout**: 30 seconds
- **Rolling Window**: 60 seconds

**Usage**:
```javascript
import { stripeBreaker } from '@/lib/resilience/circuitBreaker';

try {
  const result = await stripeBreaker.fire('paymentIntents.create', {
    amount: 1000,
    currency: 'usd',
  });
} catch (error) {
  if (error.code === 'ECIRCUITOPEN') {
    // Fallback to alternative payment method
  }
}
```

### Database Circuit Breaker

**Configuration**:
- **Timeout**: 5 seconds
- **Error Threshold**: 30% (very sensitive)
- **Reset Timeout**: 30 seconds
- **Rolling Window**: 60 seconds

**Usage**:
```javascript
import { databaseBreaker } from '@/lib/resilience/circuitBreaker';
import sql from '@/app/api/utils/sql';

try {
  const result = await databaseBreaker.fire(async () => {
    return await sql`SELECT * FROM users WHERE id = ${userId}`;
  });
} catch (error) {
  if (error.code === 'ECIRCUITOPEN') {
    // Database unavailable - use cached data or return error
  }
}
```

## Monitoring

### Get Circuit Breaker Status

**Endpoint**: `GET /api/admin/circuit-breakers` (admin only)

**Response**:
```json
{
  "ok": true,
  "circuit_breakers": {
    "lemonade": {
      "state": "CLOSED",
      "isOpen": false,
      "isHalfOpen": false,
      "isClosed": true,
      "stats": {
        "fires": 1000,
        "successes": 950,
        "failures": 50,
        "timeouts": 5,
        "rejections": 10
      }
    },
    "stripe": {
      "state": "OPEN",
      "isOpen": true,
      "isHalfOpen": false,
      "isClosed": false,
      "stats": {
        "fires": 500,
        "successes": 400,
        "failures": 100,
        "timeouts": 0,
        "rejections": 50
      }
    },
    "database": {
      "state": "CLOSED",
      "isOpen": false,
      "isHalfOpen": false,
      "isClosed": true,
      "stats": {
        "fires": 5000,
        "successes": 4950,
        "failures": 50,
        "timeouts": 0,
        "rejections": 0
      }
    },
    "timestamp": "2024-01-01T00:00:00Z"
  }
}
```

## Integration with Existing Code

### Lemonade Client

The Lemonade client already has basic relay breaker logic. The opossum circuit breaker provides:
- More sophisticated state management
- Better statistics tracking
- Standardized error handling

**Current Implementation**:
```javascript
// In lemonadeClient.js
const res = await lemonade.call({
  action: 'stk_push',
  payload: lemonPayload,
  mode: 'relay',
});
```

**With Circuit Breaker** (recommended for new code):
```javascript
import { lemonadeBreaker } from '@/lib/resilience/circuitBreaker';
import lemonade from './lemonadeClient';

try {
  const result = await lemonadeBreaker.fire('stk_push', {
    payload: lemonPayload,
    mode: 'relay',
  });
  // Process result
} catch (error) {
  if (error.code === 'ECIRCUITOPEN') {
    // Handle circuit open - maybe queue for retry
  }
}
```

### Payment Queue Integration

Circuit breakers are already integrated into the payment queue:

```javascript
// In lib/queue/paymentQueue.js
const { lemonadeBreaker } = await import('@/lib/resilience/circuitBreaker');
const { retryWithBackoff } = await import('@/lib/resilience/retry');

const result = await retryWithBackoff(
  async () => {
    return await lemonadeBreaker.fire(action || 'stk_push', payload);
  },
  { maxAttempts: 3, initialDelay: 2000 }
);
```

## Best Practices

### 1. Graceful Degradation

When circuit is open, provide fallback behavior:

```javascript
try {
  return await lemonadeBreaker.fire('stk_push', payload);
} catch (error) {
  if (error.code === 'ECIRCUITOPEN') {
    // Option 1: Queue for later processing
    await paymentQueue.add('process-payment', { intentId, payload });
    return { ok: true, queued: true, message: 'Payment queued' };
    
    // Option 2: Use alternative payment method
    return await stripeBreaker.fire('paymentIntents.create', { ... });
    
    // Option 3: Return user-friendly error
    return { ok: false, error: 'payment_service_unavailable' };
  }
  throw error;
}
```

### 2. Error Handling

Always check for circuit breaker errors:

```javascript
try {
  const result = await breaker.fire(...);
} catch (error) {
  if (error.code === 'ECIRCUITOPEN') {
    // Circuit is open
  } else if (error.code === 'ETIMEDOUT') {
    // Timeout
  } else {
    // Other error
  }
}
```

### 3. Monitoring

Monitor circuit breaker states:
- Set up alerts when circuits open
- Track failure rates
- Monitor recovery times

### 4. Configuration

Adjust thresholds based on service characteristics:
- **Sensitive services** (database): Lower threshold (30%)
- **Payment services** (Lemonade): Medium threshold (40%)
- **General services** (Stripe): Standard threshold (50%)

## Configuration

### Environment Variables

No additional environment variables required. Circuit breakers use default configurations that can be adjusted in code.

### Custom Configuration

Modify in `lib/resilience/circuitBreaker.js`:

```javascript
export const customBreaker = createCircuitBreaker(
  async (params) => {
    // Your function
  },
  {
    name: 'custom-service',
    timeout: 5000,
    errorThresholdPercentage: 50,
    resetTimeout: 30000,
    rollingCountTimeout: 60000,
    rollingCountBuckets: 10,
  }
);
```

## Troubleshooting

### Circuit Stuck Open

If circuit stays open too long:
1. Check external service status
2. Verify network connectivity
3. Review error logs
4. Manually reset (restart server)

### High Failure Rate

If failures are high but service is working:
1. Check timeout values (may be too low)
2. Review error threshold (may be too sensitive)
3. Check for network issues
4. Verify service health

### Circuit Not Opening

If circuit doesn't open when service is down:
1. Check error threshold (may be too high)
2. Verify errors are being counted
3. Check rolling window configuration
4. Review error handling logic

## Future Enhancements

- **Metrics Export**: Export circuit breaker metrics to Prometheus
- **Auto-scaling**: Adjust thresholds based on load
- **Multi-region**: Circuit breakers per region
- **Custom Fallbacks**: Configurable fallback strategies
- **Dashboard**: Real-time circuit breaker dashboard

---

**Last Updated**: 2024-01-01

