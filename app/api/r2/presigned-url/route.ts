import { requireAdmin } from "@/lib/auth/guard";
import { NextResponse } from "next/server";
import { getPresignedUploadUrl } from "@/lib/r2";

const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/svg+xml",
  "image/avif",
]);

export async function POST(request: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;

  try {
    const body = await request.json();
    const { filename, contentType, folder } = body;

    if (!filename || typeof filename !== "string") {
      return NextResponse.json(
        { error: "Missing or invalid 'filename'" },
        { status: 400 }
      );
    }

    if (!contentType || typeof contentType !== "string") {
      return NextResponse.json(
        { error: "Missing or invalid 'contentType'" },
        { status: 400 }
      );
    }

    if (!ALLOWED_MIME_TYPES.has(contentType)) {
      return NextResponse.json(
        { error: `File type '${contentType}' is not allowed. Only images are permitted.` },
        { status: 400 }
      );
    }

    const presignedData = await getPresignedUploadUrl({
      filename,
      contentType,
      folder: typeof folder === "string" ? folder : "uploads",
    });

    return NextResponse.json(presignedData);
  } catch (error: any) {
    console.error("Failed to generate R2 presigned URL:", error);
    return NextResponse.json(
      { error: error?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
