"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppError = void 0;
exports.notFoundHandler = notFoundHandler;
exports.errorHandler = errorHandler;
class AppError extends Error {
    constructor(message, statusCode = 500) {
        super(message);
        this.statusCode = statusCode;
        this.isOperational = true;
    }
}
exports.AppError = AppError;
function notFoundHandler(_req, res) {
    res.status(404).json({
        success: false,
        error: { message: "Not found" },
    });
}
function errorHandler(err, _req, res, _next) {
    const statusCode = err?.statusCode && typeof err.statusCode === "number" ? err.statusCode : 500;
    if (process.env.NODE_ENV !== "production") {
        // eslint-disable-next-line no-console
        console.error(err);
    }
    res.status(statusCode).json({
        success: false,
        error: {
            message: err?.message || "Internal server error",
        },
    });
}
//# sourceMappingURL=errorHandler.js.map