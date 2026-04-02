// src/app/api/projects/[id]/signoff/route.ts
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
      { error: "Signoff is only available for in-progress projects. Use approve for open projects." },
      { status: 400 }
    );
  }

  // Verify user is either the consultant creator or the assigned learner
  const isConsultant = session.user.role === "CONSULTANT" && project.creatorId === session.user.id;
  const isAssignedLearner =
    session.user.role === "LEARNER" &&
    project.assignees.some((a) => a.learnerId === session.user.id);

  if (!isConsultant && !isAssignedLearner) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const version = await prisma.projectVersion.findUnique({
    where: { id: versionId },
    include: { signoffs: true },
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

  // Check if this user already signed off
  const alreadySigned = version.signoffs.some((s) => s.userId === session.user.id);
  if (alreadySigned) {
    return NextResponse.json(
      { error: "You have already signed off on this version" },
      { status: 409 }
    );
  }

  // Record the signoff
  await prisma.versionSignoff.create({
    data: {
      versionId,
      userId: session.user.id,
      role: session.user.role,
    },
  });

  // Check if both parties have now signed off
  const updatedSignoffs = await prisma.versionSignoff.findMany({
    where: { versionId },
  });
  const hasConsultantSignoff = updatedSignoffs.some((s) => s.role === "CONSULTANT");
  const hasLearnerSignoff = updatedSignoffs.some((s) => s.role === "LEARNER");
  const bothSigned = hasConsultantSignoff && hasLearnerSignoff;

  if (bothSigned) {
    // Activate the version and commit changes
    const snap = version.metaSnapshot as {
      title: string;
      deadline: string;
      technologies: string[];
      milestones: Array<{ title: string; deadline: string; phaseNumber: number }>;
    } | null;

    await prisma.$transaction(async (tx) => {
      // 1. Deactivate all versions
      await tx.projectVersion.updateMany({
        where: { projectId },
        data: { isActive: false },
      });

      // 2. Activate and mark as APPROVED
      await tx.projectVersion.update({
        where: { id: versionId },
        data: { isActive: true, status: "APPROVED" },
      });

      // 3. Commit metaSnapshot to project
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

        // 4. Replace milestones for current phase
        await tx.milestone.deleteMany({
          where: { projectId, phaseNumber: project.currentPhase },
        });

        if (snap.milestones.length > 0) {
          await tx.milestone.createMany({
            data: snap.milestones.map((m, i) => ({
              title: m.title,
              deadline: new Date(m.deadline),
              order: i + 1,
              phaseNumber: m.phaseNumber ?? project.currentPhase,
              projectId,
            })),
          });
        }
      }

      // 5. Advance phase: close current, open next
      const currentPhase = project.phases.find(
        (p) => p.phaseNumber === project.currentPhase
      );
      const nextPhase = project.phases.find(
        (p) => p.phaseNumber === project.currentPhase + 1
      );

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

      // 6. Notify both parties
      const assignedLearner = project.assignees[0];

      // Notify consultant (if learner was last to sign)
      if (session.user.role === "LEARNER") {
        await tx.notification.create({
          data: {
            userId: project.creatorId,
            type: "VERSION_APPROVED",
            title: "Version signed off",
            body: `Version ${version.versionNumber} has been signed off by both parties.`,
            link: `/consultant/projects/${projectId}`,
          },
        });
      }

      // Notify learner (if consultant was last to sign)
      if (session.user.role === "CONSULTANT" && assignedLearner) {
        await tx.notification.create({
          data: {
            userId: assignedLearner.learnerId,
            type: "VERSION_APPROVED",
            title: "Version signed off",
            body: `Version ${version.versionNumber} has been signed off by both parties.`,
            link: `/learner/projects/${projectId}`,
          },
        });
      }
    });

    return NextResponse.json({ ok: true, status: "approved", bothSigned: true });
  }

  // Only one party has signed — notify the other party
  const assignedLearner = project.assignees[0];

  if (session.user.role === "CONSULTANT" && assignedLearner) {
    await prisma.notification.create({
      data: {
        userId: assignedLearner.learnerId,
        type: "VERSION_SUBMITTED",
        title: "Signoff requested",
        body: `The consultant has signed off on version ${version.versionNumber}. Your signoff is needed.`,
        link: `/learner/projects/${projectId}`,
      },
    });
  } else if (session.user.role === "LEARNER") {
    await prisma.notification.create({
      data: {
        userId: project.creatorId,
        type: "VERSION_SUBMITTED",
        title: "Signoff requested",
        body: `The learner has signed off on version ${version.versionNumber}. Your signoff is needed.`,
        link: `/consultant/projects/${projectId}`,
      },
    });
  }

  return NextResponse.json({ ok: true, status: "partial", bothSigned: false });
}
