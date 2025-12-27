import { Router } from "express";
import { requireAuth, requireRole } from "../middleware/auth";
import { asyncHandler } from "../middleware/asyncHandler";
import * as adminController from "../controllers/admin.controller";

export const adminRouter = Router();

// Admin routes are authenticated, and then gated per-endpoint.
// This enables limited admin-like consoles (e.g. KYC_VERIFIER) without granting full admin access.
adminRouter.use(requireAuth);

adminRouter.get("/stats", requireRole(["ADMIN"]), asyncHandler(adminController.getStats));
adminRouter.get("/users", requireRole(["ADMIN"]), asyncHandler(adminController.listUsers));
adminRouter.patch("/users/:id/status", requireRole(["ADMIN"]), asyncHandler(adminController.updateUserStatus));

adminRouter.get("/transactions", requireRole(["ADMIN"]), asyncHandler(adminController.listTransactions));
adminRouter.get("/wallets", requireRole(["ADMIN"]), asyncHandler(adminController.listWallets));

// Allow KYC verifiers to list/review KYC without full admin privileges.
adminRouter.get("/kyc", requireRole(["ADMIN", "KYC_VERIFIER"]), asyncHandler(adminController.listKycSubmissions));
adminRouter.post("/kyc/:userId/review", requireRole(["ADMIN", "KYC_VERIFIER"]), asyncHandler(adminController.reviewKyc));

adminRouter.get("/disputes", requireRole(["ADMIN"]), asyncHandler(adminController.listDisputes));




