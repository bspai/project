// src/app/api/projects/[id]/comments/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth-options";
import { prisma } from "@/lib/db/prisma";
import { z } from "zod";

// GET /api/projects/[id]/comments
// Returns top-level comments with nested replies (1 level deep)
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: projectId } = await params;

  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { id: true, creatorId: true, assignees: { select: { learnerId: true } } },
  });

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  // Only the consultant creator or assigned learner can read comments
  const isConsultant =
    session.user.role === "CONSULTANT" && project.creatorId === session.user.id;
  const isAssignedLearner =
    session.user.role === "LEARNER" &&
    project.assignees.some((a) => a.learnerId === session.user.id);

  if (!isConsultant && !isAssignedLearner) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const comments = await prisma.comment.findMany({
    where: { projectId, parentId: null },
    orderBy: { createdAt: "asc" },
    include: {
      author: { select: { id: true, name: true, avatar: true, role: true } },
      replies: {
        orderBy: { createdAt: "asc" },
        include: {
          author: { select: { id: true, name: true, avatar: true, role: true } },
        },
      },
    },
  });

  return NextResponse.json(comments);
}

const createSchema = z.object({
  body: z.string().min(1).max(5000),
  parentId: z.string().optional(),
});

// POST /api/projects/[id]/comments
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: projectId } = await params;

  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { id: true, creatorId: true, status: true, assignees: { select: { learnerId: true } } },
  });

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  if (project.status === "ARCHIVED") {
    return NextResponse.json({ error: "Cannot comment on archived projects" }, { status: 400 });
  }

  const isConsultant =
    session.user.role === "CONSULTANT" && project.creatorId === session.user.id;
  const isAssignedLearner =
    session.user.role === "LEARNER" &&
    project.assignees.some((a) => a.learnerId === session.user.id);

  if (!isConsultant && !isAssignedLearner) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
  }

  // Validate parentId belongs to this project if provided
  if (parsed.data.parentId) {
    const parent = await prisma.comment.findUnique({
      where: { id: parsed.data.parentId },
      select: { projectId: true, parentId: true },
    });
    if (!parent || parent.projectId !== projectId) {
      return NextResponse.json({ error: "Parent comment not found" }, { status: 404 });
    }
    // Only one level of nesting
    if (parent.parentId) {
      return NextResponse.json({ error: "Cannot reply to a reply" }, { status: 400 });
    }
  }

  const comment = await prisma.comment.create({
    data: {
      body: parsed.data.body,
      parentId: parsed.data.parentId ?? null,
      projectId,
      authorId: session.user.id,
    },
    include: {
      author: { select: { id: true, name: true, avatar: true, role: true } },
      replies: {
        orderBy: { createdAt: "asc" },
        include: {
          author: { select: { id: true, name: true, avatar: true, role: true } },
        },
      },
    },
  });

  return NextResponse.json(comment, { status: 201 });
}
