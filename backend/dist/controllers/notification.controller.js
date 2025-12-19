"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listNotifications = listNotifications;
exports.markRead = markRead;
exports.markAllRead = markAllRead;
const prisma_1 = require("../lib/prisma");
const errorHandler_1 = require("../middleware/errorHandler");
async function listNotifications(req, res) {
    const { page = 1, limit = 20, unread } = req.query;
    const skip = (Number(page) - 1) * Number(limit);
    const where = { userId: req.user.userId };
    if (unread === "true")
        where.read = false;
    const [items, total] = await Promise.all([
        prisma_1.prisma.notification.findMany({
            where,
            orderBy: { createdAt: "desc" },
            skip,
            take: Number(limit),
        }),
        prisma_1.prisma.notification.count({ where }),
    ]);
    res.json({
        success: true,
        data: {
            notifications: items,
            pagination: { page: Number(page), limit: Number(limit), total, totalPages: Math.ceil(total / Number(limit)) },
        },
    });
}
async function markRead(req, res) {
    const { id } = req.params;
    if (!id)
        throw new errorHandler_1.AppError("Notification id required", 400);
    const existing = await prisma_1.prisma.notification.findUnique({ where: { id }, select: { userId: true } });
    if (!existing)
        throw new errorHandler_1.AppError("Notification not found", 404);
    if (existing.userId !== req.user.userId)
        throw new errorHandler_1.AppError("Unauthorized", 403);
    await prisma_1.prisma.notification.update({ where: { id }, data: { read: true } });
    res.json({ success: true });
}
async function markAllRead(req, res) {
    await prisma_1.prisma.notification.updateMany({ where: { userId: req.user.userId, read: false }, data: { read: true } });
    res.json({ success: true });
}
//# sourceMappingURL=notification.controller.js.map