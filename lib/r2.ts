import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { v4 as uuidv4 } from "uuid";

const accountId = process.env.R2_ACCOUNT_ID;
const accessKeyId = process.env.R2_ACCESS_KEY_ID;
const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
const bucketName = process.env.R2_BUCKET_NAME;
const publicUrlBase = process.env.NEXT_PUBLIC_R2_PUBLIC_URL;

export const r2Client = new S3Client({
  region: "auto",
  endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: accessKeyId || "",
    secretAccessKey: secretAccessKey || "",
  },
});

export interface PresignedUrlParams {
  filename: string;
  contentType: string;
  folder?: string;
  expiresInSeconds?: number;
}

export interface PresignedUrlResponse {
  uploadUrl: string;
  key: string;
  publicUrl: string;
}

export async function getPresignedUploadUrl({
  filename,
  contentType,
  folder = "uploads",
  expiresInSeconds = 900, // 15 minutes
}: PresignedUrlParams): Promise<PresignedUrlResponse> {
  if (!bucketName) {
    throw new Error("R2_BUCKET_NAME is not configured in environment variables");
  }

  // Clean extension and filename
  const sanitizeName = filename.replace(/[^a-zA-Z0-9.-]/g, "_");
  const cleanFolder = folder.replace(/^\/+|\/+$/g, "");
  const key = cleanFolder ? `${cleanFolder}/${uuidv4()}-${sanitizeName}` : `${uuidv4()}-${sanitizeName}`;

  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: key,
    ContentType: contentType,
  });

  const uploadUrl = await getSignedUrl(r2Client, command, {
    expiresIn: expiresInSeconds,
  });

  const cleanBase = (publicUrlBase || "").replace(/\/+$/, "");
  const publicUrl = cleanBase ? `${cleanBase}/${key}` : uploadUrl.split("?")[0];

  return {
    uploadUrl,
    key,
    publicUrl,
  };
}
