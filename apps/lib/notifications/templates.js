/**
 * Email Templates
 * Template system for email notifications
 */

/**
 * Render an email template
 * @param {string} templateName - Template name
 * @param {Object} data - Template data
 * @returns {Promise<Object|null>} Rendered template { subject, html, text }
 */
export async function renderEmailTemplate(templateName, data = {}) {
  const templates = {
    invoice_sent: {
      subject: (d) => `Invoice #${d.invoiceId} from ${d.merchantName || 'Bridge'}`,
      html: (d) => `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Invoice</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: #2563EB; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
            <h1 style="margin: 0;">Invoice</h1>
          </div>
          <div style="background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
            <p>Hello ${d.customerName || 'Customer'},</p>
            <p>You have received an invoice from <strong>${d.merchantName || 'Bridge'}</strong>.</p>
            <div style="background: white; padding: 15px; border-radius: 4px; margin: 20px 0;">
              <p style="margin: 0;"><strong>Invoice #:</strong> ${d.invoiceId}</p>
              <p style="margin: 5px 0;"><strong>Amount:</strong> ${d.currency || 'KES'} ${Number(d.amount || 0).toLocaleString()}</p>
              ${d.dueDate ? `<p style="margin: 5px 0;"><strong>Due Date:</strong> ${new Date(d.dueDate).toLocaleDateString()}</p>` : ''}
            </div>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${d.invoiceUrl}" style="background: #2563EB; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">View & Pay Invoice</a>
            </div>
            <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
              This invoice was sent via Bridge Payment Platform.
            </p>
          </div>
        </body>
        </html>
      `,
    },
    payment_received: {
      subject: (d) => `Payment Received - ${d.currency || 'KES'} ${Number(d.amount || 0).toLocaleString()}`,
      html: (d) => `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Payment Received</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: #10b981; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
            <h1 style="margin: 0;">Payment Received</h1>
          </div>
          <div style="background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
            <p>Hello ${d.recipientName || 'User'},</p>
            <p>You have received a payment of <strong>${d.currency || 'KES'} ${Number(d.amount || 0).toLocaleString()}</strong>.</p>
            <div style="background: white; padding: 15px; border-radius: 4px; margin: 20px 0;">
              <p style="margin: 0;"><strong>From:</strong> ${d.senderName || 'Unknown'}</p>
              <p style="margin: 5px 0;"><strong>Amount:</strong> ${d.currency || 'KES'} ${Number(d.amount || 0).toLocaleString()}</p>
              <p style="margin: 5px 0;"><strong>Reference:</strong> ${d.reference || 'N/A'}</p>
              ${d.narration ? `<p style="margin: 5px 0;"><strong>Note:</strong> ${d.narration}</p>` : ''}
            </div>
            <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
              This payment was processed via Bridge Payment Platform.
            </p>
          </div>
        </body>
        </html>
      `,
    },
    payment_sent: {
      subject: (d) => `Payment Sent - ${d.currency || 'KES'} ${Number(d.amount || 0).toLocaleString()}`,
      html: (d) => `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Payment Sent</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: #2563EB; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
            <h1 style="margin: 0;">Payment Sent</h1>
          </div>
          <div style="background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
            <p>Hello ${d.senderName || 'User'},</p>
            <p>Your payment of <strong>${d.currency || 'KES'} ${Number(d.amount || 0).toLocaleString()}</strong> has been sent successfully.</p>
            <div style="background: white; padding: 15px; border-radius: 4px; margin: 20px 0;">
              <p style="margin: 0;"><strong>To:</strong> ${d.recipientName || 'Unknown'}</p>
              <p style="margin: 5px 0;"><strong>Amount:</strong> ${d.currency || 'KES'} ${Number(d.amount || 0).toLocaleString()}</p>
              <p style="margin: 5px 0;"><strong>Reference:</strong> ${d.reference || 'N/A'}</p>
              ${d.narration ? `<p style="margin: 5px 0;"><strong>Note:</strong> ${d.narration}</p>` : ''}
            </div>
            <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
              This payment was processed via Bridge Payment Platform.
            </p>
          </div>
        </body>
        </html>
      `,
    },
    wallet_topup: {
      subject: (d) => `Wallet Top-up Successful - ${d.currency || 'KES'} ${Number(d.amount || 0).toLocaleString()}`,
      html: (d) => `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Wallet Top-up</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: #10b981; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
            <h1 style="margin: 0;">Top-up Successful</h1>
          </div>
          <div style="background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
            <p>Hello ${d.userName || 'User'},</p>
            <p>Your wallet has been topped up successfully.</p>
            <div style="background: white; padding: 15px; border-radius: 4px; margin: 20px 0;">
              <p style="margin: 0;"><strong>Amount:</strong> ${d.currency || 'KES'} ${Number(d.amount || 0).toLocaleString()}</p>
              <p style="margin: 5px 0;"><strong>Method:</strong> ${d.method || 'Unknown'}</p>
              <p style="margin: 5px 0;"><strong>New Balance:</strong> ${d.currency || 'KES'} ${Number(d.newBalance || 0).toLocaleString()}</p>
            </div>
            <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
              Thank you for using Bridge Payment Platform.
            </p>
          </div>
        </body>
        </html>
      `,
    },
    project_contribution: {
      subject: (d) => `Thank you for contributing to ${d.projectTitle}`,
      html: (d) => `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Project Contribution</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: #8b5cf6; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
            <h1 style="margin: 0;">Thank You!</h1>
          </div>
          <div style="background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
            <p>Hello ${d.contributorName || 'Contributor'},</p>
            <p>Thank you for your contribution to <strong>${d.projectTitle}</strong>!</p>
            <div style="background: white; padding: 15px; border-radius: 4px; margin: 20px 0;">
              <p style="margin: 0;"><strong>Amount:</strong> ${d.currency || 'KES'} ${Number(d.amount || 0).toLocaleString()}</p>
              <p style="margin: 5px 0;"><strong>Project:</strong> ${d.projectTitle}</p>
              <p style="margin: 5px 0;"><strong>Progress:</strong> ${d.progressPercent || 0}%</p>
            </div>
            <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
              Your contribution helps make this project possible.
            </p>
          </div>
        </body>
        </html>
      `,
    },
    project_completed: {
      subject: (d) => `🎉 Project "${d.projectTitle}" Goal Reached!`,
      html: (d) => `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Project Completed</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: #10b981; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
            <h1 style="margin: 0;">🎉 Goal Reached!</h1>
          </div>
          <div style="background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
            <p>Congratulations!</p>
            <p>Your project <strong>${d.projectTitle}</strong> has reached its funding goal!</p>
            <div style="background: white; padding: 15px; border-radius: 4px; margin: 20px 0;">
              <p style="margin: 0;"><strong>Target:</strong> ${d.currency || 'KES'} ${Number(d.targetAmount || 0).toLocaleString()}</p>
              <p style="margin: 5px 0;"><strong>Raised:</strong> ${d.currency || 'KES'} ${Number(d.currentAmount || 0).toLocaleString()}</p>
            </div>
            <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
              Your project is now marked as completed. Thank you for using Bridge Payment Platform!
            </p>
          </div>
        </body>
        </html>
      `,
    },
  };

  const template = templates[templateName];
  if (!template) {
    console.warn(`[Templates] Template "${templateName}" not found`);
    return null;
  }

  const subject = typeof template.subject === 'function' ? template.subject(data) : template.subject;
  const html = typeof template.html === 'function' ? template.html(data) : template.html;
  const text = typeof template.text === 'function' ? template.text(data) : template.text;

  return { subject, html, text };
}

