// src/app/api/courses/[id]/modules/[moduleId]/lessons/[lessonId]/blocks/[blockId]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth-options";
import { prisma } from "@/lib/db/prisma";
import { z } from "zod";
import { ContentBlockType } from "@prisma/client";
import { InputJsonValue } from "@prisma/client/runtime/library";

async function getBlock(lessonId: string, blockId: string) {
  return prisma.contentBlock.findFirst({
    where: { id: blockId, lessonId },
    include: {
      lesson: {
        select: {
          moduleId: true,
          module: {
            select: { course: { select: { creatorId: true } } },
          },
        },
      },
    },
  });
}

const updateSchema = z.object({
  type: z.nativeEnum(ContentBlockType).optional(),
  title: z.string().max(200).nullable().optional(),
  payload: z.record(z.unknown()).optional(),
  order: z.number().int().positive().optional(),
});

// PATCH /api/courses/[id]/modules/[moduleId]/lessons/[lessonId]/blocks/[blockId]
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; moduleId: string; lessonId: string; blockId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user.roles.includes("MENTOR")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { lessonId, blockId } = await params;
  const block = await getBlock(lessonId, blockId);
  if (!block) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (block.lesson.module.course.creatorId !== session.user.id) {
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

  const { payload, ...rest } = parsed.data;
  const updated = await prisma.contentBlock.update({
    where: { id: blockId },
    data: {
      ...rest,
      ...(payload !== undefined ? { payload: payload as InputJsonValue } : {}),
    },
  });

  return NextResponse.json(updated);
}

// DELETE /api/courses/[id]/modules/[moduleId]/lessons/[lessonId]/blocks/[blockId]
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; moduleId: string; lessonId: string; blockId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user.roles.includes("MENTOR")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { lessonId, blockId } = await params;
  const block = await getBlock(lessonId, blockId);
  if (!block) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (block.lesson.module.course.creatorId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await prisma.contentBlock.delete({ where: { id: blockId } });
  return NextResponse.json({ success: true });
}
