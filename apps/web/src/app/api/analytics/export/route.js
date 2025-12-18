import { auth } from "@/auth";
import sql from "@/app/api/utils/sql";
import {
  errorResponse,
  successResponse,
  ErrorCodes,
  withErrorHandling,
} from "@/app/api/utils/errorHandler";
import { ensureAdmin } from "@/app/api/middleware/roleGuard";

/**
 * GET /api/analytics/export
 * Export analytics data as CSV (admin only)
 * Query params: ?format=csv&startDate=YYYY-MM-DD&endDate=YYYY-MM-DD&type=transactions|users|projects
 */
export const GET = withErrorHandling(async (request) => {
  const guard = await ensureAdmin(request);
  if (!guard.ok) {
    return guard.response;
  }

  const { searchParams } = new URL(request.url);
  const format = searchParams.get("format") || "csv";
  const type = searchParams.get("type") || "transactions";
  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");

  if (format !== "csv") {
    return errorResponse(ErrorCodes.VALIDATION_ERROR, {
      message: "Only CSV format is supported",
    });
  }

  let csv = "";
  let filename = "";

  if (type === "transactions") {
    // Export wallet ledger transactions
    let query = `SELECT 
      id,
      wallet_id,
      amount,
      currency,
      type,
      status,
      ref,
      created_at
    FROM wallet_ledger`;
    
    const params = [];
    if (startDate || endDate) {
      if (startDate && endDate) {
        query += ` WHERE created_at >= $1 AND created_at <= $2`;
        params.push(startDate, endDate);
      } else if (startDate) {
        query += ` WHERE created_at >= $1`;
        params.push(startDate);
      } else if (endDate) {
        query += ` WHERE created_at <= $1`;
        params.push(endDate);
      }
    }
    query += ` ORDER BY created_at DESC LIMIT 10000`;

    const rows = await sql(query, params);
    
    // CSV header
    csv = "ID,Wallet ID,Amount,Currency,Type,Status,Reference,Created At\n";
    rows.forEach((row) => {
      csv += `${row.id},${row.wallet_id},${row.amount},${row.currency},${row.type},${row.status},${row.ref},${row.created_at}\n`;
    });
    
    filename = `transactions_${startDate || 'all'}_${endDate || 'all'}.csv`;
  } else if (type === "users") {
    // Export users
    let query = `SELECT 
      id,
      name,
      email,
      role,
      created_at
    FROM auth_users`;
    
    const params = [];
    if (startDate || endDate) {
      if (startDate && endDate) {
        query += ` WHERE created_at >= $1 AND created_at <= $2`;
        params.push(startDate, endDate);
      } else if (startDate) {
        query += ` WHERE created_at >= $1`;
        params.push(startDate);
      } else if (endDate) {
        query += ` WHERE created_at <= $1`;
        params.push(endDate);
      }
    }
    query += ` ORDER BY created_at DESC LIMIT 10000`;

    const rows = await sql(query, params);
    
    csv = "ID,Name,Email,Role,Created At\n";
    rows.forEach((row) => {
      csv += `${row.id},${row.name || ''},${row.email},${row.role},${row.created_at}\n`;
    });
    
    filename = `users_${startDate || 'all'}_${endDate || 'all'}.csv`;
  } else if (type === "projects") {
    // Export projects
    let query = `SELECT 
      id,
      title,
      status,
      current_amount,
      target_amount,
      currency,
      created_at
    FROM projects`;
    
    const params = [];
    if (startDate || endDate) {
      if (startDate && endDate) {
        query += ` WHERE created_at >= $1 AND created_at <= $2`;
        params.push(startDate, endDate);
      } else if (startDate) {
        query += ` WHERE created_at >= $1`;
        params.push(startDate);
      } else if (endDate) {
        query += ` WHERE created_at <= $1`;
        params.push(endDate);
      }
    }
    query += ` ORDER BY created_at DESC LIMIT 10000`;

    const rows = await sql(query, params);
    
    csv = "ID,Title,Status,Current Amount,Target Amount,Currency,Created At\n";
    rows.forEach((row) => {
      csv += `${row.id},${row.title},${row.status},${row.current_amount},${row.target_amount},${row.currency},${row.created_at}\n`;
    });
    
    filename = `projects_${startDate || 'all'}_${endDate || 'all'}.csv`;
  } else {
    return errorResponse(ErrorCodes.VALIDATION_ERROR, {
      message: "Invalid type. Must be: transactions, users, or projects",
    });
  }

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
});


