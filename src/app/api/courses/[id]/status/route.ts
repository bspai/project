// src/app/api/courses/[id]/status/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth-options";
import { prisma } from "@/lib/db/prisma";
import { z } from "zod";

const statusSchema = z.object({
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]),
});

// PATCH /api/courses/[id]/status — change course status (MENTOR creator)
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user.roles.includes("MENTOR")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const course = await prisma.course.findUnique({
    where: { id },
    include: { modules: { include: { lessons: { take: 1 } }, take: 1 } },
  });
  if (!course) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (course.creatorId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = statusSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { status } = parsed.data;

  // Publishing requires at least one module with at least one lesson
  if (status === "PUBLISHED") {
    const hasContent =
      course.modules.length > 0 && course.modules.some((m) => m.lessons.length > 0);
    if (!hasContent) {
      return NextResponse.json(
        { error: "Course must have at least one module with at least one lesson to publish" },
        { status: 409 }
      );
    }
  }

  const updated = await prisma.course.update({ where: { id }, data: { status } });
  return NextResponse.json(updated);
}
