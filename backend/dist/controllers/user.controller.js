"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.searchUsers = searchUsers;
exports.browseImplementers = browseImplementers;
exports.getImplementerProfile = getImplementerProfile;
exports.updateProfile = updateProfile;
const client_1 = require("@prisma/client");
const prisma_1 = require("../lib/prisma");
const errorHandler_1 = require("../middleware/errorHandler");
async function searchUsers(req, res) {
    const { q, type } = req.query;
    if (!q)
        throw new errorHandler_1.AppError("Search query required", 400);
    const where = { status: "ACTIVE", id: { not: req.user.userId } };
    switch (type) {
        case "phone":
            where.phone = { contains: q };
            break;
        case "email":
            where.email = { contains: q, mode: "insensitive" };
            break;
        default:
            where.OR = [
                { phone: { contains: q } },
                { email: { contains: q, mode: "insensitive" } },
                { name: { contains: q, mode: "insensitive" } },
            ];
    }
    const users = await prisma_1.prisma.user.findMany({
        where,
        take: 10,
        select: { id: true, name: true, phone: true, email: true, role: true, kycStatus: true },
    });
    res.json({ success: true, data: { users } });
}
async function browseImplementers(req, res) {
    const { page = 1, limit = 20, skills, minRating } = req.query;
    const skip = (Number(page) - 1) * Number(limit);
    const where = { role: "IMPLEMENTER", status: "ACTIVE", kycStatus: "VERIFIED" };
    if (skills) {
        where.profile = {
            skills: { hasSome: String(skills).split(",") },
        };
    }
    if (minRating) {
        where.profile = {
            ...(where.profile || {}),
            averageRating: { gte: new client_1.Prisma.Decimal(minRating) },
        };
    }
    const [implementers, total] = await Promise.all([
        prisma_1.prisma.user.findMany({
            where,
            skip,
            take: Number(limit),
            select: {
                id: true,
                name: true,
                profile: {
                    select: {
                        bio: true,
                        skills: true,
                        hourlyRate: true,
                        averageRating: true,
                        totalReviews: true,
                        completedProjects: true,
                        portfolio: true,
                    },
                },
            },
            orderBy: { profile: { averageRating: "desc" } },
        }),
        prisma_1.prisma.user.count({ where }),
    ]);
    res.json({
        success: true,
        data: { implementers, pagination: { page: Number(page), limit: Number(limit), total, totalPages: Math.ceil(total / Number(limit)) } },
    });
}
async function getImplementerProfile(req, res) {
    const { id } = req.params;
    if (!id)
        throw new errorHandler_1.AppError("Implementer id required", 400);
    const implementer = await prisma_1.prisma.user.findUnique({
        where: { id },
        select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            createdAt: true,
            profile: {
                select: {
                    bio: true,
                    skills: true,
                    hourlyRate: true,
                    availability: true,
                    location: true,
                    languages: true,
                    experience: true,
                    averageRating: true,
                    totalReviews: true,
                    completedProjects: true,
                    portfolio: true,
                },
            },
            reviewsReceived: {
                take: 10,
                orderBy: { createdAt: "desc" },
                include: { reviewer: { select: { name: true } } },
            },
        },
    });
    if (!implementer)
        throw new errorHandler_1.AppError("Implementer not found", 404);
    res.json({ success: true, data: { implementer } });
}
async function updateProfile(req, res) {
    const { bio, skills, hourlyRate, availability, location, languages, experience, portfolio } = req.body ?? {};
    const user = await prisma_1.prisma.user.findUnique({ where: { id: req.user.userId } });
    if (user?.role !== "IMPLEMENTER")
        throw new errorHandler_1.AppError("Only implementers can update profile", 403);
    const profile = await prisma_1.prisma.userProfile.upsert({
        where: { userId: req.user.userId },
        update: {
            bio,
            skills: skills ?? [],
            hourlyRate: hourlyRate ? new client_1.Prisma.Decimal(hourlyRate) : null,
            availability,
            location,
            languages: languages ?? [],
            experience,
            portfolio,
        },
        create: {
            userId: req.user.userId,
            bio,
            skills: skills ?? [],
            hourlyRate: hourlyRate ? new client_1.Prisma.Decimal(hourlyRate) : null,
            availability,
            location,
            languages: languages ?? [],
            experience,
            portfolio,
        },
    });
    res.json({ success: true, data: { profile } });
}
//# sourceMappingURL=user.controller.js.map