"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initializeSocket = void 0;
const socket_io_1 = require("socket.io");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const prisma_1 = require("../lib/prisma");
const initializeSocket = (server) => {
    const io = new socket_io_1.Server(server, {
        cors: {
            origin: process.env.FRONTEND_URL,
            credentials: true,
        },
    });
    io.use(async (socket, next) => {
        try {
            const token = socket.handshake.auth?.token;
            if (!token)
                return next(new Error("Authentication error"));
            const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_ACCESS_SECRET);
            socket.data.userId = decoded.userId;
            next();
        }
        catch {
            next(new Error("Authentication error"));
        }
    });
    io.on("connection", (socket) => {
        // eslint-disable-next-line no-console
        console.log("User connected:", socket.data.userId);
        socket.on("join_conversation", async (conversationId) => {
            const conversation = await prisma_1.prisma.conversation.findUnique({ where: { id: conversationId } });
            if (conversation && conversation.participants.includes(socket.data.userId)) {
                socket.join(conversationId);
            }
        });
        socket.on("send_message", async (data) => {
            try {
                const createData = {
                    conversationId: data.conversationId,
                    senderId: socket.data.userId,
                    content: data.content,
                };
                if (data.attachments && data.attachments.length > 0) {
                    createData.attachments = data.attachments;
                }
                const message = await prisma_1.prisma.message.create({
                    data: {
                        ...createData,
                    },
                    include: { sender: { select: { name: true } } },
                });
                await prisma_1.prisma.conversation.update({
                    where: { id: data.conversationId },
                    data: { lastMessage: data.content, lastMessageAt: new Date() },
                });
                io.to(data.conversationId).emit("new_message", message);
                const conversation = await prisma_1.prisma.conversation.findUnique({ where: { id: data.conversationId } });
                const otherParticipants = (conversation?.participants || []).filter((p) => p !== socket.data.userId);
                for (const participantId of otherParticipants) {
                    await prisma_1.prisma.notification.create({
                        data: {
                            userId: participantId,
                            type: "MESSAGE",
                            title: "New Message",
                            message: `${message.sender.name}: ${data.content.substring(0, 50)}...`,
                            actionUrl: `/messages/${data.conversationId}`,
                        },
                    });
                }
            }
            catch (error) {
                // eslint-disable-next-line no-console
                console.error("Send message error:", error);
            }
        });
        socket.on("mark_read", async (conversationId) => {
            await prisma_1.prisma.message.updateMany({
                where: { conversationId, senderId: { not: socket.data.userId }, status: { not: "READ" } },
                data: { status: "READ" },
            });
            socket.to(conversationId).emit("messages_read", conversationId);
        });
        socket.on("disconnect", () => {
            // eslint-disable-next-line no-console
            console.log("User disconnected:", socket.data.userId);
        });
    });
    return io;
};
exports.initializeSocket = initializeSocket;
//# sourceMappingURL=socket.service.js.map