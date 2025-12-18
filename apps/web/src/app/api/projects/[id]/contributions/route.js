/**
 * GET /api/projects/[id]/contributions
 * Get contribution history for a project
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
  const reqMeta = startRequest({ request, route: `/api/projects/[${id}]/contributions` });
  const session = await auth();
  
  if (!session?.user?.id) {
    return errorResponse(ErrorCodes.UNAUTHORIZED, {
      headers: reqMeta.header(),
    });
  }

  // Fetch project to verify it exists
  const projectRows = await sql(
    `SELECT id, user_id FROM projects WHERE id = $1 LIMIT 1`,
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

  // Get query parameters
  const { searchParams } = new URL(request.url);
  const limit = Math.min(Number(searchParams.get("limit") || 50), 100);
  const offset = Number(searchParams.get("offset") || 0);

  // Fetch contributions
  const contributionRows = await sql(
    `SELECT 
      c.id,
      c.contributor_user_id,
      c.amount,
      c.currency,
      c.status,
      c.message,
      c.anonymous,
      c.created_at,
      u.name as contributor_name,
      u.email as contributor_email
    FROM project_contributions c
    LEFT JOIN auth_users u ON c.contributor_user_id = u.id
    WHERE c.project_id = $1
    ORDER BY c.created_at DESC
    LIMIT $2 OFFSET $3`,
    [id, limit, offset]
  );

  // Get total count
  const countRows = await sql(
    `SELECT COUNT(*) as total FROM project_contributions WHERE project_id = $1`,
    [id]
  );
  const total = Number(countRows[0]?.total || 0);

  const items = contributionRows.map((row) => ({
    id: row.id,
    amount: Number(row.amount || 0),
    currency: row.currency || "KES",
    status: row.status,
    message: row.message || null,
    anonymous: row.anonymous || false,
    contributor: row.anonymous && !isOwner
      ? null
      : {
          id: row.contributor_user_id,
          name: row.contributor_name || null,
          email: isOwner ? row.contributor_email : null, // Only show email to owner
        },
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : null,
  }));

  return successResponse(
    {
      items,
      total,
      limit,
      offset,
    },
    200,
    reqMeta.header()
  );
});


