import { Router } from "express";
import { asyncHandler } from "../middleware/asyncHandler";
import * as authController from "../controllers/auth.controller";
import { requireAuth } from "../middleware/auth";

export const authRouter = Router();

authRouter.post("/register", asyncHandler(authController.register));
authRouter.post("/login", asyncHandler(authController.login));
authRouter.get("/me", requireAuth, asyncHandler(authController.getMe));
authRouter.post("/refresh", asyncHandler(authController.refreshToken));
authRouter.post("/logout", requireAuth, asyncHandler(authController.logout));
authRouter.post("/logout-all", requireAuth, asyncHandler(authController.logoutAll));


