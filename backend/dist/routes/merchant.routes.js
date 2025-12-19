"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.merchantRouter = void 0;
const express_1 = require("express");
const asyncHandler_1 = require("../middleware/asyncHandler");
const auth_1 = require("../middleware/auth");
const merchantController = __importStar(require("../controllers/merchant.controller"));
exports.merchantRouter = (0, express_1.Router)();
exports.merchantRouter.get("/me", auth_1.requireAuth, (0, asyncHandler_1.asyncHandler)(merchantController.getMerchantMe));
exports.merchantRouter.post("/qr", auth_1.requireAuth, (0, asyncHandler_1.asyncHandler)(merchantController.generateQRCode));
exports.merchantRouter.post("/qr/pay", auth_1.requireAuth, (0, asyncHandler_1.asyncHandler)(merchantController.processQRPayment));
exports.merchantRouter.post("/card/pay", auth_1.requireAuth, (0, asyncHandler_1.asyncHandler)(merchantController.initiateCardPaymentToMerchant));
exports.merchantRouter.get("/card/status/:providerTransactionId", auth_1.requireAuth, (0, asyncHandler_1.asyncHandler)(merchantController.checkCardPaymentStatus));
exports.merchantRouter.get("/sales", auth_1.requireAuth, (0, asyncHandler_1.asyncHandler)(merchantController.getSalesStats));
exports.merchantRouter.get("/:merchantId/public", auth_1.requireAuth, (0, asyncHandler_1.asyncHandler)(merchantController.getMerchantPublic));
//# sourceMappingURL=merchant.routes.js.map