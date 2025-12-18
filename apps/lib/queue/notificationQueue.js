/**
 * Notification Queue
 * Handles asynchronous email and SMS notifications
 */

import { Queue, Worker } from 'bullmq';
import { connection } from './redis.js';

// Notification queue
export const notificationQueue = new Queue('notifications', {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
    removeOnComplete: {
      age: 24 * 3600, // Keep completed jobs for 24 hours
    },
    removeOnFail: {
      age: 7 * 24 * 3600, // Keep failed jobs for 7 days
    },
  },
});

// Notification worker
export const notificationWorker = new Worker(
  'notifications',
  async (job) => {
    const { type, payload } = job.data;

    console.log(`[Notification Queue] Processing job ${job.id} for type ${type}`);

    try {
      switch (type) {
        case 'email':
          await processEmailNotification(payload);
          break;
        case 'sms':
          await processSMSNotification(payload);
          break;
        default:
          console.warn(`[Notification Queue] Unknown notification type: ${type}`);
      }

      return { ok: true };
    } catch (error) {
      console.error(`[Notification Queue] Job ${job.id} failed:`, error);
      throw error;
    }
  },
  {
    connection,
    concurrency: 10, // Process 10 notifications concurrently
    limiter: {
      max: 100, // Max 100 jobs
      duration: 1000, // Per second
    },
  }
);

/**
 * Process email notification
 */
async function processEmailNotification(payload) {
  const { sendEmail, sendEmailTemplate } = await import('../notifications/email.js');
  const sql = await import('../../web/src/app/api/utils/sql.js').then(m => m.default);

  const { to, template, data, subject, html, text } = payload;

  let result;
  if (template) {
    result = await sendEmailTemplate({ to, template, data });
  } else {
    result = await sendEmail({ to, subject, html, text });
  }

  // Log notification in database
  try {
    await sql(
      `INSERT INTO notifications (type, channel, recipient, status, metadata, created_at)
       VALUES ($1, $2, $3, $4, $5::jsonb, NOW())`,
      [
        'email',
        'email',
        to,
        result.ok ? 'sent' : 'failed',
        JSON.stringify({ result, template, data }),
      ]
    );
  } catch (error) {
    console.error('[Notification Queue] Failed to log notification:', error);
  }

  if (!result.ok) {
    throw new Error(result.error || 'Email send failed');
  }

  return result;
}

/**
 * Process SMS notification
 */
async function processSMSNotification(payload) {
  // SMS implementation will be added in Gap 1 - Agent 2
  console.log('[Notification Queue] SMS notifications not yet implemented');
  return { ok: false, error: 'SMS not implemented' };
}

/**
 * Queue an email notification
 * @param {Object} options
 * @param {string} options.to - Recipient email
 * @param {string} [options.template] - Template name
 * @param {Object} [options.data] - Template data
 * @param {string} [options.subject] - Email subject (if not using template)
 * @param {string} [options.html] - HTML content (if not using template)
 * @param {string} [options.text] - Text content (if not using template)
 * @param {Object} [options.options] - Job options (priority, delay, etc.)
 * @returns {Promise<Job>} BullMQ job
 */
export async function queueEmailNotification({
  to,
  template,
  data,
  subject,
  html,
  text,
  options = {},
}) {
  return notificationQueue.add(
    'email',
    {
      type: 'email',
      payload: {
        to,
        template,
        data,
        subject,
        html,
        text,
      },
    },
    {
      priority: options.priority || 0,
      delay: options.delay || 0,
      ...options,
    }
  );
}

/**
 * Queue an SMS notification
 * @param {Object} options
 * @param {string} options.to - Recipient phone number
 * @param {string} options.message - SMS message
 * @param {Object} [options.options] - Job options
 * @returns {Promise<Job>} BullMQ job
 */
export async function queueSMSNotification({ to, message, options = {} }) {
  return notificationQueue.add(
    'sms',
    {
      type: 'sms',
      payload: {
        to,
        message,
      },
    },
    {
      priority: options.priority || 0,
      delay: options.delay || 0,
      ...options,
    }
  );
}

/**
 * Close queues gracefully
 */
export async function closeNotificationQueues() {
  await notificationWorker.close();
  await notificationQueue.close();
}


