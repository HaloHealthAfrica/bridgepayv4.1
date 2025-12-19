"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.app = void 0;
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const routes_1 = require("./routes");
const errorHandler_1 = require("./middleware/errorHandler");
exports.app = (0, express_1.default)();
exports.app.set("trust proxy", true);
exports.app.use((0, cors_1.default)({
    origin: process.env.FRONTEND_URL || true,
    credentials: true,
}));
// Capture raw body (useful for payment provider signature verification)
exports.app.use(express_1.default.json({
    limit: "2mb",
    verify: (req, _res, buf) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        req.rawBody = buf;
    },
}));
exports.app.get("/health", (_req, res) => res.json({ ok: true }));
exports.app.use("/api", routes_1.apiRouter);
exports.app.use(errorHandler_1.notFoundHandler);
exports.app.use(errorHandler_1.errorHandler);
//# sourceMappingURL=app.js.map