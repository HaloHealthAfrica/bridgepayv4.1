"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getConversations = getConversations;
exports.getMessages = getMessages;
exports.createConversation = createConversation;
const prisma_1 = require("../lib/prisma");
const errorHandler_1 = require("../middleware/errorHandler");
async function getConversations(req, res) {
    const conversations = await prisma_1.prisma.conversation.findMany({
        where: { participants: { has: req.user.userId } },
        orderBy: { lastMessageAt: "desc" },
        include: {
            messages: { take: 1, orderBy: { createdAt: "desc" } },
            project: { select: { id: true, title: true } },
        },
    });
    const enriched = await Promise.all(conversations.map(async (conv) => {
        const otherParticipantId = conv.participants.find((p) => p !== req.user.userId);
        const otherParticipant = otherParticipantId
            ? await prisma_1.prisma.user.findUnique({ where: { id: otherParticipantId }, select: { id: true, name: true } })
            : null;
        return { ...conv, otherParticipant };
    }));
    res.json({ success: true, data: { conversations: enriched } });
}
async function getMessages(req, res) {
    const { conversationId } = req.params;
    if (!conversationId)
        throw new errorHandler_1.AppError("conversationId required", 400);
    const { page = 1, limit = 50 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);
    const conversation = await prisma_1.prisma.conversation.findUnique({ where: { id: conversationId } });
    if (!conversation || !conversation.participants.includes(req.user.userId))
        throw new errorHandler_1.AppError("Unauthorized", 403);
    const messages = await prisma_1.prisma.message.findMany({
        where: { conversationId },
        skip,
        take: Number(limit),
        orderBy: { createdAt: "desc" },
        include: { sender: { select: { id: true, name: true } } },
    });
    res.json({ success: true, data: { messages: messages.reverse() } });
}
async function createConversation(req, res) {
    const { projectId, participantId } = req.body ?? {};
    if (!participantId)
        throw new errorHandler_1.AppError("participantId required", 400);
    const existing = await prisma_1.prisma.conversation.findFirst({
        where: { projectId, participants: { hasEvery: [req.user.userId, participantId] } },
    });
    if (existing)
        return res.json({ success: true, data: { conversation: existing } });
    const conversation = await prisma_1.prisma.conversation.create({
        data: { projectId, participants: [req.user.userId, participantId] },
    });
    res.status(201).json({ success: true, data: { conversation } });
}
//# sourceMappingURL=message.controller.js.map