import { Router } from "express";
import multer from "multer";
import { asyncHandler } from "../middleware/asyncHandler";
import { requireAuth } from "../middleware/auth";
import * as projectController from "../controllers/project.controller";

export const projectRouter = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});

projectRouter.post("/", requireAuth, asyncHandler(projectController.createProject));
projectRouter.get("/", requireAuth, asyncHandler(projectController.getProjects));
projectRouter.get("/:id", requireAuth, asyncHandler(projectController.getProjectById));
projectRouter.post("/:id/publish", requireAuth, asyncHandler(projectController.publishProject));
projectRouter.post("/:id/apply", requireAuth, asyncHandler(projectController.applyToProject));
projectRouter.post("/:id/assign", requireAuth, asyncHandler(projectController.assignImplementer));
projectRouter.post("/:id/fund", requireAuth, asyncHandler(projectController.fundProject));
projectRouter.post(
  "/:projectId/milestones/:milestoneId/evidence",
  requireAuth,
  upload.array("files", 10),
  asyncHandler(projectController.submitEvidence)
);
projectRouter.post(
  "/:projectId/milestones/:milestoneId/approve",
  requireAuth,
  asyncHandler(projectController.approveMilestone)
);
projectRouter.post(
  "/:projectId/milestones/:milestoneId/reject",
  requireAuth,
  asyncHandler(projectController.rejectMilestone)
);




