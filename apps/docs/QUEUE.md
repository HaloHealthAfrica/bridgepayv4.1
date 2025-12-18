# Message Queue Documentation

Documentation for the async message queue system using BullMQ.

## Overview

The message queue system processes payments and webhooks asynchronously, providing:
- **Non-blocking requests** - API returns immediately
- **Automatic retries** - Failed jobs retry with exponential backoff
- **Priority queues** - Critical payments processed first
- **Job persistence** - Jobs survive server restarts
- **Rate limiting** - Prevents overwhelming external APIs

## Architecture

```
API Request
    ↓
Create Payment Intent
    ↓
Add to Queue (returns immediately)
    ↓
Worker Processes Job
    ├── Retry on failure
    ├── Circuit breaker protection
    └── Update database
```

## Queues

### Payment Queue

Processes payment intents asynchronously.

**Queue Name**: `payments`

**Configuration**:
- **Concurrency**: 10 jobs simultaneously
- **Rate Limit**: 100 jobs per second
- **Retries**: 3 attempts with exponential backoff
- **Job Retention**: 24 hours (completed), 7 days (failed)

**Job Data**:
```javascript
{
  intentId: "uuid",
  payload: {
    action: "stk_push",
    amount: 1000.00,
    phone_number: "+254712345678",
    // ... other payment data
  },
  action: "stk_push"
}
```

### Webhook Queue

Processes incoming webhooks asynchronously.

**Queue Name**: `webhooks`

**Configuration**:
- **Concurrency**: 20 jobs simultaneously
- **Rate Limit**: 200 jobs per second
- **Retries**: 5 attempts with exponential backoff
- **Job Retention**: 24 hours (completed), 7 days (failed)

**Job Data**:
```javascript
{
  webhookType: "wallet" | "lemonade",
  payload: {
    body: { /* webhook body */ },
    headers: { /* webhook headers */ }
  },
  endpoint: "webhook-url"
}
```

## Usage

### Queueing a Payment

```javascript
import { getPaymentQueue } from "@/app/api/utils/queue";

// In your route handler
const { queuePayment } = await getPaymentQueue();

const job = await queuePayment(intentId, payload, {
  priority: 10, // Higher = processed first
  delay: 0, // Delay in milliseconds
});

// Returns immediately
return Response.json({
  ok: true,
  job_id: job.id,
  intent_id: intentId,
  status: "queued"
});
```

### Queueing a Webhook

```javascript
import { getWebhookQueue } from "@/app/api/utils/queue";

const { queueWebhook } = await getWebhookQueue();

const job = await queueWebhook("wallet", {
  body: webhookBody,
  headers: webhookHeaders,
}, {
  priority: 5,
  delay: 1000, // Process after 1 second
});
```

### Getting Queue Status

```javascript
import { getQueueStatus } from "@/app/api/utils/queue";

const status = await getQueueStatus();

// Returns:
{
  payments: {
    waiting: 5,
    active: 2,
    completed: 100,
    failed: 3,
    delayed: 1,
    total: 111
  },
  webhooks: {
    waiting: 10,
    active: 3,
    completed: 500,
    failed: 2,
    delayed: 0,
    total: 515
  }
}
```

## API Endpoints

### POST `/api/payments/intent/queue`

Queue a payment intent for async processing.

**Request**:
```json
{
  "intent_id": "uuid",
  "payload": {
    "action": "stk_push",
    "amount": 1000.00,
    "phone_number": "+254712345678"
  },
  "priority": 10,
  "delay": 0
}
```

**Response**:
```json
{
  "ok": true,
  "job_id": "payment-uuid-123",
  "intent_id": "uuid",
  "status": "queued",
  "queued_at": "2024-01-01T00:00:00Z"
}
```

### GET `/api/queue/status`

Get status of all queues (admin only).

**Response**:
```json
{
  "ok": true,
  "queues": {
    "payments": {
      "waiting": 5,
      "active": 2,
      "completed": 100,
      "failed": 3,
      "delayed": 1,
      "total": 111
    },
    "webhooks": {
      "waiting": 10,
      "active": 3,
      "completed": 500,
      "failed": 2,
      "delayed": 0,
      "total": 515
    }
  },
  "timestamp": "2024-01-01T00:00:00Z"
}
```

## Worker Setup

Workers are automatically started when the server starts. They run in the background and process jobs from the queues.

### Manual Worker Control

```javascript
// Start workers (automatic on server start)
import { paymentWorker, webhookWorker } from '@/lib/queue';

// Workers are already running, but you can check status:
console.log('Payment worker:', paymentWorker.isRunning());
console.log('Webhook worker:', webhookWorker.isRunning());

// Close workers (on shutdown)
import { closeQueues } from '@/lib/queue/paymentQueue';
await closeQueues();
```

## Job States

Jobs progress through these states:

1. **Waiting** - Queued, waiting to be processed
2. **Active** - Currently being processed
3. **Completed** - Successfully processed
4. **Failed** - Failed after all retries
5. **Delayed** - Scheduled for future processing

## Retry Logic

### Payment Queue

- **Attempts**: 3
- **Backoff**: Exponential (2s, 4s, 8s)
- **Jitter**: Yes (prevents thundering herd)

### Webhook Queue

- **Attempts**: 5
- **Backoff**: Exponential (3s, 6s, 12s, 24s, 48s)
- **Jitter**: Yes

## Monitoring

### Queue Metrics

Monitor queue health via `/api/queue/status`:

- **High waiting count** - Workers may be overloaded
- **High failed count** - Check error logs
- **High delayed count** - Jobs scheduled for future

### Job Monitoring

Check individual job status:

```javascript
import { paymentQueue } from '@/lib/queue/paymentQueue';

const job = await paymentQueue.getJob(jobId);
console.log('Job status:', await job.getState());
console.log('Job data:', job.data);
console.log('Job progress:', job.progress);
```

## Error Handling

### Job Failures

Failed jobs are:
1. Retried automatically (up to max attempts)
2. Logged with error details
3. Stored for 7 days for debugging

### Worker Errors

Worker errors are logged and the worker continues processing other jobs.

## Best Practices

1. **Use queues for long-running operations** - Payments, webhooks, notifications
2. **Set appropriate priorities** - Critical payments should have higher priority
3. **Monitor queue status** - Check `/api/queue/status` regularly
4. **Handle job failures** - Implement retry logic in job handlers
5. **Use idempotency keys** - Prevent duplicate processing

## Configuration

### Environment Variables

```env
# Redis connection (required for queues)
REDIS_URL=redis://localhost:6379

# Or with authentication
REDIS_URL=redis://:password@localhost:6379
```

### Queue Options

Configure in `lib/queue/paymentQueue.js` and `lib/queue/webhookQueue.js`:

```javascript
{
  concurrency: 10, // Jobs processed simultaneously
  limiter: {
    max: 100, // Max jobs
    duration: 1000, // Per second
  },
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
  },
}
```

## Troubleshooting

### Jobs Not Processing

1. Check Redis connection: `redis-cli ping`
2. Verify workers are running
3. Check worker logs for errors

### High Failure Rate

1. Check external API status
2. Review error logs
3. Verify circuit breaker status
4. Check rate limits

### Queue Backlog

1. Increase worker concurrency
2. Add more worker instances
3. Check for stuck jobs
4. Review rate limiting settings

## Future Enhancements

- **Queue Dashboard** - Web UI for monitoring
- **Job Scheduling** - Schedule jobs for specific times
- **Dead Letter Queue** - Store permanently failed jobs
- **Job Priorities** - More granular priority levels
- **Batch Processing** - Process multiple jobs together

---

**Last Updated**: 2024-01-01

