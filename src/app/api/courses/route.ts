// src/app/api/courses/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth-options";
import { prisma } from "@/lib/db/prisma";
import { z } from "zod";

const createSchema = z.object({
  title: z.string().min(3).max(200),
  description: z.string().max(2000).optional(),
  coverImage: z.string().url().optional().or(z.literal("")),
  isOpen: z.boolean().default(true),
});

// GET /api/courses — list courses
// MENTOR: own courses (all statuses)
// LEARNER/CONSULTANT: published courses + enrollment status
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search");

  const isMentor = session.user.roles.includes("MENTOR");

  if (isMentor) {
    const courses = await prisma.course.findMany({
      where: {
        creatorId: session.user.id,
        ...(search ? { title: { contains: search, mode: "insensitive" as const } } : {}),
      },
      orderBy: { updatedAt: "desc" },
      include: {
        _count: { select: { modules: true, enrollments: true } },
      },
    });
    return NextResponse.json(courses);
  }

  // Learner / Consultant — published courses only
  const courses = await prisma.course.findMany({
    where: {
      status: "PUBLISHED",
      ...(search ? { title: { contains: search, mode: "insensitive" as const } } : {}),
    },
    orderBy: { updatedAt: "desc" },
    include: {
      creator: { select: { id: true, name: true } },
      _count: { select: { modules: true, enrollments: true } },
      enrollments: {
        where: { learnerId: session.user.id },
        select: { id: true, enrolledAt: true },
      },
    },
  });

  return NextResponse.json(courses);
}

// POST /api/courses — create course (MENTOR only)
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user.roles.includes("MENTOR")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { title, description, coverImage, isOpen } = parsed.data;

  const course = await prisma.course.create({
    data: {
      title,
      description: description || null,
      coverImage: coverImage || null,
      isOpen,
      status: "DRAFT",
      creatorId: session.user.id,
    },
  });

  return NextResponse.json({ id: course.id }, { status: 201 });
}
