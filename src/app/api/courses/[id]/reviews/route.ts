// src/app/api/courses/[id]/reviews/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth-options";
import { prisma } from "@/lib/db/prisma";
import { z } from "zod";

const reviewSchema = z.object({
  rating: z.number().int().min(1).max(5),
  body: z.string().trim().max(2000).optional(),
});

// GET /api/courses/[id]/reviews — list all reviews for a course
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const reviews = await prisma.courseReview.findMany({
    where: { courseId: id },
    orderBy: { createdAt: "desc" },
    include: { learner: { select: { id: true, name: true, avatar: true } } },
  });

  const avg =
    reviews.length > 0
      ? Math.round((reviews.reduce((s, r) => s + r.rating, 0) / reviews.length) * 10) / 10
      : null;

  return NextResponse.json({ reviews, avg, count: reviews.length });
}

// POST /api/courses/[id]/reviews — submit or update a review
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  // Must be enrolled
  const enrollment = await prisma.enrollment.findUnique({
    where: { courseId_learnerId: { courseId: id, learnerId: session.user.id } },
    include: { progress: { select: { isComplete: true } } },
  });
  if (!enrollment) {
    return NextResponse.json({ error: "You must be enrolled to review this course." }, { status: 403 });
  }

  // Must have completed all lessons
  const totalLessons = await prisma.lesson.count({ where: { module: { courseId: id } } });
  const completedLessons = enrollment.progress.filter((p) => p.isComplete).length;
  if (totalLessons > 0 && completedLessons < totalLessons) {
    return NextResponse.json(
      { error: "You must complete all lessons before leaving a review." },
      { status: 403 }
    );
  }

  const body = await req.json();
  const parsed = reviewSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const review = await prisma.courseReview.upsert({
    where: { courseId_learnerId: { courseId: id, learnerId: session.user.id } },
    create: {
      courseId: id,
      learnerId: session.user.id,
      rating: parsed.data.rating,
      body: parsed.data.body ?? null,
    },
    update: {
      rating: parsed.data.rating,
      body: parsed.data.body ?? null,
    },
    include: { learner: { select: { id: true, name: true, avatar: true } } },
  });

  return NextResponse.json(review);
}
