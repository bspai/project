// src/app/api/courses/[id]/progress/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth-options";
import { prisma } from "@/lib/db/prisma";
import { z } from "zod";

const progressSchema = z.object({
  lessonId: z.string(),
  isComplete: z.boolean(),
});

// POST /api/courses/[id]/progress — mark lesson complete/incomplete
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const enrollment = await prisma.enrollment.findUnique({
    where: { courseId_learnerId: { courseId: id, learnerId: session.user.id } },
  });
  if (!enrollment) {
    return NextResponse.json({ error: "Not enrolled in this course" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = progressSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { lessonId, isComplete } = parsed.data;

  // Verify lesson belongs to this course
  const lesson = await prisma.lesson.findFirst({
    where: { id: lessonId, module: { courseId: id } },
  });
  if (!lesson) return NextResponse.json({ error: "Lesson not found in course" }, { status: 404 });

  const progress = await prisma.lessonProgress.upsert({
    where: { lessonId_learnerId: { lessonId, learnerId: session.user.id } },
    create: {
      lessonId,
      learnerId: session.user.id,
      enrollmentId: enrollment.id,
      isComplete,
      completedAt: isComplete ? new Date() : null,
    },
    update: {
      isComplete,
      completedAt: isComplete ? new Date() : null,
    },
  });

  return NextResponse.json(progress);
}
