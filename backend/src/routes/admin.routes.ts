import { Router } from "express";
import { requireAuth, requireRole } from "../middleware/auth";
import { asyncHandler } from "../middleware/asyncHandler";
import * as adminController from "../controllers/admin.controller";

export const adminRouter = Router();

adminRouter.use(requireAuth, requireRole(["ADMIN"]));

adminRouter.get("/stats", asyncHandler(adminController.getStats));
adminRouter.get("/users", asyncHandler(adminController.listUsers));
adminRouter.patch("/users/:id/status", asyncHandler(adminController.updateUserStatus));

adminRouter.get("/transactions", asyncHandler(adminController.listTransactions));
adminRouter.get("/wallets", asyncHandler(adminController.listWallets));

adminRouter.get("/kyc", asyncHandler(adminController.listKycSubmissions));
adminRouter.post("/kyc/:userId/review", asyncHandler(adminController.reviewKyc));

adminRouter.get("/disputes", asyncHandler(adminController.listDisputes));


