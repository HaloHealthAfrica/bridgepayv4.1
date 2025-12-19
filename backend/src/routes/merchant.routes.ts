import { Router } from "express";
import { asyncHandler } from "../middleware/asyncHandler";
import { requireAuth } from "../middleware/auth";
import * as merchantController from "../controllers/merchant.controller";

export const merchantRouter = Router();

merchantRouter.get("/me", requireAuth, asyncHandler(merchantController.getMerchantMe));
merchantRouter.post("/qr", requireAuth, asyncHandler(merchantController.generateQRCode));
merchantRouter.post("/qr/pay", requireAuth, asyncHandler(merchantController.processQRPayment));
merchantRouter.post("/card/pay", requireAuth, asyncHandler(merchantController.initiateCardPaymentToMerchant));
merchantRouter.get(
  "/card/status/:providerTransactionId",
  requireAuth,
  asyncHandler(merchantController.checkCardPaymentStatus)
);
merchantRouter.get("/sales", requireAuth, asyncHandler(merchantController.getSalesStats));
merchantRouter.get("/:merchantId/public", requireAuth, asyncHandler(merchantController.getMerchantPublic));


