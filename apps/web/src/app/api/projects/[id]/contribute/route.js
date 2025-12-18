/**
 * POST /api/projects/[id]/contribute
 * Contribute to a project by creating a payment intent
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
import * as yup from "yup";

// Validation schema
const contributeSchema = yup.object({
  amount: yup
    .number()
    .typeError("Amount must be a number")
    .min(0.01, "Amount must be greater than 0")
    .required("Amount is required"),
  currency: yup.string().default("KES"),
  message: yup.string().max(500, "Message must be no more than 500 characters").nullable(),
  anonymous: yup.boolean().default(false),
  fundingPlan: yup.array().of(
    yup.object({
      type: yup.string().required(),
      amount: yup.number().required(),
      priority: yup.number().default(0),
    })
  ).nullable(),
});

export const POST = withErrorHandling(async (request, { params: { id } }) => {
  const reqMeta = startRequest({ request, route: `/api/projects/[${id}]/contribute` });
  const session = await auth();
  
  if (!session?.user?.id) {
    return errorResponse(ErrorCodes.UNAUTHORIZED, {
      headers: reqMeta.header(),
    });
  }

  // Parse and validate request body
  let body = {};
  try {
    body = await request.json();
  } catch {
    return errorResponse(ErrorCodes.INVALID_JSON, {
      message: "Invalid JSON in request body",
      headers: reqMeta.header(),
    });
  }

  // Validate with schema
  let validated;
  try {
    validated = await contributeSchema.validate(body, {
      abortEarly: false,
      stripUnknown: true,
    });
  } catch (validationError) {
    if (validationError.name === "ValidationError") {
      const errors = {};
      if (validationError.inner && validationError.inner.length > 0) {
        validationError.inner.forEach((err) => {
          if (err.path) {
            errors[err.path] = err.message;
          }
        });
      } else if (validationError.path) {
        errors[validationError.path] = validationError.message;
      }

      return errorResponse(ErrorCodes.VALIDATION_ERROR, {
        message: "Validation failed",
        details: { errors },
        headers: reqMeta.header(),
      });
    }
    throw validationError;
  }

  // Fetch project
  const projectRows = await sql(
    `SELECT id, user_id, title, status, current_amount, target_amount, currency, deadline
     FROM projects WHERE id = $1 LIMIT 1`,
    [id]
  );

  if (!projectRows || !projectRows[0]) {
    return errorResponse(ErrorCodes.NOT_FOUND, {
      message: "Project not found",
      headers: reqMeta.header(),
    });
  }

  const project = projectRows[0];

  // Check if project is active
  if (project.status !== "active" && project.status !== "draft") {
    return errorResponse(ErrorCodes.INVALID_STATUS, {
      message: `Cannot contribute to project with status: ${project.status}`,
      headers: reqMeta.header(),
    });
  }

  // Check if project deadline has passed
  if (project.deadline && new Date(project.deadline) < new Date()) {
    return errorResponse(ErrorCodes.INVALID_STATUS, {
      message: "Project deadline has passed",
      headers: reqMeta.header(),
    });
  }

  // Check currency match
  const currency = validated.currency || project.currency || "KES";
  if (currency !== project.currency) {
    return errorResponse(ErrorCodes.VALIDATION_ERROR, {
      message: `Currency mismatch. Project uses ${project.currency}`,
      headers: reqMeta.header(),
    });
  }

  const amount = Number(validated.amount);

  // Create payment intent
  const { getOrCreateWallet } = await import("../../../wallet/_helpers");
  const wallet = await getOrCreateWallet(session.user.id, currency);

  // Build funding plan (use provided or auto-generate)
  let fundingPlan = validated.fundingPlan || [];
  if (!fundingPlan || fundingPlan.length === 0) {
    // Auto-generate funding plan
    const bridgeAvailable = Math.max(0, Number(wallet.balance || 0));
    const sources = await sql(
      `SELECT source, balance, hold FROM wallet_sources 
       WHERE user_id = $1 AND currency = $2 AND status = 'active'`,
      [session.user.id, currency]
    );

    const avail = { kcb: 0, dtb: 0, mpesa: 0 };
    for (const r of sources || []) {
      const a = Math.max(0, Number(r.balance) - Number(r.hold));
      const key = String(r.source);
      if (key === "kcb") avail.kcb = a;
      else if (key === "dtb") avail.dtb = a;
      else if (key === "mpesa") avail.mpesa = a;
    }

    let rem = amount;
    const plan = [];

    const take = (type, id, a) => {
      if (rem <= 0) return;
      const t = Math.min(rem, Math.max(0, a));
      if (t > 0) {
        plan.push({ type, id, amount: t });
        rem -= t;
      }
    };

    take("BRIDGE_WALLET", wallet.id, bridgeAvailable);
    if (rem > 0) take("LEMONADE_MPESA", "mpesa", avail.mpesa);
    if (rem > 0) take("LEMONADE_BANK", "kcb", avail.kcb);
    if (rem > 0) take("LEMONADE_BANK", "dtb", avail.dtb);
    if (rem > 0) {
      plan.push({ type: "LEMONADE_MPESA", id: "mpesa", amount: rem });
      rem = 0;
    }

    fundingPlan = plan.map((p, i) => ({ ...p, priority: i + 1 }));
  }

  // Create payment intent
  const intentRows = await sql(
    `INSERT INTO payment_intents (
      user_id,
      merchant_id,
      amount_due,
      currency,
      status,
      funding_plan,
      metadata
    ) VALUES ($1, $2, $3, $4, 'PENDING', $5::jsonb, $6::jsonb)
    RETURNING id`,
    [
      session.user.id,
      project.user_id, // Project owner as merchant
      amount,
      currency,
      JSON.stringify(fundingPlan),
      JSON.stringify({ 
        project_id: id,
        contribution_type: "project",
      }),
    ]
  );

  const paymentIntentId = intentRows[0].id;

  // Create contribution record
  const contributionRows = await sql(
    `INSERT INTO project_contributions (
      project_id,
      contributor_user_id,
      payment_intent_id,
      amount,
      currency,
      status,
      message,
      anonymous,
      metadata
    ) VALUES ($1, $2, $3, $4, $5, 'pending', $6, $7, $8::jsonb)
    RETURNING id, created_at`,
    [
      id,
      session.user.id,
      paymentIntentId,
      amount,
      currency,
      validated.message || null,
      validated.anonymous || false,
      JSON.stringify({}),
    ]
  );

  const contribution = contributionRows[0];

  return successResponse(
    {
      contributionId: contribution.id,
      paymentIntentId,
      amount,
      currency,
      status: "pending",
      fundingPlan,
    },
    201,
    reqMeta.header()
  );
});


