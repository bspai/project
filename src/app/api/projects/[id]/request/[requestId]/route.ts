// src/app/api/projects/[id]/request/[requestId]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth-options";
import { prisma } from "@/lib/db/prisma";
import { z } from "zod";

const schema = z.object({
  action: z.enum(["approve", "reject"]),
});

// PATCH /api/projects/:id/request/:requestId — consultant approves or rejects
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; requestId: string }> }
) {
  const { id: projectId, requestId } = await params;

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
      { error: "Project is no longer open for new assignments" },
      { status: 400 }
    );
  }

  const workRequest = await prisma.workRequest.findUnique({
    where: { id: requestId },
    include: { learner: { select: { id: true, name: true, email: true } } },
  });

  if (!workRequest || workRequest.projectId !== projectId) {
    return NextResponse.json({ error: "Request not found" }, { status: 404 });
  }
  if (workRequest.status !== "PENDING") {
    return NextResponse.json(
      { error: "Request has already been actioned" },
      { status: 409 }
    );
  }

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "action must be 'approve' or 'reject'" },
      { status: 400 }
    );
  }

  const { action } = parsed.data;

  if (action === "approve") {
    await prisma.$transaction(async (tx) => {
      // Mark request as approved
      await tx.workRequest.update({
        where: { id: requestId },
        data: { status: "APPROVED" },
      });

      // Reject all other pending requests for this project
      await tx.workRequest.updateMany({
        where: {
          projectId,
          status: "PENDING",
          id: { not: requestId },
        },
        data: { status: "REJECTED" },
      });

      // Create the assignee record
      await tx.projectAssignee.upsert({
        where: {
          projectId_learnerId: {
            projectId,
            learnerId: workRequest.learnerId,
          },
        },
        create: {
          projectId,
          learnerId: workRequest.learnerId,
        },
        update: {},
      });

      // Transition project to IN_PROGRESS
      await tx.project.update({
        where: { id: projectId },
        data: { status: "IN_PROGRESS" },
      });

      // Notify the approved learner
      await tx.notification.create({
        data: {
          userId: workRequest.learnerId,
          type: "WORK_REQUEST_APPROVED",
          title: "Your request was approved!",
          body: `You have been assigned to "${project.title}"`,
          link: `/learner/projects/${projectId}`,
        },
      });

      // Notify rejected learners
      const rejected = await tx.workRequest.findMany({
        where: { projectId, status: "REJECTED", id: { not: requestId } },
        select: { learnerId: true },
      });
      if (rejected.length > 0) {
        await tx.notification.createMany({
          data: rejected.map((r) => ({
            userId: r.learnerId,
            type: "WORK_REQUEST_REJECTED" as const,
            title: "Request not selected",
            body: `Another learner was selected for "${project.title}"`,
            link: `/learner/projects/${projectId}`,
          })),
        });
      }

      // Track analytics
      await tx.usageEvent.create({
        data: {
          action: "work_request_approved",
          entity: "project",
          entityId: projectId,
          projectId,
          userId: session.user.id,
        },
      });
    });

    return NextResponse.json({ ok: true, status: "IN_PROGRESS" });
  }

  // Reject
  await prisma.$transaction(async (tx) => {
    await tx.workRequest.update({
      where: { id: requestId },
      data: { status: "REJECTED" },
    });

    await tx.notification.create({
      data: {
        userId: workRequest.learnerId,
        type: "WORK_REQUEST_REJECTED",
        title: "Request not selected",
        body: `Your request for "${project.title}" was not accepted`,
        link: `/learner/projects/${projectId}`,
      },
    });

    await tx.usageEvent.create({
      data: {
        action: "work_request_rejected",
        entity: "project",
        entityId: projectId,
        projectId,
        userId: session.user.id,
      },
    });
  });

  return NextResponse.json({ ok: true, status: "REJECTED" });
}
