// src/app/api/projects/[id]/defer/route.ts
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
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "versionId is required" }, { status: 400 });
  }

  const { versionId } = parsed.data;

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      assignees: true,
      phases: { orderBy: { phaseNumber: "asc" } },
    },
  });

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  if (project.status !== "IN_PROGRESS") {
    return NextResponse.json(
      { error: "Defer is only available for in-progress projects." },
      { status: 400 }
    );
  }

  // Either consultant or assigned learner can defer
  const isConsultant = session.user.role === "CONSULTANT" && project.creatorId === session.user.id;
  const isAssignedLearner =
    session.user.role === "LEARNER" &&
    project.assignees.some((a) => a.learnerId === session.user.id);

  if (!isConsultant && !isAssignedLearner) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

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

  // Check there is a next phase to defer to
  const nextPhase = project.phases.find(
    (p) => p.phaseNumber === project.currentPhase + 1
  );
  if (!nextPhase) {
    return NextResponse.json(
      { error: "No next phase exists to defer changes to." },
      { status: 400 }
    );
  }

  await prisma.$transaction(async (tx) => {
    // Mark version as DEFERRED and assign to next phase
    await tx.projectVersion.update({
      where: { id: versionId },
      data: {
        status: "DEFERRED",
        phaseNumber: nextPhase.phaseNumber,
      },
    });

    // Notify the other party
    const assignedLearner = project.assignees[0];

    if (session.user.role === "CONSULTANT" && assignedLearner) {
      await tx.notification.create({
        data: {
          userId: assignedLearner.learnerId,
          type: "VERSION_DEFERRED",
          title: "Changes deferred",
          body: `Version ${version.versionNumber} has been deferred to Phase ${nextPhase.phaseNumber}.`,
          link: `/learner/projects/${projectId}`,
        },
      });
    } else if (session.user.role === "LEARNER") {
      await tx.notification.create({
        data: {
          userId: project.creatorId,
          type: "VERSION_DEFERRED",
          title: "Changes deferred",
          body: `Version ${version.versionNumber} has been deferred to Phase ${nextPhase.phaseNumber}.`,
          link: `/consultant/projects/${projectId}`,
        },
      });
    }
  });

  return NextResponse.json({ ok: true, deferredToPhase: nextPhase.phaseNumber });
}
