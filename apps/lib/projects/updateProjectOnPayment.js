/**
 * Update project when contribution payment is completed
 * Called from payment confirmation and webhook handlers
 */

import sql from '../../web/src/app/api/utils/sql.js';
import { sendProjectContributionNotification } from '../notifications/service.js';

/**
 * Update project contribution and current_amount when payment completes
 * @param {string} paymentIntentId - Payment intent ID
 * @param {string} status - Payment status ('completed', 'failed')
 */
export async function updateProjectOnPayment(paymentIntentId, status) {
  try {
    // Find contribution linked to this payment intent
    const contributionRows = await sql(
      `SELECT 
        c.id as contribution_id,
        c.project_id,
        c.contributor_user_id,
        c.amount,
        c.currency,
        c.status as contribution_status,
        p.title as project_title,
        p.current_amount,
        p.target_amount,
        p.user_id as project_owner_id
      FROM project_contributions c
      JOIN projects p ON c.project_id = p.id
      WHERE c.payment_intent_id = $1
      LIMIT 1`,
      [paymentIntentId]
    );

    if (!contributionRows || !contributionRows[0]) {
      // Not a project contribution, skip
      return { ok: true, skipped: true };
    }

    const contribution = contributionRows[0];

    // Only process if contribution is still pending
    if (contribution.contribution_status !== 'pending') {
      return { ok: true, alreadyProcessed: true };
    }

    if (status === 'completed' || status === 'COMPLETED') {
      // Update contribution status
      await sql(
        `UPDATE project_contributions 
         SET status = 'completed', updated_at = NOW() 
         WHERE id = $1`,
        [contribution.contribution_id]
      );

      // Update project current_amount atomically
      const updateRows = await sql(
        `UPDATE projects 
         SET current_amount = current_amount + $1, 
             updated_at = NOW()
         WHERE id = $2
         RETURNING current_amount, target_amount, status`,
        [Number(contribution.amount), contribution.project_id]
      );

      const updatedProject = updateRows[0];

      // Check if project target is reached
      const newCurrentAmount = Number(updatedProject.current_amount || 0);
      const targetAmount = Number(updatedProject.target_amount || 0);
      const progressPercent = targetAmount > 0 
        ? Math.min(100, Math.round((newCurrentAmount / targetAmount) * 100))
        : 0;

      // Auto-complete project if target reached
      if (newCurrentAmount >= targetAmount && updatedProject.status === 'active') {
        await sql(
          `UPDATE projects 
           SET status = 'completed', updated_at = NOW() 
           WHERE id = $1 AND status = 'active'`,
          [contribution.project_id]
        );

        // Send notification to project owner (best effort)
        try {
          const ownerRows = await sql(
            `SELECT name, email FROM auth_users WHERE id = $1 LIMIT 1`,
            [contribution.project_owner_id]
          );
          const owner = ownerRows?.[0];
          if (owner?.email) {
            const { sendEmailTemplate } = await import('../notifications/email.js');
            await sendEmailTemplate({
              to: owner.email,
              template: 'project_completed',
              data: {
                projectTitle: contribution.project_title,
                targetAmount: targetAmount,
                currentAmount: newCurrentAmount,
                currency: contribution.currency || 'KES',
              },
            });
          }
        } catch (error) {
          console.error('[Project] Failed to send completion notification:', error);
        }
      }

      // Get contributor info for notification
      const contributorRows = await sql(
        `SELECT name, email FROM auth_users WHERE id = $1 LIMIT 1`,
        [contribution.contributor_user_id]
      );
      const contributor = contributorRows?.[0];

      // Send notification to contributor (best effort, don't fail on error)
      try {
        if (contributor?.email) {
          await sendProjectContributionNotification({
            contributorEmail: contributor.email,
            contributorName: contributor.name || 'Contributor',
            projectTitle: contribution.project_title,
            amount: Number(contribution.amount),
            currency: contribution.currency || 'KES',
            progressPercent,
          });
        }
      } catch (error) {
        console.error('[Project] Failed to send contribution notification:', error);
      }

      return {
        ok: true,
        contributionId: contribution.contribution_id,
        projectId: contribution.project_id,
        newCurrentAmount,
        progressPercent,
        targetReached: newCurrentAmount >= targetAmount,
      };
    } else if (status === 'failed' || status === 'FAILED') {
      // Mark contribution as failed
      await sql(
        `UPDATE project_contributions 
         SET status = 'failed', updated_at = NOW() 
         WHERE id = $1`,
        [contribution.contribution_id]
      );

      return {
        ok: true,
        contributionId: contribution.contribution_id,
        status: 'failed',
      };
    }

    return { ok: true };
  } catch (error) {
    console.error('[Project] Error updating project on payment:', error);
    return { ok: false, error: error.message };
  }
}

