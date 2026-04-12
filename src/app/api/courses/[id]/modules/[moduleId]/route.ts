// src/app/api/courses/[id]/modules/[moduleId]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth-options";
import { prisma } from "@/lib/db/prisma";
import { z } from "zod";

async function getModuleWithCourse(id: string, moduleId: string) {
  return prisma.courseModule.findFirst({
    where: { id: moduleId, courseId: id },
    include: { course: { select: { creatorId: true } } },
  });
}

const updateSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  order: z.number().int().positive().optional(),
});

// PATCH /api/courses/[id]/modules/[moduleId]
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; moduleId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user.roles.includes("MENTOR")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id, moduleId } = await params;
  const mod = await getModuleWithCourse(id, moduleId);
  if (!mod) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (mod.course.creatorId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const updated = await prisma.courseModule.update({
    where: { id: moduleId },
    data: parsed.data,
  });

  return NextResponse.json(updated);
}

// DELETE /api/courses/[id]/modules/[moduleId]
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; moduleId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user.roles.includes("MENTOR")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id, moduleId } = await params;
  const mod = await getModuleWithCourse(id, moduleId);
  if (!mod) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (mod.course.creatorId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await prisma.courseModule.delete({ where: { id: moduleId } });
  return NextResponse.json({ success: true });
}
