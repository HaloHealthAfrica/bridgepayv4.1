"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createReview = createReview;
exports.getReviews = getReviews;
const client_1 = require("@prisma/client");
const prisma_1 = require("../lib/prisma");
const errorHandler_1 = require("../middleware/errorHandler");
async function createReview(req, res) {
    const projectId = req.body?.projectId ?? undefined;
    const revieweeId = req.body?.revieweeId ?? undefined;
    const rating = req.body?.rating;
    const comment = req.body?.comment;
    if (!projectId || !revieweeId)
        throw new errorHandler_1.AppError("Missing required fields", 400);
    if (!rating || Number(rating) < 1 || Number(rating) > 5)
        throw new errorHandler_1.AppError("Rating must be between 1 and 5", 400);
    const project = await prisma_1.prisma.project.findUnique({
        where: { id: projectId },
        select: { ownerId: true, implementerId: true, status: true },
    });
    if (!project)
        throw new errorHandler_1.AppError("Project not found", 404);
    if (project.status !== "COMPLETED")
        throw new errorHandler_1.AppError("Can only review completed projects", 400);
    if (project.ownerId !== req.user.userId)
        throw new errorHandler_1.AppError("Only project owner can review", 403);
    if (project.implementerId !== revieweeId)
        throw new errorHandler_1.AppError("Invalid reviewee", 400);
    const existing = await prisma_1.prisma.review.findUnique({
        where: { projectId_reviewerId: { projectId, reviewerId: req.user.userId } },
    });
    if (existing)
        throw new errorHandler_1.AppError("Already reviewed", 400);
    await prisma_1.prisma.$transaction(async (tx) => {
        await tx.review.create({
            data: { projectId, reviewerId: req.user.userId, revieweeId, rating: Number(rating), comment: comment ?? null },
        });
        const reviews = await tx.review.findMany({ where: { revieweeId }, select: { rating: true } });
        const avgRating = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
        await tx.userProfile.update({
            where: { userId: revieweeId },
            data: { averageRating: new client_1.Prisma.Decimal(avgRating), totalReviews: reviews.length, completedProjects: { increment: 1 } },
        });
        await tx.notification.create({
            data: { userId: revieweeId, type: "PROJECT", title: "New Review", message: `You received a ${rating}-star review`, actionUrl: "/profile" },
        });
    });
    res.status(201).json({ success: true, message: "Review submitted" });
}
async function getReviews(req, res) {
    const { userId } = req.params;
    if (!userId)
        throw new errorHandler_1.AppError("userId required", 400);
    const { page = 1, limit = 10 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);
    const [reviews, total] = await Promise.all([
        prisma_1.prisma.review.findMany({
            where: { revieweeId: userId },
            skip,
            take: Number(limit),
            orderBy: { createdAt: "desc" },
            include: { reviewer: { select: { name: true } } },
        }),
        prisma_1.prisma.review.count({ where: { revieweeId: userId } }),
    ]);
    res.json({
        success: true,
        data: { reviews, pagination: { page: Number(page), limit: Number(limit), total, totalPages: Math.ceil(total / Number(limit)) } },
    });
}
//# sourceMappingURL=review.controller.js.map