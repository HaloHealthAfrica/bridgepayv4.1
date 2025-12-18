/**
 * Payment Processing Queue
 * Handles async payment processing with retries and priority
 */

import { Queue, Worker } from 'bullmq';
import { connection } from './redis.js';

// Payment queue
export const paymentQueue = new Queue('payments', {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
    removeOnComplete: {
      age: 24 * 3600, // Keep completed jobs for 24 hours
      count: 1000, // Keep last 1000 jobs
    },
    removeOnFail: {
      age: 7 * 24 * 3600, // Keep failed jobs for 7 days
    },
  },
});

// Payment worker
export const paymentWorker = new Worker(
  'payments',
  async (job) => {
    const { intentId, payload, action } = job.data;

    console.log(`[Payment Queue] Processing job ${job.id} for intent ${intentId}`);

    // Import here to avoid circular dependencies
    // Use relative paths since this file is outside the web app directory
    const lemonade = await import('../../web/src/app/api/utils/lemonadeClient.js');
    const sql = await import('../../web/src/app/api/utils/sql.js');
    const { lemonadeBreaker } = await import('../../web/src/lib/resilience/circuitBreaker.js');
    const { retryWithBackoff } = await import('../resilience/retry.js');

    try {
      // Process payment with retry and circuit breaker
      const result = await retryWithBackoff(
        async () => {
          return await lemonadeBreaker.fire(action || 'stk_push', payload);
        },
        {
          maxAttempts: 3,
          initialDelay: 2000,
        }
      );

      // Update payment intent status
      if (result.ok) {
        await sql.default(
          `UPDATE payment_intents 
           SET status = 'completed', 
               provider_response = $1::jsonb,
               updated_at = NOW()
           WHERE id = $2`,
          [JSON.stringify(result), intentId]
        );
      } else {
        await sql.default(
          `UPDATE payment_intents 
           SET status = 'failed', 
               error_message = $1,
               updated_at = NOW()
           WHERE id = $2`,
          [result.error || 'Payment failed', intentId]
        );
      }

      return { ok: true, result };
    } catch (error) {
      // Update payment intent with error
      const sql = await import('../../web/src/app/api/utils/sql.js');
      await sql.default(
        `UPDATE payment_intents 
         SET status = 'failed', 
             error_message = $1,
             updated_at = NOW()
         WHERE id = $2`,
        [error.message, intentId]
      );

      throw error;
    }
  },
  {
    connection,
    concurrency: 10, // Process 10 payments concurrently
    limiter: {
      max: 100, // Max 100 jobs
      duration: 1000, // Per second
    },
  }
);

// Event handlers
paymentWorker.on('completed', (job) => {
  console.log(`[Payment Queue] Job ${job.id} completed`);
});

paymentWorker.on('failed', (job, err) => {
  console.error(`[Payment Queue] Job ${job.id} failed:`, err.message);
});

paymentWorker.on('error', (err) => {
  console.error('[Payment Queue] Worker error:', err);
});

/**
 * Add payment to queue
 */
export async function queuePayment(intentId, payload, options = {}) {
  const { priority = 0, delay = 0 } = options;

  const job = await paymentQueue.add(
    'process-payment',
    {
      intentId,
      payload,
      action: payload.action || 'stk_push',
    },
    {
      priority, // Higher priority = processed first
      delay, // Delay in ms before processing
      jobId: `payment-${intentId}`, // Ensure idempotency
    }
  );

  return job;
}

/**
 * Get queue status
 */
export async function getQueueStatus() {
  const [waiting, active, completed, failed, delayed] = await Promise.all([
    paymentQueue.getWaitingCount(),
    paymentQueue.getActiveCount(),
    paymentQueue.getCompletedCount(),
    paymentQueue.getFailedCount(),
    paymentQueue.getDelayedCount(),
  ]);

  return {
    waiting,
    active,
    completed,
    failed,
    delayed,
    total: waiting + active + completed + failed + delayed,
  };
}

/**
 * Clean up on shutdown
 */
export async function closeQueues() {
  await paymentWorker.close();
  await paymentQueue.close();
  await connection.quit();
}



