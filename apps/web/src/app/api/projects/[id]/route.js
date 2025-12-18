/**
 * GET /api/projects/[id]
 * Get project details
 */

import { auth } from "@/auth";
import sql from "@/app/api/utils/sql";
import { startRequest } from "@/app/api/utils/logger";
import {
  errorResponse,
  successResponse,
  ErrorCodes,
  withErrorHandling,
} from "@/app/api/utils/errorHandler";

export const GET = withErrorHandling(async (request, { params: { id } }) => {
  const reqMeta = startRequest({ request, route: `/api/projects/[${id}]` });
  const session = await auth();
  
  if (!session?.user?.id) {
    return errorResponse(ErrorCodes.UNAUTHORIZED, {
      headers: reqMeta.header(),
    });
  }

  // Fetch project with implementer info
  const projectRows = await sql(
    `SELECT 
      p.id,
      p.user_id,
      p.title,
      p.description,
      p.status,
      p.current_amount,
      p.target_amount,
      p.currency,
      p.deadline,
      p.category,
      p.location,
      p.cover_image_url,
      p.implementer_user_id,
      p.created_at,
      p.updated_at,
      impl.name AS implementer_name,
      impl.email AS implementer_email
    FROM projects p
    LEFT JOIN auth_users impl ON p.implementer_user_id = impl.id
    WHERE p.id = $1 LIMIT 1`,
    [id]
  );

  if (!projectRows || !projectRows[0]) {
    return errorResponse(ErrorCodes.NOT_FOUND, {
      message: "Project not found",
      headers: reqMeta.header(),
    });
  }

  const project = projectRows[0];
  const isOwner = project.user_id === session.user.id;

  // Calculate progress
  const currentAmount = Number(project.current_amount || 0);
  const targetAmount = Number(project.target_amount || 0);
  const progressPercent = targetAmount > 0
    ? Math.min(100, Math.round((currentAmount / targetAmount) * 100))
    : 0;

  // Get contribution count
  const contributionCountRows = await sql(
    `SELECT COUNT(*) as count FROM project_contributions 
     WHERE project_id = $1 AND status = 'completed'`,
    [id]
  );
  const contributionCount = Number(contributionCountRows[0]?.count || 0);

  return successResponse(
    {
      id: project.id,
      title: project.title,
      description: project.description || null,
      status: project.status,
      currentAmount,
      targetAmount,
      currency: project.currency || "KES",
      deadline: project.deadline ? new Date(project.deadline).toISOString().split("T")[0] : null,
      category: project.category || null,
      location: project.location || null,
      coverImageUrl: project.cover_image_url || null,
      progressPercent,
      contributionCount,
      isOwner,
      implementer_user_id: project.implementer_user_id || null,
      implementer_name: project.implementer_name || null,
      implementer_email: project.implementer_email || null,
      createdAt: project.created_at ? new Date(project.created_at).toISOString() : null,
      updatedAt: project.updated_at ? new Date(project.updated_at).toISOString() : null,
    },
    200,
    reqMeta.header()
  );
});

