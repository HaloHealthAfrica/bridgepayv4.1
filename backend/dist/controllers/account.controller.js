"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateMe = updateMe;
exports.listSessions = listSessions;
const prisma_1 = require("../lib/prisma");
const errorHandler_1 = require("../middleware/errorHandler");
async function updateMe(req, res) {
    const { name, email, phone } = req.body ?? {};
    if (!name && !email && !phone)
        throw new errorHandler_1.AppError("No changes provided", 400);
    // Basic uniqueness checks if changing email/phone
    if (email) {
        const existing = await prisma_1.prisma.user.findFirst({
            where: { email, id: { not: req.user.userId } },
            select: { id: true },
        });
        if (existing)
            throw new errorHandler_1.AppError("Email already in use", 400);
    }
    if (phone) {
        const existing = await prisma_1.prisma.user.findFirst({
            where: { phone, id: { not: req.user.userId } },
            select: { id: true },
        });
        if (existing)
            throw new errorHandler_1.AppError("Phone already in use", 400);
    }
    const user = await prisma_1.prisma.user.update({
        where: { id: req.user.userId },
        data: {
            name: name ?? undefined,
            email: email ?? undefined,
            phone: phone ?? undefined,
        },
        select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            role: true,
            kycStatus: true,
            status: true,
            twoFactorEnabled: true,
            createdAt: true,
            updatedAt: true,
        },
    });
    res.json({ success: true, data: { user } });
}
async function listSessions(req, res) {
    const sessions = await prisma_1.prisma.session.findMany({
        where: { userId: req.user.userId },
        orderBy: { lastActive: "desc" },
        take: 50,
    });
    res.json({ success: true, data: { sessions } });
}
//# sourceMappingURL=account.controller.js.map