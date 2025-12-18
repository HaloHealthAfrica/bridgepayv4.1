/**
 * Notification Service
 * High-level service for sending notifications
 */

import { queueEmailNotification, queueSMSNotification } from '../queue/notificationQueue.js';
import sql from '../../web/src/app/api/utils/sql.js';

/**
 * Check if user has notification enabled for a type
 */
async function isNotificationEnabled(userId, channel, notificationType) {
  try {
    const rows = await sql(
      `SELECT enabled FROM notification_preferences 
       WHERE user_id = $1 AND channel = $2 AND notification_type = $3`,
      [userId, channel, notificationType]
    );
    
    if (rows && rows[0]) {
      return rows[0].enabled;
    }
    
    // Default to enabled if no preference set
    return true;
  } catch (error) {
    console.error('[Notifications] Error checking preferences:', error);
    return true; // Default to enabled on error
  }
}

/**
 * Send invoice notification
 */
export async function sendInvoiceNotification({
  invoiceId,
  customerEmail,
  customerName,
  merchantName,
  amount,
  currency,
  invoiceUrl,
  dueDate,
}) {
  if (!customerEmail) {
    console.warn('[Notifications] No email provided for invoice notification');
    return { ok: false, error: 'No email provided' };
  }

  return queueEmailNotification({
    to: customerEmail,
    template: 'invoice_sent',
    data: {
      invoiceId,
      customerName,
      merchantName,
      amount,
      currency,
      invoiceUrl,
      dueDate,
    },
    options: {
      priority: 5, // High priority for invoices
    },
  });
}

/**
 * Send payment received notification
 */
export async function sendPaymentReceivedNotification({
  recipientEmail,
  recipientName,
  senderName,
  amount,
  currency,
  reference,
  narration,
}) {
  if (!recipientEmail) {
    return { ok: false, error: 'No email provided' };
  }

  return queueEmailNotification({
    to: recipientEmail,
    template: 'payment_received',
    data: {
      recipientName,
      senderName,
      amount,
      currency,
      reference,
      narration,
    },
    options: {
      priority: 3,
    },
  });
}

/**
 * Send payment sent notification
 */
export async function sendPaymentSentNotification({
  senderEmail,
  senderName,
  recipientName,
  amount,
  currency,
  reference,
  narration,
}) {
  if (!senderEmail) {
    return { ok: false, error: 'No email provided' };
  }

  return queueEmailNotification({
    to: senderEmail,
    template: 'payment_sent',
    data: {
      senderName,
      recipientName,
      amount,
      currency,
      reference,
      narration,
    },
    options: {
      priority: 3,
    },
  });
}

/**
 * Send wallet top-up notification
 */
export async function sendWalletTopupNotification({
  userEmail,
  userName,
  amount,
  currency,
  method,
  newBalance,
}) {
  if (!userEmail) {
    return { ok: false, error: 'No email provided' };
  }

  return queueEmailNotification({
    to: userEmail,
    template: 'wallet_topup',
    data: {
      userName,
      amount,
      currency,
      method,
      newBalance,
    },
    options: {
      priority: 2,
    },
  });
}

/**
 * Send project contribution notification
 */
export async function sendProjectContributionNotification({
  contributorEmail,
  contributorName,
  projectTitle,
  amount,
  currency,
  progressPercent,
}) {
  if (!contributorEmail) {
    return { ok: false, error: 'No email provided' };
  }

  return queueEmailNotification({
    to: contributorEmail,
    template: 'project_contribution',
    data: {
      contributorName,
      projectTitle,
      amount,
      currency,
      progressPercent,
    },
    options: {
      priority: 4,
    },
  });
}


