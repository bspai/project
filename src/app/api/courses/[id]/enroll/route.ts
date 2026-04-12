// src/app/api/courses/[id]/enroll/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth-options";
import { prisma } from "@/lib/db/prisma";

// POST /api/courses/[id]/enroll — enroll current user in course
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Only LEARNER or MENTOR can enroll (not CONSULTANT or ADMIN)
  const canEnroll =
    session.user.roles.includes("LEARNER") || session.user.roles.includes("MENTOR");
  if (!canEnroll) {
    return NextResponse.json({ error: "Only learners can enroll in courses" }, { status: 403 });
  }

  const { id } = await params;
  const course = await prisma.course.findUnique({ where: { id } });
  if (!course) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (course.status !== "PUBLISHED") {
    return NextResponse.json({ error: "Course is not available for enrollment" }, { status: 409 });
  }
  if (!course.isOpen) {
    return NextResponse.json(
      { error: "This course requires admin assignment" },
      { status: 403 }
    );
  }

  // Upsert to handle duplicate requests gracefully
  const enrollment = await prisma.enrollment.upsert({
    where: { courseId_learnerId: { courseId: id, learnerId: session.user.id } },
    create: { courseId: id, learnerId: session.user.id },
    update: {},
  });

  return NextResponse.json(enrollment, { status: 201 });
}
