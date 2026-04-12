// src/app/api/courses/[id]/modules/[moduleId]/lessons/[lessonId]/blocks/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth-options";
import { prisma } from "@/lib/db/prisma";
import { z } from "zod";
import { ContentBlockType } from "@prisma/client";
import { InputJsonValue } from "@prisma/client/runtime/library";

const createSchema = z.object({
  type: z.nativeEnum(ContentBlockType),
  title: z.string().max(200).optional(),
  payload: z.record(z.unknown()),
});

// POST /api/courses/[id]/modules/[moduleId]/lessons/[lessonId]/blocks — add content block
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; moduleId: string; lessonId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user.roles.includes("MENTOR")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id, moduleId, lessonId } = await params;
  const lesson = await prisma.lesson.findFirst({
    where: { id: lessonId, moduleId },
    include: {
      module: {
        select: { courseId: true, course: { select: { creatorId: true } } },
      },
    },
  });
  if (!lesson) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (lesson.module.course.creatorId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  console.log("Block create body:", JSON.stringify(body, null, 2));
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    console.error("Block create validation error:", JSON.stringify(parsed.error.flatten(), null, 2));
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const count = await prisma.contentBlock.count({ where: { lessonId } });

  const block = await prisma.contentBlock.create({
    data: {
      type: parsed.data.type,
      title: parsed.data.title ?? null,
      payload: parsed.data.payload as InputJsonValue,
      order: count + 1,
      lessonId,
    },
  });

  return NextResponse.json(block, { status: 201 });
}
