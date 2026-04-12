// src/app/api/courses/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth-options";
import { prisma } from "@/lib/db/prisma";
import { z } from "zod";

async function getCourse(id: string) {
  return prisma.course.findUnique({
    where: { id },
    include: {
      creator: { select: { id: true, name: true } },
      modules: {
        orderBy: { order: "asc" },
        include: {
          lessons: {
            orderBy: { order: "asc" },
            include: {
              blocks: { orderBy: { order: "asc" } },
              _count: { select: { progress: true } },
            },
          },
        },
      },
      _count: { select: { enrollments: true } },
    },
  });
}

// GET /api/courses/[id] — full course detail
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const course = await getCourse(id);
  if (!course) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const isMentorCreator = session.user.roles.includes("MENTOR") && course.creatorId === session.user.id;

  // Non-creator can only see published courses
  if (!isMentorCreator && course.status !== "PUBLISHED") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // For learners/consultants: add enrollment + progress
  if (!isMentorCreator) {
    const enrollment = await prisma.enrollment.findUnique({
      where: { courseId_learnerId: { courseId: id, learnerId: session.user.id } },
      include: {
        progress: { select: { lessonId: true, isComplete: true, completedAt: true } },
      },
    });
    return NextResponse.json({ ...course, enrollment: enrollment ?? null });
  }

  return NextResponse.json(course);
}

const updateSchema = z.object({
  title: z.string().min(3).max(200).optional(),
  description: z.string().max(2000).optional().nullable(),
  coverImage: z.string().url().optional().nullable().or(z.literal("")),
  isOpen: z.boolean().optional(),
});

// PUT /api/courses/[id] — update course metadata (MENTOR creator)
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user.roles.includes("MENTOR")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const course = await prisma.course.findUnique({ where: { id } });
  if (!course) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (course.creatorId !== session.user.id) {
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

  const updated = await prisma.course.update({
    where: { id },
    data: {
      ...(parsed.data.title !== undefined ? { title: parsed.data.title } : {}),
      ...(parsed.data.description !== undefined ? { description: parsed.data.description } : {}),
      ...(parsed.data.coverImage !== undefined ? { coverImage: parsed.data.coverImage || null } : {}),
      ...(parsed.data.isOpen !== undefined ? { isOpen: parsed.data.isOpen } : {}),
    },
  });

  return NextResponse.json(updated);
}

// DELETE /api/courses/[id] — delete course (MENTOR creator, DRAFT only)
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user.roles.includes("MENTOR")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const course = await prisma.course.findUnique({ where: { id } });
  if (!course) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (course.creatorId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (course.status !== "DRAFT") {
    return NextResponse.json({ error: "Only DRAFT courses can be deleted" }, { status: 409 });
  }

  await prisma.course.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
