// src/app/api/projects/[id]/phases/[phaseId]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth-options";
import { prisma } from "@/lib/db/prisma";
import { z } from "zod";

const updateSchema = z.object({
  title: z.string().max(100),
});

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; phaseId: string }> }
) {
  const { id: projectId, phaseId } = await params;

  const session = await getServerSession(authOptions);
  if (!session || !session.user.roles.includes("CONSULTANT")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }
  if (project.creatorId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const phase = await prisma.projectPhase.findUnique({ where: { id: phaseId } });
  if (!phase || phase.projectId !== projectId) {
    return NextResponse.json({ error: "Phase not found" }, { status: 404 });
  }

  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const updated = await prisma.projectPhase.update({
    where: { id: phaseId },
    data: { title: parsed.data.title },
  });

  return NextResponse.json(updated);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; phaseId: string }> }
) {
  const { id: projectId, phaseId } = await params;

  const session = await getServerSession(authOptions);
  if (!session || !session.user.roles.includes("CONSULTANT")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }
  if (project.creatorId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const phase = await prisma.projectPhase.findUnique({ where: { id: phaseId } });
  if (!phase || phase.projectId !== projectId) {
    return NextResponse.json({ error: "Phase not found" }, { status: 404 });
  }
  if (phase.status !== "UPCOMING") {
    return NextResponse.json(
      { error: "Only UPCOMING phases can be deleted" },
      { status: 409 }
    );
  }

  // Prevent deleting if it would leave the project with 0 phases
  const phaseCount = await prisma.projectPhase.count({ where: { projectId } });
  if (phaseCount <= 1) {
    return NextResponse.json(
      { error: "Cannot delete the last phase" },
      { status: 409 }
    );
  }

  await prisma.projectPhase.delete({ where: { id: phaseId } });

  return NextResponse.json({ ok: true });
}
