// src/app/api/courses/[id]/blocks/move/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth-options";
import { prisma } from "@/lib/db/prisma";
import { z } from "zod";

const orderItem = z.object({ id: z.string(), order: z.number().int().positive() });

const schema = z.object({
  blockId: z.string(),
  sourceLessonId: z.string(),
  targetLessonId: z.string(),
  // Final order for all blocks remaining in the source lesson (empty if same-lesson move)
  sourceBlocks: z.array(orderItem),
  // Final order for all blocks in the target lesson, including the moved block
  targetBlocks: z.array(orderItem),
});

// PATCH /api/courses/[id]/blocks/move
// Atomically moves a block within or across lessons, reordering both lessons in one transaction.
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user.roles.includes("MENTOR")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: courseId } = await params;

  const course = await prisma.course.findFirst({
    where: { id: courseId, creatorId: session.user.id },
    select: { id: true },
  });
  if (!course) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
  }

  const { blockId, sourceLessonId, targetLessonId, sourceBlocks, targetBlocks } = parsed.data;
  const crossLesson = sourceLessonId !== targetLessonId;
  const offset = 10000;

  // Collect all block ids involved so we can shift them to a safe range first,
  // preventing transient (lessonId, order) unique constraint violations.
  const allInvolved = [...targetBlocks, ...(crossLesson ? sourceBlocks : [])];

  await prisma.$transaction([
    // Step 1: shift all involved blocks to a safe temporary order range
    ...allInvolved.map(({ id }) =>
      prisma.contentBlock.update({
        where: { id },
        data: { order: offset + allInvolved.findIndex((b) => b.id === id) },
      })
    ),
    // Step 2: move the block to the target lesson if cross-lesson
    ...(crossLesson
      ? [prisma.contentBlock.update({ where: { id: blockId }, data: { lessonId: targetLessonId } })]
      : []),
    // Step 3: apply final orders for target lesson blocks (includes moved block)
    ...targetBlocks.map(({ id, order }) =>
      prisma.contentBlock.update({ where: { id }, data: { order } })
    ),
    // Step 4: apply final orders for remaining source lesson blocks
    ...sourceBlocks.map(({ id, order }) =>
      prisma.contentBlock.update({ where: { id }, data: { order } })
    ),
  ]);

  return NextResponse.json({ success: true });
}
