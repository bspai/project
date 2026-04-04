// src/app/api/projects/[id]/status/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth-options";
import { prisma } from "@/lib/db/prisma";
import { z } from "zod";

const schema = z.object({
  status: z.enum(["OPEN", "IN_PROGRESS", "ON_HOLD", "DONE"]),
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

  const project = await prisma.project.findUnique({ where: { id: projectId } });
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

  const updated = await prisma.project.update({
    where: { id: projectId },
    data: { status: parsed.data.status, updatedAt: new Date() },
    select: { id: true, status: true },
  });

  return NextResponse.json(updated);
}
