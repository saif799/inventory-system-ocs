import { NextResponse } from "next/server";
import { getR2Client } from "@/lib/r2";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { v4 as uuidv4 } from "uuid";

const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/svg+xml",
  "image/avif",
]);

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB limit

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const folder = (formData.get("folder") as string) || "uploads";

    if (!file) {
      return NextResponse.json(
        { error: "No file provided in request" },
        { status: 400 }
      );
    }

    if (!ALLOWED_MIME_TYPES.has(file.type)) {
      return NextResponse.json(
        { error: `File type '${file.type}' is not allowed.` },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json(
        { error: `File size exceeds limit of 10MB.` },
        { status: 400 }
      );
    }

    const bucketName = process.env.R2_BUCKET_NAME;
    const publicUrlBase = process.env.NEXT_PUBLIC_R2_PUBLIC_URL;

    if (!bucketName) {
      return NextResponse.json(
        { error: "R2_BUCKET_NAME is not configured on server" },
        { status: 500 }
      );
    }

    const sanitizeName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
    const cleanFolder = folder.replace(/^\/+|\/+$/g, "");
    const key = cleanFolder ? `${cleanFolder}/${uuidv4()}-${sanitizeName}` : `${uuidv4()}-${sanitizeName}`;

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const client = getR2Client();
    await client.send(
      new PutObjectCommand({
        Bucket: bucketName,
        Key: key,
        ContentType: file.type,
        Body: buffer,
      })
    );

    const cleanBase = (publicUrlBase || "").replace(/\/+$/, "");
    const publicUrl = cleanBase
      ? `${cleanBase}/${key}`
      : `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${bucketName}/${key}`;

    return NextResponse.json({
      success: true,
      key,
      publicUrl,
    });
  } catch (error: any) {
    console.error("Server upload error:", error);
    return NextResponse.json(
      { error: error?.message || "Internal server upload error" },
      { status: 500 }
    );
  }
}
