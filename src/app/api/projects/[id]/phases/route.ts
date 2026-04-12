// src/app/api/projects/[id]/phases/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth-options";
import { prisma } from "@/lib/db/prisma";
import { z } from "zod";

const createSchema = z.object({
  title: z.string().max(100).optional(),
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
    include: { phases: { orderBy: { phaseNumber: "desc" }, take: 1 } },
  });

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }
  if (project.creatorId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (project.status === "DONE" || project.status === "ARCHIVED") {
    return NextResponse.json(
      { error: "Cannot add phases to a completed or archived project" },
      { status: 409 }
    );
  }

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const lastPhaseNumber = project.phases[0]?.phaseNumber ?? 0;
  const newPhaseNumber = lastPhaseNumber + 1;

  const phase = await prisma.projectPhase.create({
    data: {
      projectId,
      phaseNumber: newPhaseNumber,
      title: parsed.data.title ?? "",
      status: "UPCOMING",
    },
  });

  return NextResponse.json(phase, { status: 201 });
}
