// src/app/api/upload/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth-options";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: "Only JPEG, PNG, WebP and GIF images are allowed" },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "File size must be under 5MB" },
        { status: 400 }
      );
    }

    // If storage env vars are configured, upload to S3-compatible storage
    if (process.env.STORAGE_ACCESS_KEY && process.env.STORAGE_BUCKET) {
      const { uploadFile } = await import("@/lib/storage");
      const buffer = Buffer.from(await file.arrayBuffer());
      const { url } = await uploadFile(buffer, file.type, "project-images");
      return NextResponse.json({ url });
    }

    // Fallback: return base64 data URL (for local dev without storage configured)
    const buffer = await file.arrayBuffer();
    const base64 = Buffer.from(buffer).toString("base64");
    const dataUrl = `data:${file.type};base64,${base64}`;
    return NextResponse.json({ url: dataUrl });
  } catch (error) {
    console.error("[upload] error:", error);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
