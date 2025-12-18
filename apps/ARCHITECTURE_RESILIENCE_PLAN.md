# Bridge MVP v3 - Resilient Architecture Redesign

## Executive Summary

Yes, the architecture can and should be rebuilt for better resilience. The current system has some resilience features (circuit breakers, idempotency, transactions) but lacks critical patterns for production-grade reliability. This document outlines a comprehensive resilience strategy.

---

## Current Architecture Analysis

### Existing Resilience Features ✅

1. **Circuit Breaker Pattern** (Partial)
   - Relay circuit breaker in `lemonadeClient.js`
   - Opens after 3 failures in 60s, stays open for 2 minutes
   - **Gap**: Only for relay, not for direct API calls or database

2. **Idempotency**
   - Payment idempotency keys implemented
   - Database conflict handling with `ON CONFLICT DO NOTHING`
   - **Gap**: Not applied to all critical operations

3. **Database Transactions**
   - Atomic ledger updates with balance adjustments
   - **Gap**: No retry logic for transient failures

4. **Token Caching**
   - OAuth token cached with TTL
   - **Gap**: No cache invalidation on errors

5. **Rate Limiting** (Partial)
   - Some routes have rate limiting
   - **Gap**: Not consistently applied

6. **Error Handling**
   - Basic error boundaries
   - **Gap**: No structured retry with backoff

### Critical Resilience Gaps ❌

1. **No Async Processing**
   - All payment operations are synchronous
   - Blocks on external API calls (Lemonade, Stripe)
   - No queue for long-running tasks

2. **Single Point of Failure**
   - Single database connection (Neon serverless)
   - No read replicas
   - No connection pooling configuration visible

3. **No Caching Layer**
   - Every request hits database
   - No Redis/cache for frequently accessed data
   - Wallet balances, user data queried repeatedly

4. **Limited Retry Logic**
   - No exponential backoff
   - No jitter
   - Retries only in lemonadeClient (path discovery)

5. **No Health Checks**
   - No liveness/readiness probes
   - No automatic recovery
   - No dependency health monitoring

6. **No Graceful Degradation**
   - If Lemonade is down, payments fail completely
   - No fallback payment methods
   - No cached responses for read operations

7. **No Observability**
   - Basic logging but no structured metrics
   - No distributed tracing
   - No alerting system

8. **No Bulkhead Pattern**
   - All operations share same resources
   - Database connection exhaustion risk
   - No resource isolation

9. **No Timeout Configuration**
   - Database queries have no explicit timeouts
   - External API calls have 12s timeout (hardcoded)
   - No request-level timeouts

10. **No Saga Pattern**
    - Complex multi-step payments not coordinated
    - No compensation transactions for partial failures
    - Webhook processing could leave inconsistent state

---

## Proposed Resilient Architecture

### Architecture Decision: Enhanced Monolith → Event-Driven Microservices

**Phase 1 (Immediate)**: Enhance current monolith with resilience patterns
**Phase 2 (6 months)**: Migrate to event-driven microservices architecture

### Phase 1: Enhanced Monolith Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Load Balancer / CDN                        │
└──────────────────────┬────────────────────────────────────────┘
                       │
        ┌──────────────┴──────────────┐
        │                             │
   ┌────▼────┐                   ┌────▼────┐
   │  App 1  │                   │  App 2  │ (Horizontal Scale)
   └────┬────┘                   └────┬────┘
        │                             │
        └──────────────┬──────────────┘
                       │
        ┌──────────────┴──────────────┐
        │      Redis Cache Layer       │
        │  - Session cache             │
        │  - Wallet balance cache      │
        │  - Rate limit counters       │
        │  - Circuit breaker state     │
        └──────────────┬───────────────┘
                       │
        ┌──────────────┴──────────────┐
        │    Message Queue (BullMQ)   │
        │  - Payment processing       │
        │  - Webhook processing        │
        │  - Scheduled payments       │
        │  - Email/SMS notifications  │
        └──────────────┬───────────────┘
                       │
        ┌──────────────┴──────────────┐
        │   PostgreSQL (Primary)       │
        │   + Read Replicas            │
        └──────────────┬───────────────┘
                       │
        ┌──────────────┴──────────────┐
        │   External Services          │
        │   - Lemonade (with breaker)  │
        │   - Stripe (with breaker)    │
        │   - M-Pesa (with breaker)    │
        └──────────────────────────────┘
```

### Key Resilience Patterns to Implement

#### 1. **Message Queue for Async Processing**

**Problem**: Synchronous payment processing blocks requests and fails if external APIs are slow/down.

**Solution**: Use BullMQ (Redis-based) for async job processing.

```javascript
// Example: Payment Intent Processing
// Before: Synchronous
export async function POST(request) {
  const intent = await createPaymentIntent(...);
  const result = await lemonade.call(...); // Blocks here
  return Response.json(result);
}

// After: Async with Queue
export async function POST(request) {
  const intent = await createPaymentIntent(...);
  const job = await paymentQueue.add('process-payment', {
    intentId: intent.id,
    payload: body
  }, {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000
    },
    removeOnComplete: true,
    removeOnFail: false
  });
  
  return Response.json({ 
    ok: true, 
    intentId: intent.id,
    jobId: job.id,
    status: 'queued'
  });
}
```

**Benefits**:
- Non-blocking requests
- Automatic retries with backoff
- Job persistence (survives restarts)
- Priority queues for critical payments
- Rate limiting per queue

#### 2. **Circuit Breaker for All External Services**

**Current**: Only relay has circuit breaker

**Solution**: Implement circuit breaker for all external dependencies.

```javascript
// lib/resilience/circuitBreaker.js
import { CircuitBreaker } from 'opossum';

const options = {
  timeout: 3000,
  errorThresholdPercentage: 50,
  resetTimeout: 30000,
  rollingCountTimeout: 60000,
  rollingCountBuckets: 10
};

export const lemonadeBreaker = new CircuitBreaker(
  async (action, payload) => {
    return await lemonade.call({ action, payload });
  },
  options
);

lemonadeBreaker.on('open', () => {
  console.error('Lemonade circuit breaker opened');
  // Alert monitoring system
});

lemonadeBreaker.on('halfOpen', () => {
  console.log('Lemonade circuit breaker half-open, testing...');
});
```

**Usage**:
```javascript
try {
  const result = await lemonadeBreaker.fire('stk_push', payload);
  return result;
} catch (error) {
  if (error.code === 'ECIRCUITOPEN') {
    // Graceful degradation: queue for later or use fallback
    await paymentQueue.add('retry-payment', { payload });
    return { ok: false, error: 'service_unavailable', queued: true };
  }
  throw error;
}
```

#### 3. **Redis Caching Layer**

**Problem**: Repeated database queries for wallet balances, user data.

**Solution**: Multi-level caching strategy.

```javascript
// lib/cache/walletCache.js
import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL);

export async function getWalletBalance(userId, currency = 'KES') {
  const key = `wallet:${userId}:${currency}:balance`;
  
  // Try cache first
  const cached = await redis.get(key);
  if (cached !== null) {
    return { balance: Number(cached), cached: true };
  }
  
  // Cache miss - query DB
  const wallet = await getOrCreateWallet(userId, currency);
  
  // Cache with TTL (5 minutes)
  await redis.setex(key, 300, String(wallet.balance));
  
  return { balance: wallet.balance, cached: false };
}

// Invalidate on balance change
export async function invalidateWalletCache(userId, currency = 'KES') {
  const key = `wallet:${userId}:${currency}:balance`;
  await redis.del(key);
}
```

**Cache Strategy**:
- **L1 (In-memory)**: Hot data (current session, recent queries)
- **L2 (Redis)**: Frequently accessed (wallet balances, user profiles)
- **L3 (Database)**: Source of truth

#### 4. **Database Connection Pooling & Read Replicas**

**Problem**: Single database connection, no read scaling.

**Solution**: Configure connection pooling and add read replicas.

```javascript
// lib/database/pool.js
import { Pool } from '@neondatabase/serverless';

// Primary (write) pool
export const writePool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20, // Max connections
  min: 5,  // Min connections
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

// Read replica pool
export const readPool = new Pool({
  connectionString: process.env.DATABASE_READ_URL || process.env.DATABASE_URL,
  max: 50, // More read connections
  min: 10,
});

// Query router
export async function query(sql, params, { readOnly = false } = {}) {
  const pool = readOnly ? readPool : writePool;
  try {
    return await pool.query(sql, params);
  } catch (error) {
    // Fallback to write pool if read fails
    if (readOnly && error.code === 'ECONNREFUSED') {
      return await writePool.query(sql, params);
    }
    throw error;
  }
}
```

#### 5. **Retry with Exponential Backoff**

**Problem**: No retry logic for transient failures.

**Solution**: Implement retry utility with exponential backoff and jitter.

```javascript
// lib/resilience/retry.js
export async function retryWithBackoff(
  fn,
  {
    maxAttempts = 3,
    initialDelay = 1000,
    maxDelay = 10000,
    factor = 2,
    jitter = true
  } = {}
) {
  let lastError;
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      
      // Don't retry on 4xx errors (client errors)
      if (error.status >= 400 && error.status < 500) {
        throw error;
      }
      
      // Last attempt - throw error
      if (attempt === maxAttempts) {
        throw error;
      }
      
      // Calculate delay with exponential backoff
      let delay = Math.min(
        initialDelay * Math.pow(factor, attempt - 1),
        maxDelay
      );
      
      // Add jitter to prevent thundering herd
      if (jitter) {
        delay = delay * (0.5 + Math.random() * 0.5);
      }
      
      await sleep(delay);
    }
  }
  
  throw lastError;
}
```

#### 6. **Health Checks & Readiness Probes**

**Problem**: No way to know if system is healthy.

**Solution**: Implement comprehensive health checks.

```javascript
// app/api/health/route.js
export async function GET() {
  const checks = {
    database: await checkDatabase(),
    redis: await checkRedis(),
    lemonade: await checkLemonade(),
    stripe: await checkStripe(),
  };
  
  const allHealthy = Object.values(checks).every(c => c.healthy);
  
  return Response.json({
    status: allHealthy ? 'healthy' : 'degraded',
    checks,
    timestamp: new Date().toISOString()
  }, {
    status: allHealthy ? 200 : 503
  });
}

async function checkDatabase() {
  try {
    const result = await sql`SELECT 1 as health`;
    return { healthy: true, latency: Date.now() - start };
  } catch (error) {
    return { healthy: false, error: error.message };
  }
}
```

#### 7. **Graceful Degradation**

**Problem**: System fails completely if external service is down.

**Solution**: Implement fallback strategies.

```javascript
// lib/payments/paymentProcessor.js
export async function processPayment(intent) {
  // Try primary method (Lemonade)
  try {
    return await lemonadeBreaker.fire('stk_push', payload);
  } catch (error) {
    if (error.code === 'ECIRCUITOPEN') {
      // Circuit open - use fallback
      return await fallbackToStripe(intent);
    }
    throw error;
  }
}

async function fallbackToStripe(intent) {
  // Use Stripe as fallback if Lemonade is down
  try {
    return await stripeBreaker.fire('paymentIntents.create', {
      amount: intent.amount,
      currency: intent.currency
    });
  } catch (error) {
    // Both down - queue for later
    await paymentQueue.add('retry-payment', { intentId: intent.id });
    return { ok: false, error: 'all_providers_unavailable', queued: true };
  }
}
```

#### 8. **Saga Pattern for Complex Transactions**

**Problem**: Multi-step payments can fail partially, leaving inconsistent state.

**Solution**: Implement Saga pattern for orchestration.

```javascript
// lib/sagas/paymentSaga.js
export class PaymentSaga {
  async execute(intent) {
    const steps = [
      { name: 'debit_wallet', action: () => this.debitWallet(intent) },
      { name: 'call_provider', action: () => this.callProvider(intent) },
      { name: 'update_intent', action: () => this.updateIntent(intent) },
    ];
    
    const compensations = [];
    
    try {
      for (const step of steps) {
        const result = await step.action();
        compensations.unshift({
          name: step.name,
          compensate: () => this.compensate(step.name, result)
        });
      }
      return { ok: true };
    } catch (error) {
      // Compensate all completed steps
      for (const comp of compensations) {
        try {
          await comp.compensate();
        } catch (compError) {
          // Log compensation failure
          console.error(`Compensation failed for ${comp.name}`, compError);
        }
      }
      throw error;
    }
  }
  
  async compensate(stepName, result) {
    switch (stepName) {
      case 'debit_wallet':
        // Credit back the wallet
        await postLedgerAndUpdateBalance({
          walletId: result.walletId,
          entryType: 'credit',
          amount: result.amount,
          ref: `comp-${result.ref}`
        });
        break;
      // ... other compensations
    }
  }
}
```

#### 9. **Bulkhead Pattern**

**Problem**: All operations share same resources, one failure can cascade.

**Solution**: Isolate critical operations.

```javascript
// lib/resilience/bulkhead.js
import pLimit from 'p-limit';

// Separate concurrency limits for different operations
export const paymentLimiter = pLimit(10); // Max 10 concurrent payments
export const webhookLimiter = pLimit(20); // Max 20 concurrent webhooks
export const queryLimiter = pLimit(50);   // Max 50 concurrent queries

// Usage
export async function processPayment(intent) {
  return await paymentLimiter(async () => {
    // Payment processing logic
  });
}
```

#### 10. **Observability & Monitoring**

**Problem**: Limited visibility into system health.

**Solution**: Add structured logging, metrics, and tracing.

```javascript
// lib/observability/metrics.js
import { Counter, Histogram, Gauge } from 'prom-client';

export const paymentCounter = new Counter({
  name: 'payments_total',
  help: 'Total payment attempts',
  labelNames: ['status', 'provider']
});

export const paymentDuration = new Histogram({
  name: 'payment_duration_seconds',
  help: 'Payment processing duration',
  labelNames: ['provider']
});

export const activeConnections = new Gauge({
  name: 'db_connections_active',
  help: 'Active database connections'
});

// Usage
const timer = paymentDuration.startTimer({ provider: 'lemonade' });
try {
  const result = await processPayment(intent);
  paymentCounter.inc({ status: 'success', provider: 'lemonade' });
  return result;
} finally {
  timer();
}
```

---

## Phase 2: Event-Driven Microservices Architecture

### Target Architecture (6-12 months)

```
┌─────────────────────────────────────────────────────────────┐
│                    API Gateway (Kong/Tyk)                    │
│              - Rate Limiting                                 │
│              - Authentication                                │
│              - Request Routing                               │
└──────────────────────┬──────────────────────────────────────┘
                       │
        ┌──────────────┴──────────────┐
        │     Event Bus (NATS/RabbitMQ)│
        └──────────────┬───────────────┘
                       │
    ┌──────────────────┼──────────────────┐
    │                  │                  │
┌───▼───┐        ┌─────▼─────┐      ┌─────▼─────┐
│Payment│        │  Wallet   │      │  Invoice  │
│Service│        │  Service  │      │  Service  │
└───┬───┘        └─────┬─────┘      └─────┬─────┘
    │                  │                  │
    └──────────────────┼──────────────────┘
                       │
        ┌──────────────┴──────────────┐
        │    Shared Services          │
        │  - Auth Service             │
        │  - Notification Service      │
        │  - Audit Service             │
        └──────────────────────────────┘
```

### Benefits of Microservices

1. **Isolation**: Failure in one service doesn't cascade
2. **Independent Scaling**: Scale payment service separately
3. **Technology Diversity**: Use best tool for each service
4. **Team Autonomy**: Different teams own different services

### Migration Strategy

1. **Extract Payment Service** (Month 1-2)
   - Move payment logic to separate service
   - Use event bus for communication
   - Keep wallet/invoice in monolith initially

2. **Extract Wallet Service** (Month 3-4)
   - Move wallet operations
   - Implement event sourcing for audit trail

3. **Extract Invoice Service** (Month 5-6)
   - Move invoice/billing logic
   - Complete service separation

---

## Implementation Plan

### Week 1-2: Foundation
- [ ] Set up Redis for caching and queues
- [ ] Implement circuit breakers for all external services
- [ ] Add health check endpoints
- [ ] Set up connection pooling

### Week 3-4: Async Processing
- [ ] Implement BullMQ for payment processing
- [ ] Move webhook processing to queue
- [ ] Add retry logic with exponential backoff
- [ ] Implement job monitoring dashboard

### Week 5-6: Caching & Performance
- [ ] Implement Redis caching layer
- [ ] Add cache invalidation strategies
- [ ] Set up read replicas (if using managed DB)
- [ ] Optimize database queries

### Week 7-8: Resilience Patterns
- [ ] Implement Saga pattern for complex transactions
- [ ] Add bulkhead pattern for resource isolation
- [ ] Implement graceful degradation
- [ ] Add timeout configurations

### Week 9-10: Observability
- [ ] Set up structured logging
- [ ] Add Prometheus metrics
- [ ] Implement distributed tracing
- [ ] Set up alerting (PagerDuty/Opsgenie)

### Week 11-12: Testing & Documentation
- [ ] Load testing with k6 or Artillery
- [ ] Chaos engineering (Chaos Monkey)
- [ ] Document resilience patterns
- [ ] Create runbooks for common failures

---

## Configuration Examples

### Environment Variables

```bash
# Database
DATABASE_URL=postgresql://...
DATABASE_READ_URL=postgresql://... # Read replica
DATABASE_POOL_MAX=20
DATABASE_POOL_MIN=5

# Redis
REDIS_URL=redis://...
REDIS_CACHE_TTL=300

# Circuit Breakers
CIRCUIT_BREAKER_TIMEOUT=3000
CIRCUIT_BREAKER_ERROR_THRESHOLD=50
CIRCUIT_BREAKER_RESET_TIMEOUT=30000

# Retry
RETRY_MAX_ATTEMPTS=3
RETRY_INITIAL_DELAY=1000
RETRY_MAX_DELAY=10000

# Queues
QUEUE_CONCURRENCY=10
QUEUE_ATTEMPTS=3
QUEUE_BACKOFF_DELAY=2000
```

### Docker Compose for Local Development

```yaml
version: '3.8'
services:
  app:
    build: .
    environment:
      - DATABASE_URL=postgresql://postgres:postgres@db:5432/bridge
      - REDIS_URL=redis://redis:6379
    depends_on:
      - db
      - redis
  
  db:
    image: postgres:15
    environment:
      POSTGRES_DB: bridge
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
  
  redis:
    image: redis:7-alpine
    command: redis-server --appendonly yes
  
  prometheus:
    image: prom/prometheus
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
```

---

## Success Metrics

### Resilience Metrics
- **Availability**: 99.9% uptime (8.76 hours downtime/year)
- **MTTR**: Mean Time To Recovery < 5 minutes
- **Error Rate**: < 0.1% for payment operations
- **P95 Latency**: < 500ms for payment processing

### Performance Metrics
- **Throughput**: 1000 payments/second
- **Database Query Time**: P95 < 50ms
- **Cache Hit Rate**: > 80%
- **Queue Processing**: < 1 second average

### Business Metrics
- **Payment Success Rate**: > 99.5%
- **Failed Payment Recovery**: > 95% within 5 minutes
- **Customer Impact**: < 0.01% of payments affected by outages

---

## Cost Considerations

### Infrastructure Costs (Estimated Monthly)

- **Current**: ~$200-500/month
  - Neon Database: $50-200
  - Hosting: $50-200
  - External APIs: Variable

- **Enhanced (Phase 1)**: ~$500-1000/month
  - Redis (Upstash/Redis Cloud): $50-200
  - Database scaling: +$100-300
  - Monitoring (Datadog/New Relic): $100-200
  - Additional compute: +$50-100

- **Microservices (Phase 2)**: ~$1000-2000/month
  - Multiple services: +$200-500
  - Event bus: $50-100
  - Service mesh (optional): $100-200
  - Additional monitoring: +$100-200

### ROI
- **Reduced Downtime**: Saves revenue from lost transactions
- **Faster Recovery**: Reduces support costs
- **Scalability**: Handles growth without major rewrites
- **Developer Productivity**: Better observability = faster debugging

---

## Conclusion

**Yes, the architecture should be rebuilt for resilience.** The current system has basic resilience features but lacks critical patterns for production-grade reliability.

**Recommended Approach**:
1. **Immediate (Phase 1)**: Enhance monolith with resilience patterns (3 months)
2. **Medium-term (Phase 2)**: Migrate to event-driven microservices (6-12 months)

**Priority Order**:
1. Message queue for async processing (highest impact)
2. Circuit breakers for all external services
3. Redis caching layer
4. Health checks and monitoring
5. Retry logic with backoff
6. Saga pattern for complex transactions

This phased approach minimizes risk while delivering incremental value. Start with Phase 1 improvements, measure impact, then decide on Phase 2 migration based on scale and team capacity.



