"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.projectRouter = void 0;
const express_1 = require("express");
const multer_1 = __importDefault(require("multer"));
const asyncHandler_1 = require("../middleware/asyncHandler");
const auth_1 = require("../middleware/auth");
const projectController = __importStar(require("../controllers/project.controller"));
exports.projectRouter = (0, express_1.Router)();
const upload = (0, multer_1.default)({
    storage: multer_1.default.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 },
});
exports.projectRouter.post("/", auth_1.requireAuth, (0, asyncHandler_1.asyncHandler)(projectController.createProject));
exports.projectRouter.get("/", auth_1.requireAuth, (0, asyncHandler_1.asyncHandler)(projectController.getProjects));
exports.projectRouter.get("/:id", auth_1.requireAuth, (0, asyncHandler_1.asyncHandler)(projectController.getProjectById));
exports.projectRouter.post("/:id/publish", auth_1.requireAuth, (0, asyncHandler_1.asyncHandler)(projectController.publishProject));
exports.projectRouter.post("/:id/apply", auth_1.requireAuth, (0, asyncHandler_1.asyncHandler)(projectController.applyToProject));
exports.projectRouter.post("/:id/assign", auth_1.requireAuth, (0, asyncHandler_1.asyncHandler)(projectController.assignImplementer));
exports.projectRouter.post("/:id/fund", auth_1.requireAuth, (0, asyncHandler_1.asyncHandler)(projectController.fundProject));
exports.projectRouter.post("/:projectId/milestones/:milestoneId/evidence", auth_1.requireAuth, upload.array("files", 10), (0, asyncHandler_1.asyncHandler)(projectController.submitEvidence));
exports.projectRouter.post("/:projectId/milestones/:milestoneId/approve", auth_1.requireAuth, (0, asyncHandler_1.asyncHandler)(projectController.approveMilestone));
exports.projectRouter.post("/:projectId/milestones/:milestoneId/reject", auth_1.requireAuth, (0, asyncHandler_1.asyncHandler)(projectController.rejectMilestone));
//# sourceMappingURL=project.routes.js.map