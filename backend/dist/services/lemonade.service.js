"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const axios_1 = __importDefault(require("axios"));
const crypto_1 = __importDefault(require("crypto"));
const prisma_1 = require("../lib/prisma");
class LemonadeService {
    constructor() {
        this.token = null;
        this.tokenExpiresAt = 0;
        // OpenAPI declares a placeholder server "https://lemonade.test"; staging docs are served from staging-api.mylemonade.io.
        this.baseUrl = process.env.LEMONADE_BASE_URL || "https://staging-api.mylemonade.io";
        this.consumerKey = process.env.LEMONADE_CONSUMER_KEY || "";
        this.consumerSecret = process.env.LEMONADE_CONSUMER_SECRET || "";
    }
    async getAccessToken() {
        const now = Date.now();
        if (this.token && now < this.tokenExpiresAt - 60_000)
            return this.token;
        if (!this.consumerKey || !this.consumerSecret) {
            throw new Error("LEMONADE_CONSUMER_KEY/LEMONADE_CONSUMER_SECRET not configured");
        }
        const { data } = await axios_1.default.post(`${this.baseUrl}/api/v2/auth/login`, { consumer_key: this.consumerKey, consumer_secret: this.consumerSecret }, { headers: { "Content-Type": "application/json" } });
        if (!data?.data?.access_token)
            throw new Error("Failed to authenticate with Lemonade");
        this.token = data.data.access_token;
        this.tokenExpiresAt = now + Number(data.data.expires_in || 3600) * 1000;
        return this.token;
    }
    verifyWebhook(payload, signature) {
        if (!signature)
            return false;
        const hmac = crypto_1.default.createHmac("sha256", process.env.LEMONADE_WEBHOOK_SECRET || "");
        hmac.update(payload);
        const computed = hmac.digest("hex");
        try {
            const a = Buffer.from(computed);
            const b = Buffer.from(signature);
            if (a.length !== b.length)
                return false;
            return crypto_1.default.timingSafeEqual(a, b);
        }
        catch {
            return false;
        }
    }
    async initiateCardPayment(args) {
        const token = await this.getAccessToken();
        const payload = {
            wallet_no: args.walletNo,
            reference: args.reference,
            acc_name: args.customerName,
            acc_no: args.customerPhone,
            amount: args.amount,
            currency: args.currency,
            channel: "400001", // Card Payments
            description: args.description,
            is_mobile: true,
        };
        if (args.resultUrl)
            payload.result_url = args.resultUrl;
        if (args.email)
            payload.email = args.email;
        const { data } = await axios_1.default.post(`${this.baseUrl}/api/v2/payment`, payload, {
            headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        });
        if (data.status !== "success") {
            throw new Error(data?.message || "Lemonade payment initiation failed");
        }
        const result = {
            transactionId: data.data.transaction_id,
            raw: data,
        };
        if (data.data.internal_id)
            result.internalId = data.data.internal_id;
        if (data.data.redirect_url)
            result.redirectUrl = data.data.redirect_url;
        return result;
    }
    async queryStatus(transactionId) {
        const token = await this.getAccessToken();
        const { data } = await axios_1.default.post(`${this.baseUrl}/api/v2/payment/status-query`, { transaction_id: transactionId }, { headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } });
        return data;
    }
    mapProviderStatus(status) {
        const s = String(status || "").toLowerCase();
        if (["completed", "success", "paid"].includes(s))
            return "SUCCESS";
        if (["failed", "cancelled", "canceled", "error"].includes(s))
            return "FAILED";
        return "PENDING";
    }
    async reconcileBridgeTransactionByReference(reference, provider) {
        const txRow = await prisma_1.prisma.transaction.findUnique({ where: { reference } });
        if (!txRow)
            return;
        if (txRow.status !== "PENDING")
            return;
        const providerStatus = provider?.data?.status || provider?.status || "";
        const mapped = this.mapProviderStatus(providerStatus);
        if (mapped === "SUCCESS") {
            await prisma_1.prisma.$transaction(async (tx) => {
                const updated = await tx.transaction.updateMany({
                    where: { id: txRow.id, status: "PENDING" },
                    data: { status: "SUCCESS", metadata: { ...txRow.metadata, lemonade: provider } },
                });
                if (updated.count !== 1)
                    return;
                if (txRow.toUserId) {
                    await tx.wallet.update({
                        where: { userId: txRow.toUserId },
                        data: { balance: { increment: txRow.amount } },
                    });
                    await tx.notification.create({
                        data: {
                            userId: txRow.toUserId,
                            type: "PAYMENT",
                            title: "Card Payment Successful",
                            message: `KES ${txRow.amount} added to your wallet`,
                            actionUrl: "/wallet",
                        },
                    });
                }
            });
        }
        else if (mapped === "FAILED") {
            await prisma_1.prisma.transaction.update({
                where: { id: txRow.id },
                data: { status: "FAILED", metadata: { ...txRow.metadata, lemonade: provider } },
            });
        }
    }
    // For result_url callbacks (if Lemonade sends them).
    async handleCallback(payload) {
        // Try to find our reference (external_reference is returned by status-query per spec)
        const ref = payload?.data?.external_reference ||
            payload?.external_reference ||
            payload?.data?.reference ||
            payload?.reference ||
            null;
        if (ref) {
            await this.reconcileBridgeTransactionByReference(String(ref), payload);
            return;
        }
        // Fallback: if we only got transaction_id, locate by metadata
        const txnId = payload?.data?.transaction_id || payload?.transaction_id;
        if (!txnId)
            return;
        const txRow = await prisma_1.prisma.transaction.findFirst({
            where: { metadata: { path: ["lemonade", "transaction_id"], equals: String(txnId) } },
        });
        if (!txRow)
            return;
        await this.reconcileBridgeTransactionByReference(txRow.reference, payload);
    }
}
exports.default = new LemonadeService();
//# sourceMappingURL=lemonade.service.js.map