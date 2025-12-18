/**
 * Health Check Endpoint
 * Basic health check for load balancers and monitoring
 */

import { successResponse, errorResponse, ErrorCodes, withErrorHandling } from "@/app/api/utils/errorHandler";

/**
 * GET /api/health
 * Basic health check - returns 200 if service is up
 */
export const GET = withErrorHandling(async () => {
  return successResponse({
    status: "healthy",
    timestamp: new Date().toISOString(),
    service: "bridge-mvp-v3",
  });
});
