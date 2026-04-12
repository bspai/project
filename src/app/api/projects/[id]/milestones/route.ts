// src/app/api/projects/[id]/milestones/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth-options";
import { prisma } from "@/lib/db/prisma";
import { z } from "zod";

const schema = z.object({
  title: z.string().min(1),
  deadline: z.string().min(1),
  phaseNumber: z.number().int().min(1),
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
  if (project.status === "DONE" || project.status === "ARCHIVED") {
    return NextResponse.json({ error: "Cannot modify milestones on a completed project" }, { status: 400 });
  }

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
  }

  const { title, deadline, phaseNumber } = parsed.data;

  const lastMilestone = await prisma.milestone.findFirst({
    where: { projectId },
    orderBy: { order: "desc" },
  });

  const milestone = await prisma.milestone.create({
    data: {
      title,
      deadline: new Date(deadline),
      phaseNumber,
      order: (lastMilestone?.order ?? 0) + 1,
      projectId,
    },
  });

  return NextResponse.json(milestone, { status: 201 });
}
