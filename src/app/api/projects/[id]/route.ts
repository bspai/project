// src/app/api/projects/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth-options";
import { prisma } from "@/lib/db/prisma";

export async function GET(
  req: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const project = await prisma.project.findUnique({
    where: { id: params.id },
    include: {
      creator: { select: { id: true, name: true, email: true, avatar: true } },
      milestones: { orderBy: { order: "asc" } },
      phases: { orderBy: { phaseNumber: "asc" } },
      assignees: {
        include: {
          learner: { select: { id: true, name: true, email: true, avatar: true } },
        },
      },
      versions: {
        orderBy: { versionNumber: "desc" },
        include: {
          signoffs: {
            include: { user: { select: { id: true, name: true, role: true } } },
          },
        },
      },
      _count: {
        select: { workRequests: true, comments: true },
      },
    },
  });

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  // Consultants can only view their own projects; learners can view any open/in-progress project
  if (
    session.user.role === "CONSULTANT" &&
    project.creatorId !== session.user.id
  ) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return NextResponse.json(project);
}

// PUT /api/projects/:id — lightweight metadata update (title, deadline, technologies)
// Full versioned content updates go through /api/projects/:id/versions
export async function PUT(
  req: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "CONSULTANT") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const project = await prisma.project.findUnique({ where: { id: params.id } });
  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }
  if (project.creatorId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();

  const updated = await prisma.project.update({
    where: { id: params.id },
    data: {
      ...(body.title && { title: body.title }),
      ...(body.deadline && { deadline: new Date(body.deadline) }),
      ...(body.technologies && { technologies: body.technologies }),
    },
  });

  return NextResponse.json({ id: updated.id });
}
