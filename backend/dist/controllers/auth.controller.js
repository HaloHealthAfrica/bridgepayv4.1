"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.register = register;
exports.login = login;
exports.getMe = getMe;
exports.refreshToken = refreshToken;
exports.logout = logout;
exports.logoutAll = logoutAll;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const crypto_1 = __importDefault(require("crypto"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const speakeasy_1 = __importDefault(require("speakeasy"));
const prisma_1 = require("../lib/prisma");
const errorHandler_1 = require("../middleware/errorHandler");
function parseExpiryMs(value, fallbackMs) {
    const v = String(value || "").trim();
    const match = v.match(/^(\d+)\s*([smhd])$/i);
    if (!match)
        return fallbackMs;
    const n = Number(match[1]);
    const unit = (match[2] ?? "d").toLowerCase();
    const mult = unit === "s" ? 1000 : unit === "m" ? 60_000 : unit === "h" ? 3_600_000 : 86_400_000;
    return n * mult;
}
function sha256Hex(input) {
    return crypto_1.default.createHash("sha256").update(input).digest("hex");
}
function generateTokens(userId, role, sessionId, refreshJti) {
    const accessExpiry = (process.env.JWT_ACCESS_EXPIRY || "15m");
    const refreshExpiry = (process.env.JWT_REFRESH_EXPIRY || "7d");
    const accessToken = jsonwebtoken_1.default.sign({ userId, role, sid: sessionId }, process.env.JWT_ACCESS_SECRET, {
        expiresIn: accessExpiry,
    });
    const refreshToken = jsonwebtoken_1.default.sign({ userId, role, sid: sessionId, jti: refreshJti }, process.env.JWT_REFRESH_SECRET, {
        expiresIn: refreshExpiry,
    });
    return { accessToken, refreshToken };
}
async function register(req, res) {
    const { email, phone, password, name, role } = req.body ?? {};
    if (!email || !phone || !password || !name)
        throw new errorHandler_1.AppError("All fields required", 400);
    const existing = await prisma_1.prisma.user.findFirst({
        where: { OR: [{ email }, { phone }] },
        select: { id: true },
    });
    if (existing)
        throw new errorHandler_1.AppError("User already exists", 400);
    const hashedPassword = await bcryptjs_1.default.hash(String(password), 10);
    const user = await prisma_1.prisma.$transaction(async (tx) => {
        const newUser = await tx.user.create({
            data: {
                email,
                phone,
                password: hashedPassword,
                name,
                role: role || "CUSTOMER",
            },
        });
        await tx.wallet.create({ data: { userId: newUser.id } });
        await tx.kYCSubmission.create({ data: { userId: newUser.id } });
        if (newUser.role === "IMPLEMENTER") {
            await tx.userProfile.create({ data: { userId: newUser.id, skills: [], languages: [] } });
        }
        if (newUser.role === "MERCHANT") {
            await tx.merchantProfile.create({
                data: { userId: newUser.id, businessName: name, paymentMethods: ["MPESA", "CARD"] },
            });
        }
        return newUser;
    });
    const sessionId = crypto_1.default.randomUUID();
    const refreshJti = crypto_1.default.randomUUID();
    const refreshMs = parseExpiryMs(String(process.env.JWT_REFRESH_EXPIRY || "7d"), 7 * 24 * 60 * 60 * 1000);
    const refreshTokenPreview = generateTokens(user.id, user.role, sessionId, refreshJti).refreshToken;
    const refreshTokenHash = sha256Hex(refreshTokenPreview);
    await prisma_1.prisma.session.create({
        data: {
            id: sessionId,
            userId: user.id,
            deviceInfo: req.headers["user-agent"] || "Unknown",
            ipAddress: req.ip ?? null,
            expiresAt: new Date(Date.now() + refreshMs),
            refreshTokenHash,
            refreshTokenJti: refreshJti,
            lastActive: new Date(),
        },
    });
    // Re-issue tokens (same inputs) for response
    const { accessToken, refreshToken } = generateTokens(user.id, user.role, sessionId, refreshJti);
    res.status(201).json({
        success: true,
        data: {
            user: {
                id: user.id,
                email: user.email,
                phone: user.phone,
                name: user.name,
                role: user.role,
                kycStatus: user.kycStatus,
            },
            accessToken,
            refreshToken,
        },
    });
}
async function login(req, res) {
    const { email, password, twoFactorCode } = req.body ?? {};
    const user = await prisma_1.prisma.user.findUnique({ where: { email }, include: { merchantProfile: true } });
    if (!user)
        throw new errorHandler_1.AppError("Invalid credentials", 401);
    if (user.status !== "ACTIVE")
        throw new errorHandler_1.AppError("Account suspended", 403);
    const isValidPassword = await bcryptjs_1.default.compare(String(password), user.password);
    if (!isValidPassword)
        throw new errorHandler_1.AppError("Invalid credentials", 401);
    if (user.twoFactorEnabled) {
        if (!twoFactorCode) {
            return res.json({ success: true, requiresTwoFactor: true });
        }
        const verified = speakeasy_1.default.totp.verify({
            secret: user.twoFactorSecret,
            encoding: "base32",
            token: String(twoFactorCode),
        });
        if (!verified)
            throw new errorHandler_1.AppError("Invalid 2FA code", 401);
    }
    await prisma_1.prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
    const sessionId = crypto_1.default.randomUUID();
    const refreshJti = crypto_1.default.randomUUID();
    const refreshMs = parseExpiryMs(String(process.env.JWT_REFRESH_EXPIRY || "7d"), 7 * 24 * 60 * 60 * 1000);
    const refreshTokenPreview = generateTokens(user.id, user.role, sessionId, refreshJti).refreshToken;
    const refreshTokenHash = sha256Hex(refreshTokenPreview);
    await prisma_1.prisma.session.create({
        data: {
            id: sessionId,
            userId: user.id,
            deviceInfo: req.headers["user-agent"] || "Unknown",
            ipAddress: req.ip ?? null,
            expiresAt: new Date(Date.now() + refreshMs),
            refreshTokenHash,
            refreshTokenJti: refreshJti,
            lastActive: new Date(),
        },
    });
    const { accessToken, refreshToken } = generateTokens(user.id, user.role, sessionId, refreshJti);
    res.json({
        success: true,
        data: {
            user: {
                id: user.id,
                email: user.email,
                phone: user.phone,
                name: user.name,
                role: user.role,
                kycStatus: user.kycStatus,
                twoFactorEnabled: user.twoFactorEnabled,
            },
            accessToken,
            refreshToken,
        },
    });
}
async function getMe(req, res) {
    if (!req.user)
        throw new errorHandler_1.AppError("Unauthorized", 401);
    const user = await prisma_1.prisma.user.findUnique({
        where: { id: req.user.userId },
        select: {
            id: true,
            email: true,
            phone: true,
            name: true,
            role: true,
            kycStatus: true,
            status: true,
            twoFactorEnabled: true,
            createdAt: true,
            updatedAt: true,
        },
    });
    if (!user)
        throw new errorHandler_1.AppError("Unauthorized", 401);
    res.json({ success: true, data: { user } });
}
async function refreshToken(req, res) {
    const { refreshToken } = req.body ?? {};
    if (!refreshToken)
        throw new errorHandler_1.AppError("Refresh token required", 400);
    try {
        const decoded = jsonwebtoken_1.default.verify(String(refreshToken), process.env.JWT_REFRESH_SECRET);
        const userId = String(decoded.userId || "");
        const role = String(decoded.role || "");
        const sid = String(decoded.sid || "");
        if (!userId || !sid)
            throw new errorHandler_1.AppError("Invalid refresh token", 401);
        const session = await prisma_1.prisma.session.findUnique({ where: { id: sid } });
        if (!session || session.userId !== userId)
            throw new errorHandler_1.AppError("Invalid refresh token", 401);
        if (session.revokedAt)
            throw new errorHandler_1.AppError("Session revoked", 401);
        if (session.expiresAt.getTime() <= Date.now())
            throw new errorHandler_1.AppError("Session expired", 401);
        if (!session.refreshTokenHash)
            throw new errorHandler_1.AppError("Invalid refresh token", 401);
        const providedHash = sha256Hex(String(refreshToken));
        if (providedHash !== session.refreshTokenHash)
            throw new errorHandler_1.AppError("Invalid refresh token", 401);
        // Rotate refresh token in-place for this session
        const newJti = crypto_1.default.randomUUID();
        const refreshMs = parseExpiryMs(String(process.env.JWT_REFRESH_EXPIRY || "7d"), 7 * 24 * 60 * 60 * 1000);
        const { accessToken, refreshToken: newRefresh } = generateTokens(userId, role, sid, newJti);
        await prisma_1.prisma.session.update({
            where: { id: sid },
            data: {
                refreshTokenHash: sha256Hex(newRefresh),
                refreshTokenJti: newJti,
                lastActive: new Date(),
                expiresAt: new Date(Date.now() + refreshMs),
            },
        });
        res.json({ success: true, data: { accessToken, refreshToken: newRefresh } });
    }
    catch {
        throw new errorHandler_1.AppError("Invalid refresh token", 401);
    }
}
async function logout(req, res) {
    if (!req.user)
        throw new errorHandler_1.AppError("Unauthorized", 401);
    const sid = req.user.sessionId;
    if (!sid) {
        // Backward compatible fallback: revoke all if we can't identify a session
        await prisma_1.prisma.session.updateMany({
            where: { userId: req.user.userId, revokedAt: null },
            data: { revokedAt: new Date(), refreshTokenHash: null, refreshTokenJti: null },
        });
        return res.json({ success: true });
    }
    await prisma_1.prisma.session.updateMany({
        where: { id: sid, userId: req.user.userId },
        data: { revokedAt: new Date(), refreshTokenHash: null, refreshTokenJti: null },
    });
    res.json({ success: true });
}
async function logoutAll(req, res) {
    if (!req.user)
        throw new errorHandler_1.AppError("Unauthorized", 401);
    await prisma_1.prisma.session.updateMany({
        where: { userId: req.user.userId, revokedAt: null },
        data: { revokedAt: new Date(), refreshTokenHash: null, refreshTokenJti: null },
    });
    res.json({ success: true });
}
//# sourceMappingURL=auth.controller.js.map