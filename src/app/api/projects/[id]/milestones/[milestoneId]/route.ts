// src/app/api/projects/[id]/milestones/[milestoneId]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth-options";
import { prisma } from "@/lib/db/prisma";
import { z } from "zod";

const updateSchema = z.object({
  title: z.string().min(1),
  deadline: z.string().min(1),
  phaseNumber: z.number().int().min(1),
});

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; milestoneId: string }> }
) {
  const { id: projectId, milestoneId } = await params;

  const session = await getServerSession(authOptions);
  if (!session || !session.user.roles.includes("CONSULTANT")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });
  if (project.creatorId !== session.user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (project.status === "DONE" || project.status === "ARCHIVED") {
    return NextResponse.json({ error: "Cannot modify milestones on a completed project" }, { status: 400 });
  }

  const milestone = await prisma.milestone.findUnique({ where: { id: milestoneId } });
  if (!milestone || milestone.projectId !== projectId) {
    return NextResponse.json({ error: "Milestone not found" }, { status: 404 });
  }

  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
  }

  const updated = await prisma.milestone.update({
    where: { id: milestoneId },
    data: {
      title: parsed.data.title,
      deadline: new Date(parsed.data.deadline),
      phaseNumber: parsed.data.phaseNumber,
    },
  });

  return NextResponse.json(updated);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; milestoneId: string }> }
) {
  const { id: projectId, milestoneId } = await params;

  const session = await getServerSession(authOptions);
  if (!session || !session.user.roles.includes("CONSULTANT")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });
  if (project.creatorId !== session.user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (project.status === "DONE" || project.status === "ARCHIVED") {
    return NextResponse.json({ error: "Cannot modify milestones on a completed project" }, { status: 400 });
  }

  const milestone = await prisma.milestone.findUnique({ where: { id: milestoneId } });
  if (!milestone || milestone.projectId !== projectId) {
    return NextResponse.json({ error: "Milestone not found" }, { status: 404 });
  }

  await prisma.milestone.delete({ where: { id: milestoneId } });

  return NextResponse.json({ ok: true });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; milestoneId: string }> }
) {
  const { id: projectId, milestoneId } = await params;

  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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
      { error: "Milestones can only be toggled on in-progress projects" },
      { status: 400 }
    );
  }

  const isConsultant =
    session.user.roles.includes("CONSULTANT") && project.creatorId === session.user.id;
  const isAssignedLearner =
    session.user.roles.includes("LEARNER") &&
    project.assignees.some((a) => a.learnerId === session.user.id);

  if (!isConsultant && !isAssignedLearner) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const milestone = await prisma.milestone.findUnique({
    where: { id: milestoneId },
  });

  if (!milestone || milestone.projectId !== projectId) {
    return NextResponse.json({ error: "Milestone not found" }, { status: 404 });
  }

  const updated = await prisma.milestone.update({
    where: { id: milestoneId },
    data: { isComplete: !milestone.isComplete },
  });

  // Check milestones for the phase this milestone belongs to
  const phaseMilestones = await prisma.milestone.findMany({
    where: { projectId, phaseNumber: milestone.phaseNumber },
  });

  let phaseAdvanced = false;
  let phaseReverted = false;

  const allComplete = phaseMilestones.length > 0 && phaseMilestones.every((m) => m.isComplete);

  if (!updated.isComplete) {
    // Milestone was unchecked — revert phase to ACTIVE if it was COMPLETE
    const thisPhase = project.phases.find((p) => p.phaseNumber === milestone.phaseNumber);
    if (thisPhase && thisPhase.status === "COMPLETE") {
      // Also revert any downstream phase that became ACTIVE as a result
      const downstreamActivePhase = project.phases.find(
        (p) => p.phaseNumber > milestone.phaseNumber && p.status === "ACTIVE"
      );

      await prisma.$transaction(async (tx) => {
        await tx.projectPhase.update({
          where: { id: thisPhase.id },
          data: { status: "ACTIVE", completedAt: null },
        });

        if (downstreamActivePhase) {
          await tx.projectPhase.update({
            where: { id: downstreamActivePhase.id },
            data: { status: "UPCOMING", startedAt: null },
          });
        }

        await tx.project.update({
          where: { id: projectId },
          data: { currentPhase: milestone.phaseNumber },
        });
      });

      phaseReverted = true;
    }
  } else if (allComplete) {
    // Milestone was checked and all in this phase are complete — advance phase
    const currentPhase = project.phases.find((p) => p.phaseNumber === milestone.phaseNumber);
    const nextPhase = project.phases.find((p) => p.phaseNumber === milestone.phaseNumber + 1);

    await prisma.$transaction(async (tx) => {
      if (currentPhase) {
        await tx.projectPhase.update({
          where: { id: currentPhase.id },
          data: { status: "COMPLETE", completedAt: new Date() },
        });
      }

      if (nextPhase) {
        await tx.projectPhase.update({
          where: { id: nextPhase.id },
          data: { status: "ACTIVE", startedAt: new Date() },
        });
        await tx.project.update({
          where: { id: projectId },
          data: { currentPhase: nextPhase.phaseNumber },
        });
      }
    });

    phaseAdvanced = true;
  }

  return NextResponse.json({ isComplete: updated.isComplete, phaseAdvanced, phaseReverted });
}
