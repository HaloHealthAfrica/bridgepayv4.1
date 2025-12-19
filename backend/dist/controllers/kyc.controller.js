"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMyKyc = getMyKyc;
exports.submitKyc = submitKyc;
const prisma_1 = require("../lib/prisma");
const errorHandler_1 = require("../middleware/errorHandler");
const storage_service_1 = require("../services/storage.service");
async function getMyKyc(req, res) {
    const submission = await prisma_1.prisma.kYCSubmission.findUnique({
        where: { userId: req.user.userId },
    });
    if (!submission)
        throw new errorHandler_1.AppError("KYC submission not found", 404);
    res.json({ success: true, data: { kyc: submission } });
}
async function submitKyc(req, res) {
    const { idType, idNumber, dateOfBirth, address } = req.body ?? {};
    const files = req.files || [];
    const urls = await (0, storage_service_1.uploadFilesToS3)(files.map((f) => ({ buffer: f.buffer, originalname: f.originalname, mimetype: f.mimetype })), "kyc");
    // Expecting optional uploads with field names: idFront, idBack, selfie.
    // With multer.array we can't preserve fieldnames here; so we store in an array if present.
    const documents = { files: urls };
    const updated = await prisma_1.prisma.$transaction(async (tx) => {
        const kyc = await tx.kYCSubmission.upsert({
            where: { userId: req.user.userId },
            update: {
                status: "PENDING",
                idType: idType || null,
                idNumber: idNumber || null,
                dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
                address: address || null,
                documents: documents,
                submittedAt: new Date(),
            },
            create: {
                userId: req.user.userId,
                status: "PENDING",
                idType: idType || null,
                idNumber: idNumber || null,
                dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
                address: address || null,
                documents: documents,
                submittedAt: new Date(),
            },
        });
        await tx.user.update({
            where: { id: req.user.userId },
            data: { kycStatus: "PENDING" },
        });
        await tx.notification.create({
            data: {
                userId: req.user.userId,
                type: "KYC",
                title: "KYC Submitted",
                message: "Your KYC has been submitted and is pending review.",
                actionUrl: "/settings/kyc",
            },
        });
        return kyc;
    });
    res.json({ success: true, data: { kyc: updated } });
}
//# sourceMappingURL=kyc.controller.js.map