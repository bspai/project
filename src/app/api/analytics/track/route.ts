// src/app/api/analytics/track/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import crypto from "crypto";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, entity, entityId, projectId, metadata, userId, sessionId } = body;

    if (!action) {
      return NextResponse.json({ error: "action is required" }, { status: 400 });
    }

    const ip = req.headers.get("x-forwarded-for") ?? req.headers.get("x-real-ip") ?? "";
    const ipHash = ip ? crypto.createHash("sha256").update(ip).digest("hex").slice(0, 16) : null;
    const userAgent = req.headers.get("user-agent") ?? null;

    await prisma.usageEvent.create({
      data: {
        action,
        entity: entity ?? null,
        entityId: entityId ?? null,
        projectId: projectId ?? null,
        metadata: metadata ?? undefined,
        sessionId: sessionId ?? null,
        ipHash,
        userAgent,
        userId: userId ?? null,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    // Never surface errors for analytics — it must be silent
    console.error("[analytics/track] error:", error);
    return NextResponse.json({ ok: false }, { status: 200 });
  }
}
