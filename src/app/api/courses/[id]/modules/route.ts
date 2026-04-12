// src/app/api/courses/[id]/modules/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth-options";
import { prisma } from "@/lib/db/prisma";
import { z } from "zod";

const createSchema = z.object({
  title: z.string().min(1).max(200),
});

// POST /api/courses/[id]/modules — add module (MENTOR creator)
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  // Auto-assign order = count + 1
  const count = await prisma.courseModule.count({ where: { courseId: id } });

  const module_ = await prisma.courseModule.create({
    data: {
      title: parsed.data.title,
      order: count + 1,
      courseId: id,
    },
  });

  return NextResponse.json(module_, { status: 201 });
}
