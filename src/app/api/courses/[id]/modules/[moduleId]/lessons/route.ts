// src/app/api/courses/[id]/modules/[moduleId]/lessons/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth-options";
import { prisma } from "@/lib/db/prisma";
import { z } from "zod";

const createSchema = z.object({
  title: z.string().min(1).max(200),
  duration: z.number().int().positive().optional(),
});

// POST /api/courses/[id]/modules/[moduleId]/lessons — add lesson (MENTOR creator)
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; moduleId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user.roles.includes("MENTOR")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id, moduleId } = await params;
  const mod = await prisma.courseModule.findFirst({
    where: { id: moduleId, courseId: id },
    include: { course: { select: { creatorId: true } } },
  });
  if (!mod) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (mod.course.creatorId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const count = await prisma.lesson.count({ where: { moduleId } });

  const lesson = await prisma.lesson.create({
    data: {
      title: parsed.data.title,
      duration: parsed.data.duration ?? null,
      order: count + 1,
      moduleId,
    },
  });

  return NextResponse.json(lesson, { status: 201 });
}
