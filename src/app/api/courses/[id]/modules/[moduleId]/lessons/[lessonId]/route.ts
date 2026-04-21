// src/app/api/courses/[id]/modules/[moduleId]/lessons/[lessonId]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth-options";
import { prisma } from "@/lib/db/prisma";
import { z } from "zod";

async function getLesson(id: string, moduleId: string, lessonId: string) {
  return prisma.lesson.findFirst({
    where: { id: lessonId, moduleId },
    include: {
      blocks: { orderBy: { order: "asc" } },
      module: {
        select: {
          courseId: true,
          course: { select: { creatorId: true, status: true } },
        },
      },
    },
  });
}

// GET /api/courses/[id]/modules/[moduleId]/lessons/[lessonId] — lesson with blocks
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; moduleId: string; lessonId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, moduleId, lessonId } = await params;
  const lesson = await getLesson(id, moduleId, lessonId);
  if (!lesson) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const isMentorCreator =
    session.user.roles.includes("MENTOR") && lesson.module.course.creatorId === session.user.id;

  // Learners can only access published course lessons and only if enrolled
  if (!isMentorCreator) {
    if (lesson.module.course.status !== "PUBLISHED") {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    const enrollment = await prisma.enrollment.findUnique({
      where: { courseId_learnerId: { courseId: id, learnerId: session.user.id } },
    });
    if (!enrollment) {
      return NextResponse.json({ error: "Not enrolled" }, { status: 403 });
    }

    // Include progress for this lesson
    const progress = await prisma.lessonProgress.findUnique({
      where: { lessonId_learnerId: { lessonId, learnerId: session.user.id } },
    });
    return NextResponse.json({ ...lesson, progress: progress ?? null });
  }

  return NextResponse.json(lesson);
}

const updateSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  duration: z.number().int().positive().nullable().optional(),
  order: z.number().int().positive().optional(),
  moduleId: z.string().optional(), // for cross-module moves
});

// PATCH /api/courses/[id]/modules/[moduleId]/lessons/[lessonId]
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; moduleId: string; lessonId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user.roles.includes("MENTOR")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id, moduleId, lessonId } = await params;
  const lesson = await getLesson(id, moduleId, lessonId);
  if (!lesson) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (lesson.module.course.creatorId !== session.user.id) {
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

  const { moduleId: targetModuleId, ...rest } = parsed.data;

  // Validate target module belongs to same course when moving cross-module
  if (targetModuleId && targetModuleId !== moduleId) {
    const targetModule = await prisma.courseModule.findFirst({
      where: { id: targetModuleId, courseId: id },
    });
    if (!targetModule) {
      return NextResponse.json({ error: "Target module not found in this course" }, { status: 404 });
    }
  }

  const updated = await prisma.lesson.update({
    where: { id: lessonId },
    data: {
      ...rest,
      ...(targetModuleId ? { moduleId: targetModuleId } : {}),
    },
  });

  return NextResponse.json(updated);
}

// DELETE /api/courses/[id]/modules/[moduleId]/lessons/[lessonId]
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; moduleId: string; lessonId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user.roles.includes("MENTOR")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id, moduleId, lessonId } = await params;
  const lesson = await getLesson(id, moduleId, lessonId);
  if (!lesson) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (lesson.module.course.creatorId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await prisma.lesson.delete({ where: { id: lessonId } });
  return NextResponse.json({ success: true });
}
