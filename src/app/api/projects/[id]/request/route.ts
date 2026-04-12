// src/app/api/projects/[id]/request/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth-options";
import { prisma } from "@/lib/db/prisma";

// POST /api/projects/:id/request — learner requests to work on a project
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: projectId } = await params;

  const session = await getServerSession(authOptions);
  if (!session || !session.user.roles.includes("LEARNER")) {
    return NextResponse.json(
      { error: "Only learners can request to work on projects" },
      { status: 401 }
    );
  }

  const project = await prisma.project.findUnique({
    where: { id: projectId },
  });

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }
  if (project.status !== "OPEN") {
    return NextResponse.json(
      { error: "This project is not open for requests" },
      { status: 400 }
    );
  }

  const existing = await prisma.workRequest.findUnique({
    where: { projectId_learnerId: { projectId, learnerId: session.user.id } },
  });
  if (existing) {
    return NextResponse.json(
      { error: "You have already requested to work on this project" },
      { status: 409 }
    );
  }

  const body = await req.json().catch(() => ({}));

  const request = await prisma.workRequest.create({
    data: {
      projectId,
      learnerId: session.user.id,
      message: body.message ?? null,
      status: "PENDING",
    },
  });

  // Notify consultant
  await prisma.notification.create({
    data: {
      userId: project.creatorId,
      type: "WORK_REQUEST_RECEIVED",
      title: "New work request",
      body: `A learner has requested to work on "${project.title}"`,
      link: `/consultant/projects/${projectId}`,
    },
  });

  // Track analytics
  await prisma.usageEvent.create({
    data: {
      action: "work_request_sent",
      entity: "project",
      entityId: projectId,
      projectId,
      userId: session.user.id,
    },
  });

  return NextResponse.json({ id: request.id }, { status: 201 });
}

// GET /api/projects/:id/request — consultant gets all requests for their project
export async function GET(
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
  if (!project || project.creatorId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const requests = await prisma.workRequest.findMany({
    where: { projectId },
    include: {
      learner: {
        select: { id: true, name: true, email: true, avatar: true, bio: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(requests);
}
