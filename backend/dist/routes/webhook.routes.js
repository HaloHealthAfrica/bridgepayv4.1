"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.callbackRouter = void 0;
const express_1 = require("express");
const asyncHandler_1 = require("../middleware/asyncHandler");
const mpesa_service_1 = __importDefault(require("../services/mpesa.service"));
const lemonade_service_1 = __importDefault(require("../services/lemonade.service"));
exports.callbackRouter = (0, express_1.Router)();
exports.callbackRouter.post("/mpesa", (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    await mpesa_service_1.default.handleCallback(req.body);
    res.json({ ok: true });
}));
exports.callbackRouter.post("/lemonade", (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    // Lemonade OpenAPI uses bearer auth for API calls and allows `result_url` callbacks for transaction status.
    // If a signature is provided + secret configured, verify it against the captured raw body.
    const signature = req.headers["x-lemonade-signature"] || "";
    const raw = req.rawBody;
    if (signature && process.env.LEMONADE_WEBHOOK_SECRET && raw) {
        const ok = lemonade_service_1.default.verifyWebhook(raw.toString("utf8"), signature);
        if (!ok)
            return res.status(401).json({ ok: false });
    }
    await lemonade_service_1.default.handleCallback(req.body);
    res.json({ ok: true });
}));
//# sourceMappingURL=webhook.routes.js.map