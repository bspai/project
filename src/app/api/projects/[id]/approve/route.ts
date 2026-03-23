// src/app/api/projects/[id]/approve/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth-options";
import { prisma } from "@/lib/db/prisma";
import { z } from "zod";

const schema = z.object({
  versionId: z.string(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "CONSULTANT") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const project = await prisma.project.findUnique({
    where: { id: params.id },
  });

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }
  if (project.creatorId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Self-approval only allowed when project is OPEN
  if (project.status !== "OPEN") {
    return NextResponse.json(
      {
        error:
          "Self-approval is only allowed when the project is Open. In-progress changes require mutual signoff.",
      },
      { status: 400 }
    );
  }

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "versionId is required" }, { status: 400 });
  }

  const { versionId } = parsed.data;

  const version = await prisma.projectVersion.findUnique({
    where: { id: versionId },
  });

  if (!version || version.projectId !== params.id) {
    return NextResponse.json({ error: "Version not found" }, { status: 404 });
  }
  if (version.status !== "PENDING") {
    return NextResponse.json(
      { error: "Version is not in PENDING state" },
      { status: 400 }
    );
  }

  await prisma.$transaction(async (tx) => {
    // Deactivate all other versions
    await tx.projectVersion.updateMany({
      where: { projectId: params.id },
      data: { isActive: false },
    });

    // Activate and approve this version
    await tx.projectVersion.update({
      where: { id: versionId },
      data: {
        isActive: true,
        status: "SELF_APPROVED",
      },
    });

    // Record the signoff
    await tx.versionSignoff.upsert({
      where: { versionId_userId: { versionId, userId: session.user.id } },
      create: {
        versionId,
        userId: session.user.id,
        role: session.user.role,
      },
      update: {},
    });
  });

  return NextResponse.json({ ok: true });
}
