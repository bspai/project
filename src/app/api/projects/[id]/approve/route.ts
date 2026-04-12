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
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: projectId } = await params;

  const session = await getServerSession(authOptions);
  if (!session || !session.user.roles.includes("CONSULTANT")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const project = await prisma.project.findUnique({
    where: { id: projectId },
  });

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }
  if (project.creatorId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (project.status !== "OPEN") {
    return NextResponse.json(
      { error: "Self-approval is only allowed when the project is Open. In-progress changes require mutual signoff." },
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

  if (!version || version.projectId !== projectId) {
    return NextResponse.json({ error: "Version not found" }, { status: 404 });
  }
  if (version.status !== "PENDING") {
    return NextResponse.json(
      { error: "Version is not in PENDING state" },
      { status: 400 }
    );
  }

  // Read the proposed changes stored in metaSnapshot at submission time
  const snap = version.metaSnapshot as {
    title: string;
    deadline: string;
    technologies: string[];
    descriptionJson?: unknown;
    descriptionText?: string;
    milestones: Array<{ title: string; deadline: string; phaseNumber: number }>;
  } | null;

  await prisma.$transaction(async (tx) => {
    // 1. Deactivate all versions
    await tx.projectVersion.updateMany({
      where: { projectId },
      data: { isActive: false },
    });

    // 2. Activate and approve the pending version
    await tx.projectVersion.update({
      where: { id: versionId },
      data: { isActive: true, status: "SELF_APPROVED" },
    });

    // 3. Commit metaSnapshot to the project — title, deadline, technologies
    if (snap) {
      await tx.project.update({
        where: { id: projectId },
        data: {
          title: snap.title,
          deadline: new Date(snap.deadline),
          technologies: snap.technologies,
          updatedAt: new Date(),
        },
      });

    }

    // 5. Record the signoff
    await tx.versionSignoff.upsert({
      where: { versionId_userId: { versionId, userId: session.user.id } },
      create: { versionId, userId: session.user.id, role: "CONSULTANT" },
      update: {},
    });
  });

  return NextResponse.json({ ok: true });
}
