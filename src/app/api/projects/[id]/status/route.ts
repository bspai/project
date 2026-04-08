// src/app/api/projects/[id]/status/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth-options";
import { prisma } from "@/lib/db/prisma";
import { z } from "zod";

const schema = z.object({
  status: z.enum(["OPEN", "IN_PROGRESS", "ON_HOLD", "DONE"]),
  reason: z.string().min(1).max(500).optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: projectId } = await params;

  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "CONSULTANT") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: { assignees: { select: { learnerId: true } } },
  });
  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }
  if (project.creatorId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (project.status === "ARCHIVED") {
    return NextResponse.json({ error: "Archived projects cannot be updated" }, { status: 400 });
  }

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid status", details: parsed.error.flatten() }, { status: 400 });
  }

  const { status, reason } = parsed.data;

  // Reopening a completed project requires a reason
  if (project.status === "DONE" && status !== "DONE" && !reason) {
    return NextResponse.json(
      { error: "A reason is required to reopen a completed project" },
      { status: 400 }
    );
  }

  await prisma.$transaction(async (tx) => {
    await tx.project.update({
      where: { id: projectId },
      data: { status, updatedAt: new Date() },
    });

    // Transitioning TO DONE: notify all assignees + track event
    if (status === "DONE" && project.status !== "DONE") {
      if (project.assignees.length > 0) {
        await tx.notification.createMany({
          data: project.assignees.map((a) => ({
            userId: a.learnerId,
            type: "PROJECT_COMPLETE" as const,
            title: "Project marked as complete",
            body: `"${project.title}" has been marked as complete.`,
            link: `/learner/projects/${projectId}`,
          })),
        });
      }
      await tx.usageEvent.create({
        data: {
          action: "project_completed",
          entity: "project",
          entityId: projectId,
          projectId,
          userId: session.user.id,
        },
      });
    }

    // Reopening from DONE: post system comment + track event
    if (project.status === "DONE" && status !== "DONE" && reason) {
      await tx.comment.create({
        data: {
          projectId,
          authorId: session.user.id,
          body: `**Project reopened** — ${reason}`,
        },
      });
      await tx.usageEvent.create({
        data: {
          action: "project_reopened",
          entity: "project",
          entityId: projectId,
          projectId,
          userId: session.user.id,
        },
      });
    }
  });

  return NextResponse.json({ ok: true, status });
}
