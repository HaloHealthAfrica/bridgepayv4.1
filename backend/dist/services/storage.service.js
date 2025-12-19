"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadFilesToS3 = uploadFilesToS3;
const aws_sdk_1 = __importDefault(require("aws-sdk"));
const hasS3 = !!process.env.AWS_ACCESS_KEY_ID && !!process.env.AWS_SECRET_ACCESS_KEY && !!process.env.AWS_S3_BUCKET;
const s3 = hasS3
    ? new aws_sdk_1.default.S3({
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        region: process.env.AWS_REGION || "us-east-1",
    })
    : null;
async function uploadFilesToS3(files, folder) {
    if (!files || files.length === 0)
        return [];
    if (!s3)
        return [];
    const bucket = process.env.AWS_S3_BUCKET;
    const region = process.env.AWS_REGION || "us-east-1";
    const urls = [];
    for (const file of files) {
        const key = `${folder}/${Date.now()}-${file.originalname}`;
        await s3
            .putObject({
            Bucket: bucket,
            Key: key,
            Body: file.buffer,
            ContentType: file.mimetype,
        })
            .promise();
        urls.push(`https://${bucket}.s3.${region}.amazonaws.com/${key}`);
    }
    return urls;
}
//# sourceMappingURL=storage.service.js.map