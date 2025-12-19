"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireAuth = requireAuth;
exports.requireRole = requireRole;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const errorHandler_1 = require("./errorHandler");
function requireAuth(req, _res, next) {
    const header = req.headers.authorization;
    if (!header?.startsWith("Bearer "))
        throw new errorHandler_1.AppError("Unauthorized", 401);
    const token = header.slice("Bearer ".length);
    try {
        const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_ACCESS_SECRET);
        req.user = { userId: decoded.userId, role: decoded.role, sessionId: decoded.sid };
        next();
    }
    catch {
        throw new errorHandler_1.AppError("Unauthorized", 401);
    }
}
function requireRole(roles) {
    return (req, _res, next) => {
        if (!req.user)
            throw new errorHandler_1.AppError("Unauthorized", 401);
        if (!roles.includes(req.user.role))
            throw new errorHandler_1.AppError("Forbidden", 403);
        next();
    };
}
//# sourceMappingURL=auth.js.map