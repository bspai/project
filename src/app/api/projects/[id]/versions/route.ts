// src/app/api/projects/[id]/versions/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth-options";
import { prisma } from "@/lib/db/prisma";
import { z } from "zod";
import { InputJsonValue } from "@prisma/client/runtime/library";

const schema = z.object({
  title: z.string().min(3),
  deadline: z.string().min(1),
  technologies: z.array(z.string()).min(1),
  milestones: z.array(
    z.object({
      id: z.string(),
      title: z.string().min(1),
      deadline: z.string().min(1),
      phaseNumber: z.number().default(1),
    })
  ),
  descriptionJson: z.custom<InputJsonValue>((val) => val !== null),
  descriptionText: z.string().min(1),
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
    include: {
      versions: { orderBy: { versionNumber: "desc" }, take: 1 },
    },
  });

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }
  if (project.creatorId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Block new version if there's already a pending one
  const pendingVersion = await prisma.projectVersion.findFirst({
    where: { projectId: params.id, status: "PENDING" },
  });
  if (pendingVersion) {
    return NextResponse.json(
      { error: "There is already a pending version awaiting approval. Approve or discard it first." },
      { status: 409 }
    );
  }

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { title, deadline, technologies, milestones, descriptionJson, descriptionText } =
    parsed.data;

  const latestVersion = project.versions[0];
  const nextVersionNumber = (latestVersion?.versionNumber ?? 0) + 1;

  // Determine version status based on project state
  // OPEN → consultant can self-approve immediately
  // IN_PROGRESS → must go through signoff flow (Phase 6)
  const versionStatus = project.status === "OPEN" ? "PENDING" : "PENDING";

  await prisma.$transaction(async (tx) => {
    // The current active version intentionally remains active while the new draft is PENDING.
    // Deactivation of the old version will be handled by the /approve route once this pending version is approved.

    // Create new pending version (not yet active — needs approval)
    await tx.projectVersion.create({
      data: {
        versionNumber: nextVersionNumber,
        projectId: params.id,
        submittedById: session.user.id,
        isActive: false,
        status: versionStatus,
        phaseNumber: project.currentPhase,
        descriptionJson: descriptionJson as InputJsonValue,
        descriptionText,
      },
    });

    // Update project top-level metadata
    await tx.project.update({
      where: { id: params.id },
      data: {
        title,
        deadline: new Date(deadline),
        technologies,
        updatedAt: new Date(),
      },
    });

    // Replace milestones for the current phase
    await tx.milestone.deleteMany({
      where: { projectId: params.id, phaseNumber: project.currentPhase },
    });

    if (milestones.length > 0) {
      await tx.milestone.createMany({
        data: milestones.map((m, i) => ({
          title: m.title,
          deadline: new Date(m.deadline),
          order: i + 1,
          phaseNumber: m.phaseNumber,
          projectId: params.id,
        })),
      });
    }
  });

  return NextResponse.json({ id: params.id, versionNumber: nextVersionNumber });
}
