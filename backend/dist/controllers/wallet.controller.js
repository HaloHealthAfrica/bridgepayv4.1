"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getBalance = getBalance;
exports.getTransactions = getTransactions;
exports.depositMpesa = depositMpesa;
exports.depositCard = depositCard;
exports.checkCardPaymentStatus = checkCardPaymentStatus;
exports.transfer = transfer;
exports.withdrawMpesa = withdrawMpesa;
exports.checkPaymentStatus = checkPaymentStatus;
exports.createReceipt = createReceipt;
const client_1 = require("@prisma/client");
const prisma_1 = require("../lib/prisma");
const errorHandler_1 = require("../middleware/errorHandler");
const mpesa_service_1 = __importDefault(require("../services/mpesa.service"));
const lemonade_service_1 = __importDefault(require("../services/lemonade.service"));
const receipt_service_1 = require("../services/receipt.service");
async function getBalance(req, res) {
    const wallet = await prisma_1.prisma.wallet.findUnique({ where: { userId: req.user.userId } });
    if (!wallet)
        throw new errorHandler_1.AppError("Wallet not found", 404);
    res.json({
        success: true,
        data: {
            balance: Number(wallet.balance),
            pendingBalance: Number(wallet.pendingBalance),
            escrowBalance: Number(wallet.escrowBalance),
            currency: wallet.currency,
        },
    });
}
async function getTransactions(req, res) {
    const { page = 1, limit = 20, type, status } = req.query;
    const skip = (Number(page) - 1) * Number(limit);
    const where = { OR: [{ fromUserId: req.user.userId }, { toUserId: req.user.userId }] };
    if (type)
        where.type = type;
    if (status)
        where.status = status;
    const [transactions, total] = await Promise.all([
        prisma_1.prisma.transaction.findMany({
            where,
            skip,
            take: Number(limit),
            orderBy: { createdAt: "desc" },
            include: {
                fromUser: { select: { id: true, name: true, phone: true } },
                toUser: { select: { id: true, name: true, phone: true } },
            },
        }),
        prisma_1.prisma.transaction.count({ where }),
    ]);
    res.json({
        success: true,
        data: {
            transactions,
            pagination: {
                page: Number(page),
                limit: Number(limit),
                total,
                totalPages: Math.ceil(total / Number(limit)),
            },
        },
    });
}
async function depositMpesa(req, res) {
    const { amount, phone } = req.body ?? {};
    if (!amount || Number(amount) < 1)
        throw new errorHandler_1.AppError("Minimum deposit is KES 1", 400);
    if (!phone)
        throw new errorHandler_1.AppError("Phone number required", 400);
    const reference = `MPESA-DEP-${Date.now()}`;
    const transaction = await prisma_1.prisma.transaction.create({
        data: {
            toUserId: req.user.userId,
            amount: new client_1.Prisma.Decimal(amount),
            type: "DEPOSIT",
            status: "PENDING",
            reference,
            description: `M-Pesa deposit from ${phone}`,
            metadata: { phone, method: "mpesa" },
        },
    });
    try {
        const stkResponse = await mpesa_service_1.default.initiateSTKPush(String(phone), Number(amount), reference);
        await prisma_1.prisma.transaction.update({
            where: { id: transaction.id },
            data: {
                metadata: {
                    ...transaction.metadata,
                    merchantRequestID: stkResponse.MerchantRequestID,
                    checkoutRequestID: stkResponse.CheckoutRequestID,
                },
            },
        });
        res.json({
            success: true,
            data: {
                transaction: {
                    id: transaction.id,
                    reference,
                    amount: Number(transaction.amount),
                    status: "PENDING",
                    checkoutRequestID: stkResponse.CheckoutRequestID,
                },
                message: "Check your phone for M-Pesa prompt",
            },
        });
    }
    catch (error) {
        await prisma_1.prisma.transaction.update({
            where: { id: transaction.id },
            data: { status: "FAILED", metadata: { ...transaction.metadata, error: error?.message } },
        });
        throw new errorHandler_1.AppError("M-Pesa request failed", 500);
    }
}
async function depositCard(req, res) {
    const { amount } = req.body ?? {};
    if (!amount || Number(amount) < 1)
        throw new errorHandler_1.AppError("Minimum deposit is KES 1", 400);
    const reference = `CARD-DEP-${Date.now()}`;
    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
    const resultUrl = `${process.env.APP_URL || process.env.BACKEND_URL || "http://localhost:3000"}/api/callback/lemonade`;
    const walletNo = process.env.LEMONADE_WALLET_NO || "";
    if (!walletNo)
        throw new errorHandler_1.AppError("Card payments not configured (LEMONADE_WALLET_NO missing)", 500);
    const transaction = await prisma_1.prisma.transaction.create({
        data: {
            toUserId: req.user.userId,
            amount: new client_1.Prisma.Decimal(amount),
            type: "DEPOSIT",
            status: "PENDING",
            reference,
            description: "Card deposit",
            metadata: { method: "card", provider: "lemonade" },
        },
    });
    try {
        const user = await prisma_1.prisma.user.findUnique({
            where: { id: req.user.userId },
            select: { name: true, phone: true, email: true },
        });
        if (!user)
            throw new errorHandler_1.AppError("User not found", 404);
        const initiated = await lemonade_service_1.default.initiateCardPayment({
            walletNo,
            reference,
            amount: Number(amount),
            currency: "KES",
            customerName: user.name,
            customerPhone: user.phone,
            description: "Bridge wallet top-up (Card)",
            resultUrl,
            email: user.email,
        });
        await prisma_1.prisma.transaction.update({
            where: { id: transaction.id },
            data: {
                metadata: {
                    ...transaction.metadata,
                    lemonade: {
                        transaction_id: initiated.transactionId,
                        internal_id: initiated.internalId,
                        redirect_url: initiated.redirectUrl,
                    },
                },
            },
        });
        res.json({
            success: true,
            data: {
                // Keep key name `checkoutUrl` for frontend compatibility; Lemonade returns `redirect_url`.
                checkoutUrl: initiated.redirectUrl,
                providerTransactionId: initiated.transactionId,
                transaction: {
                    id: transaction.id,
                    reference,
                    amount: Number(transaction.amount),
                    status: "PENDING",
                },
            },
        });
    }
    catch (error) {
        await prisma_1.prisma.transaction.update({ where: { id: transaction.id }, data: { status: "FAILED" } });
        throw new errorHandler_1.AppError("Failed to create payment checkout", 500);
    }
}
async function checkCardPaymentStatus(req, res) {
    const { providerTransactionId } = req.params;
    if (!providerTransactionId)
        throw new errorHandler_1.AppError("providerTransactionId required", 400);
    // Find our transaction that belongs to this user
    const txRow = await prisma_1.prisma.transaction.findFirst({
        where: {
            toUserId: req.user.userId,
            type: "DEPOSIT",
            metadata: { path: ["lemonade", "transaction_id"], equals: providerTransactionId },
        },
    });
    if (!txRow)
        throw new errorHandler_1.AppError("Transaction not found", 404);
    const status = await lemonade_service_1.default.queryStatus(providerTransactionId);
    // If provider returns external_reference, reconcile by that; otherwise reconcile this tx reference.
    const ref = status?.data?.external_reference || txRow.reference;
    await lemonade_service_1.default.reconcileBridgeTransactionByReference(String(ref), status);
    const updated = await prisma_1.prisma.transaction.findUnique({ where: { id: txRow.id } });
    res.json({
        success: true,
        data: {
            provider: status,
            transaction: updated,
        },
    });
}
async function transfer(req, res) {
    const { recipientPhone, amount, note } = req.body ?? {};
    if (!recipientPhone)
        throw new errorHandler_1.AppError("Recipient phone required", 400);
    if (!amount || Number(amount) < 1)
        throw new errorHandler_1.AppError("Minimum transfer is KES 1", 400);
    const recipient = await prisma_1.prisma.user.findUnique({
        where: { phone: recipientPhone },
        select: { id: true, name: true, status: true },
    });
    if (!recipient)
        throw new errorHandler_1.AppError("Recipient not found", 404);
    if (recipient.status !== "ACTIVE")
        throw new errorHandler_1.AppError("Recipient account is not active", 400);
    if (recipient.id === req.user.userId)
        throw new errorHandler_1.AppError("Cannot transfer to yourself", 400);
    const senderWallet = await prisma_1.prisma.wallet.findUnique({ where: { userId: req.user.userId } });
    if (!senderWallet || Number(senderWallet.balance) < Number(amount))
        throw new errorHandler_1.AppError("Insufficient balance", 400);
    const sender = await prisma_1.prisma.user.findUnique({ where: { id: req.user.userId }, select: { name: true } });
    const senderName = sender?.name || "Someone";
    const result = await prisma_1.prisma.$transaction(async (tx) => {
        await tx.wallet.update({
            where: { userId: req.user.userId },
            data: { balance: { decrement: new client_1.Prisma.Decimal(amount) } },
        });
        await tx.wallet.update({
            where: { userId: recipient.id },
            data: { balance: { increment: new client_1.Prisma.Decimal(amount) } },
        });
        const txRow = await tx.transaction.create({
            data: {
                fromUserId: req.user.userId,
                toUserId: recipient.id,
                amount: new client_1.Prisma.Decimal(amount),
                type: "TRANSFER",
                status: "SUCCESS",
                reference: `TRF-${Date.now()}`,
                description: note || "Transfer",
            },
            include: { toUser: { select: { name: true, phone: true } } },
        });
        await tx.notification.create({
            data: {
                userId: recipient.id,
                type: "PAYMENT",
                title: "Money Received",
                message: `You received KES ${amount} from ${senderName}`,
                actionUrl: "/wallet",
            },
        });
        return txRow;
    });
    res.json({ success: true, data: { transaction: result } });
}
async function withdrawMpesa(req, res) {
    const { amount, phone } = req.body ?? {};
    if (!amount || Number(amount) < 10)
        throw new errorHandler_1.AppError("Minimum withdrawal is KES 10", 400);
    if (!phone)
        throw new errorHandler_1.AppError("Phone number required", 400);
    const fee = Math.min(Number(amount) * 0.01, 50);
    const total = Number(amount) + fee;
    const wallet = await prisma_1.prisma.wallet.findUnique({ where: { userId: req.user.userId } });
    if (!wallet || Number(wallet.balance) < total)
        throw new errorHandler_1.AppError("Insufficient balance", 400);
    const created = await prisma_1.prisma.$transaction(async (tx) => {
        await tx.wallet.update({
            where: { userId: req.user.userId },
            data: { balance: { decrement: new client_1.Prisma.Decimal(total) } },
        });
        return tx.transaction.create({
            data: {
                fromUserId: req.user.userId,
                amount: new client_1.Prisma.Decimal(amount),
                fee: new client_1.Prisma.Decimal(fee),
                type: "WITHDRAWAL",
                status: "PENDING",
                reference: `WD-${Date.now()}`,
                description: `Withdrawal to ${phone}`,
                metadata: { phone, method: "mpesa" },
            },
        });
    });
    try {
        const b2cResponse = await mpesa_service_1.default.withdrawToMpesa(String(phone), Number(amount), "Bridge Withdrawal");
        await prisma_1.prisma.transaction.update({
            where: { id: created.id },
            data: {
                metadata: {
                    ...created.metadata,
                    conversationID: b2cResponse.ConversationID,
                    originatorConversationID: b2cResponse.OriginatorConversationID,
                },
            },
        });
        res.json({
            success: true,
            data: { transaction: created, message: "Withdrawal initiated. You will receive M-Pesa shortly." },
        });
    }
    catch (error) {
        await prisma_1.prisma.$transaction(async (tx) => {
            await tx.wallet.update({
                where: { userId: req.user.userId },
                data: { balance: { increment: new client_1.Prisma.Decimal(total) } },
            });
            await tx.transaction.update({
                where: { id: created.id },
                data: { status: "FAILED", metadata: { ...created.metadata, error: error?.message } },
            });
        });
        throw new errorHandler_1.AppError("Withdrawal failed", 500);
    }
}
async function checkPaymentStatus(req, res) {
    const { checkoutRequestID } = req.params;
    if (!checkoutRequestID)
        throw new errorHandler_1.AppError("checkoutRequestID required", 400);
    const status = await mpesa_service_1.default.checkTransactionStatus(checkoutRequestID);
    res.json({ success: true, data: status });
}
async function createReceipt(req, res) {
    const { transactionId } = req.params;
    if (!transactionId)
        throw new errorHandler_1.AppError("transactionId required", 400);
    const tx = await prisma_1.prisma.transaction.findUnique({
        where: { id: transactionId },
        select: { id: true, fromUserId: true, toUserId: true, receiptUrl: true },
    });
    if (!tx)
        throw new errorHandler_1.AppError("Transaction not found", 404);
    const isOwner = tx.fromUserId === req.user.userId || tx.toUserId === req.user.userId;
    if (!isOwner)
        throw new errorHandler_1.AppError("Unauthorized", 403);
    if (tx.receiptUrl)
        return res.json({ success: true, data: { receiptUrl: tx.receiptUrl } });
    try {
        const receiptUrl = await (0, receipt_service_1.generateReceipt)(tx.id);
        res.json({ success: true, data: { receiptUrl } });
    }
    catch (e) {
        throw new errorHandler_1.AppError(e?.message || "Failed to generate receipt", 500);
    }
}
//# sourceMappingURL=wallet.controller.js.map