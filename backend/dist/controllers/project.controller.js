"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createProject = createProject;
exports.getProjects = getProjects;
exports.getProjectById = getProjectById;
exports.publishProject = publishProject;
exports.applyToProject = applyToProject;
exports.assignImplementer = assignImplementer;
exports.fundProject = fundProject;
exports.submitEvidence = submitEvidence;
exports.approveMilestone = approveMilestone;
exports.rejectMilestone = rejectMilestone;
const client_1 = require("@prisma/client");
const prisma_1 = require("../lib/prisma");
const errorHandler_1 = require("../middleware/errorHandler");
const storage_service_1 = require("../services/storage.service");
async function createProject(req, res) {
    const { title, description, category, budget, milestones, deadline } = req.body ?? {};
    if (!title || !description || !budget || !milestones || milestones.length === 0) {
        throw new errorHandler_1.AppError("Missing required fields", 400);
    }
    const milestonesTotal = milestones.reduce((sum, m) => sum + Number(m.amount || 0), 0);
    if (Math.abs(milestonesTotal - Number(budget)) > 0.01) {
        throw new errorHandler_1.AppError("Milestones total must equal project budget", 400);
    }
    const project = await prisma_1.prisma.project.create({
        data: {
            title,
            description,
            category,
            budget: new client_1.Prisma.Decimal(budget),
            deadline: deadline ? new Date(deadline) : null,
            ownerId: req.user.userId,
            status: "DRAFT",
            milestones: {
                create: milestones.map((m) => ({
                    title: m.title,
                    description: m.description,
                    amount: new client_1.Prisma.Decimal(m.amount),
                    dueDate: m.dueDate ? new Date(m.dueDate) : null,
                })),
            },
        },
        include: { milestones: true },
    });
    res.status(201).json({ success: true, data: { project } });
}
async function getProjects(req, res) {
    const { page = 1, limit = 20, status, category, search, role } = req.query;
    const skip = (Number(page) - 1) * Number(limit);
    const where = {};
    if (role === "owner")
        where.ownerId = req.user.userId;
    else if (role === "implementer")
        where.implementerId = req.user.userId;
    else if (role === "browse") {
        where.status = "OPEN";
        where.implementerId = null;
    }
    if (status)
        where.status = status;
    if (category)
        where.category = category;
    if (search) {
        where.OR = [
            { title: { contains: search, mode: "insensitive" } },
            { description: { contains: search, mode: "insensitive" } },
        ];
    }
    const [projects, total] = await Promise.all([
        prisma_1.prisma.project.findMany({
            where,
            skip,
            take: Number(limit),
            orderBy: { createdAt: "desc" },
            include: {
                owner: { select: { id: true, name: true, phone: true } },
                implementer: { select: { id: true, name: true, phone: true } },
                milestones: { select: { id: true, title: true, amount: true, status: true, dueDate: true } },
                _count: { select: { applications: true } },
            },
        }),
        prisma_1.prisma.project.count({ where }),
    ]);
    res.json({
        success: true,
        data: {
            projects,
            pagination: {
                page: Number(page),
                limit: Number(limit),
                total,
                totalPages: Math.ceil(total / Number(limit)),
            },
        },
    });
}
async function getProjectById(req, res) {
    const { id } = req.params;
    if (!id)
        throw new errorHandler_1.AppError("Project id required", 400);
    const project = await prisma_1.prisma.project.findUnique({
        where: { id },
        include: {
            owner: {
                select: {
                    id: true,
                    name: true,
                    phone: true,
                    profile: { select: { averageRating: true, totalReviews: true } },
                },
            },
            implementer: {
                select: {
                    id: true,
                    name: true,
                    phone: true,
                    profile: {
                        select: {
                            bio: true,
                            skills: true,
                            averageRating: true,
                            totalReviews: true,
                            completedProjects: true,
                        },
                    },
                },
            },
            milestones: {
                orderBy: { createdAt: "asc" },
                include: { verifier: { select: { id: true, name: true } } },
            },
            applications: {
                where: { status: "PENDING" },
                include: {
                    applicant: {
                        select: {
                            id: true,
                            name: true,
                            profile: {
                                select: { bio: true, skills: true, averageRating: true, completedProjects: true },
                            },
                        },
                    },
                },
            },
        },
    });
    if (!project)
        throw new errorHandler_1.AppError("Project not found", 404);
    await prisma_1.prisma.project.update({ where: { id }, data: { views: { increment: 1 } } });
    res.json({ success: true, data: { project } });
}
async function publishProject(req, res) {
    const { id } = req.params;
    if (!id)
        throw new errorHandler_1.AppError("Project id required", 400);
    const project = await prisma_1.prisma.project.findUnique({ where: { id }, include: { milestones: true } });
    if (!project)
        throw new errorHandler_1.AppError("Project not found", 404);
    if (project.ownerId !== req.user.userId)
        throw new errorHandler_1.AppError("Unauthorized", 403);
    if (project.status !== "DRAFT")
        throw new errorHandler_1.AppError("Project already published", 400);
    if (project.milestones.length === 0)
        throw new errorHandler_1.AppError("Add at least one milestone", 400);
    await prisma_1.prisma.project.update({ where: { id }, data: { status: "OPEN" } });
    res.json({ success: true, message: "Project published successfully" });
}
async function applyToProject(req, res) {
    const { id } = req.params;
    if (!id)
        throw new errorHandler_1.AppError("Project id required", 400);
    const { coverLetter, proposedRate, estimatedDuration } = req.body ?? {};
    const user = await prisma_1.prisma.user.findUnique({ where: { id: req.user.userId } });
    if (user?.role !== "IMPLEMENTER")
        throw new errorHandler_1.AppError("Only implementers can apply", 403);
    const existingApplication = await prisma_1.prisma.projectApplication.findUnique({
        where: { projectId_userId: { projectId: id, userId: req.user.userId } },
    });
    if (existingApplication)
        throw new errorHandler_1.AppError("Already applied to this project", 400);
    const application = await prisma_1.prisma.projectApplication.create({
        data: {
            projectId: id,
            userId: req.user.userId,
            coverLetter,
            proposedRate: proposedRate ? new client_1.Prisma.Decimal(proposedRate) : null,
            estimatedDuration,
        },
    });
    const project = await prisma_1.prisma.project.findUnique({ where: { id }, select: { ownerId: true, title: true } });
    if (project) {
        await prisma_1.prisma.notification.create({
            data: {
                userId: project.ownerId,
                type: "PROJECT",
                title: "New Project Application",
                message: `Someone applied to your project: ${project.title}`,
                actionUrl: `/projects/${id}`,
            },
        });
    }
    res.status(201).json({ success: true, data: { application } });
}
async function assignImplementer(req, res) {
    const { id } = req.params;
    if (!id)
        throw new errorHandler_1.AppError("Project id required", 400);
    const { implementerId } = req.body ?? {};
    if (!implementerId)
        throw new errorHandler_1.AppError("implementerId required", 400);
    const project = await prisma_1.prisma.project.findUnique({ where: { id } });
    if (!project)
        throw new errorHandler_1.AppError("Project not found", 404);
    if (project.ownerId !== req.user.userId)
        throw new errorHandler_1.AppError("Unauthorized", 403);
    if (project.status !== "OPEN")
        throw new errorHandler_1.AppError("Project not open for assignment", 400);
    await prisma_1.prisma.$transaction(async (tx) => {
        await tx.project.update({ where: { id }, data: { implementerId, status: "ASSIGNED" } });
        await tx.projectApplication.updateMany({ where: { projectId: id }, data: { status: "REJECTED" } });
        await tx.projectApplication.update({
            where: { projectId_userId: { projectId: id, userId: implementerId } },
            data: { status: "ACCEPTED" },
        });
        await tx.notification.create({
            data: {
                userId: implementerId,
                type: "PROJECT",
                title: "Project Assigned",
                message: `You've been assigned to project: ${project.title}`,
                actionUrl: `/projects/${id}`,
            },
        });
    });
    res.json({ success: true, message: "Implementer assigned successfully" });
}
async function fundProject(req, res) {
    const { id } = req.params;
    if (!id)
        throw new errorHandler_1.AppError("Project id required", 400);
    const project = await prisma_1.prisma.project.findUnique({ where: { id }, include: { milestones: true } });
    if (!project)
        throw new errorHandler_1.AppError("Project not found", 404);
    if (project.ownerId !== req.user.userId)
        throw new errorHandler_1.AppError("Unauthorized", 403);
    if (!project.implementerId)
        throw new errorHandler_1.AppError("Assign implementer first", 400);
    const wallet = await prisma_1.prisma.wallet.findUnique({ where: { userId: req.user.userId } });
    if (!wallet || Number(wallet.balance) < Number(project.budget))
        throw new errorHandler_1.AppError("Insufficient balance", 400);
    await prisma_1.prisma.$transaction(async (tx) => {
        await tx.wallet.update({
            where: { userId: req.user.userId },
            data: {
                balance: { decrement: project.budget },
                escrowBalance: { increment: project.budget },
            },
        });
        await tx.project.update({
            where: { id },
            data: { status: "ACTIVE", escrowBalance: project.budget, startDate: new Date() },
        });
        await tx.transaction.create({
            data: {
                fromUserId: req.user.userId,
                amount: project.budget,
                type: "ESCROW_LOCK",
                status: "SUCCESS",
                reference: `ESC-LOCK-${Date.now()}`,
                description: `Escrow lock for project: ${project.title}`,
                metadata: { projectId: id },
            },
        });
        await tx.notification.create({
            data: {
                userId: project.implementerId,
                type: "PROJECT",
                title: "Project Funded",
                message: `Project "${project.title}" has been funded. Start working!`,
                actionUrl: `/projects/${id}`,
            },
        });
    });
    res.json({ success: true, message: "Project funded successfully" });
}
async function submitEvidence(req, res) {
    const { projectId, milestoneId } = req.params;
    if (!projectId)
        throw new errorHandler_1.AppError("projectId required", 400);
    if (!milestoneId)
        throw new errorHandler_1.AppError("milestoneId required", 400);
    const { description, links } = req.body ?? {};
    const files = req.files || [];
    const milestone = await prisma_1.prisma.milestone.findUnique({ where: { id: milestoneId }, include: { project: true } });
    if (!milestone)
        throw new errorHandler_1.AppError("Milestone not found", 404);
    if (milestone.project.implementerId !== req.user.userId)
        throw new errorHandler_1.AppError("Unauthorized", 403);
    if (!["PENDING", "IN_PROGRESS"].includes(milestone.status))
        throw new errorHandler_1.AppError("Milestone not available", 400);
    const fileUrls = await (0, storage_service_1.uploadFilesToS3)(files.map((f) => ({ buffer: f.buffer, originalname: f.originalname, mimetype: f.mimetype })), "evidence");
    await prisma_1.prisma.$transaction(async (tx) => {
        await tx.milestone.update({
            where: { id: milestoneId },
            data: {
                status: "SUBMITTED",
                evidence: { files: fileUrls, links: links || [], description },
                submittedAt: new Date(),
            },
        });
        await tx.notification.create({
            data: {
                userId: milestone.project.ownerId,
                type: "PROJECT",
                title: "Milestone Evidence Submitted",
                message: `Evidence submitted for: ${milestone.title}`,
                actionUrl: `/projects/${projectId}`,
            },
        });
    });
    res.json({ success: true, message: "Evidence submitted successfully" });
}
async function approveMilestone(req, res) {
    const { projectId, milestoneId } = req.params;
    if (!projectId)
        throw new errorHandler_1.AppError("projectId required", 400);
    if (!milestoneId)
        throw new errorHandler_1.AppError("milestoneId required", 400);
    const { notes } = req.body ?? {};
    const milestone = await prisma_1.prisma.milestone.findUnique({ where: { id: milestoneId }, include: { project: true } });
    if (!milestone)
        throw new errorHandler_1.AppError("Milestone not found", 404);
    const isOwner = milestone.project.ownerId === req.user.userId;
    const isVerifier = req.user.role === "PROJECT_VERIFIER";
    if (!isOwner && !isVerifier)
        throw new errorHandler_1.AppError("Unauthorized", 403);
    if (!["SUBMITTED", "IN_REVIEW"].includes(milestone.status))
        throw new errorHandler_1.AppError("Not ready for approval", 400);
    await prisma_1.prisma.$transaction(async (tx) => {
        await tx.milestone.update({
            where: { id: milestoneId },
            data: {
                status: "APPROVED",
                verifierId: req.user.userId,
                verifierNotes: notes,
                approvedAt: new Date(),
            },
        });
        await tx.wallet.update({
            where: { userId: milestone.project.ownerId },
            data: { escrowBalance: { decrement: milestone.amount } },
        });
        if (milestone.project.implementerId) {
            await tx.wallet.update({
                where: { userId: milestone.project.implementerId },
                data: { balance: { increment: milestone.amount } },
            });
        }
        await tx.project.update({
            where: { id: projectId },
            data: { escrowBalance: { decrement: milestone.amount } },
        });
        await tx.transaction.create({
            data: {
                fromUserId: milestone.project.ownerId,
                toUserId: milestone.project.implementerId,
                amount: milestone.amount,
                type: "ESCROW_RELEASE",
                status: "SUCCESS",
                reference: `ESC-REL-${Date.now()}`,
                description: `Milestone approved: ${milestone.title}`,
                metadata: { projectId, milestoneId },
            },
        });
        await tx.notification.create({
            data: {
                userId: milestone.project.implementerId,
                type: "PROJECT",
                title: "Milestone Approved!",
                message: `KES ${milestone.amount} released for: ${milestone.title}`,
                actionUrl: `/projects/${projectId}`,
            },
        });
        const remaining = await tx.milestone.count({
            where: { projectId, status: { notIn: ["APPROVED", "REJECTED"] } },
        });
        if (remaining === 0) {
            await tx.project.update({ where: { id: projectId }, data: { status: "COMPLETED", endDate: new Date() } });
        }
    });
    res.json({ success: true, message: "Milestone approved and funds released" });
}
async function rejectMilestone(req, res) {
    const { projectId, milestoneId } = req.params;
    if (!projectId)
        throw new errorHandler_1.AppError("projectId required", 400);
    if (!milestoneId)
        throw new errorHandler_1.AppError("milestoneId required", 400);
    const { reason } = req.body ?? {};
    const milestone = await prisma_1.prisma.milestone.findUnique({ where: { id: milestoneId }, include: { project: true } });
    if (!milestone)
        throw new errorHandler_1.AppError("Milestone not found", 404);
    const isOwner = milestone.project.ownerId === req.user.userId;
    const isVerifier = req.user.role === "PROJECT_VERIFIER";
    if (!isOwner && !isVerifier)
        throw new errorHandler_1.AppError("Unauthorized", 403);
    await prisma_1.prisma.$transaction(async (tx) => {
        await tx.milestone.update({
            where: { id: milestoneId },
            data: { status: "REJECTED", verifierId: req.user.userId, verifierNotes: reason },
        });
        await tx.notification.create({
            data: {
                userId: milestone.project.implementerId,
                type: "PROJECT",
                title: "Milestone Rejected",
                message: `Milestone "${milestone.title}" needs revision: ${reason}`,
                actionUrl: `/projects/${projectId}`,
            },
        });
    });
    res.json({ success: true, message: "Milestone rejected" });
}
//# sourceMappingURL=project.controller.js.map