import { Router } from "express";
import { asyncHandler } from "../middleware/asyncHandler";
import { requireAuth } from "../middleware/auth";
import * as walletController from "../controllers/wallet.controller";

export const walletRouter = Router();

walletRouter.get("/balance", requireAuth, asyncHandler(walletController.getBalance));
walletRouter.get("/transactions", requireAuth, asyncHandler(walletController.getTransactions));
walletRouter.post("/deposit/mpesa", requireAuth, asyncHandler(walletController.depositMpesa));
walletRouter.post("/deposit/card", requireAuth, asyncHandler(walletController.depositCard));
walletRouter.get(
  "/card/status/:providerTransactionId",
  requireAuth,
  asyncHandler(walletController.checkCardPaymentStatus)
);
walletRouter.post("/transfer", requireAuth, asyncHandler(walletController.transfer));
walletRouter.post("/withdraw/mpesa", requireAuth, asyncHandler(walletController.withdrawMpesa));
walletRouter.get("/mpesa/status/:checkoutRequestID", requireAuth, asyncHandler(walletController.checkPaymentStatus));
walletRouter.post("/transactions/:transactionId/receipt", requireAuth, asyncHandler(walletController.createReceipt));


