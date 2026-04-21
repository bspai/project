// src/app/api/courses/[id]/structure/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth-options";
import { prisma } from "@/lib/db/prisma";
import { z } from "zod";
import { ContentBlockType } from "@prisma/client";
import { InputJsonValue } from "@prisma/client/runtime/library";

const blockSchema = z.object({
  id: z.string(),
  type: z.nativeEnum(ContentBlockType),
  title: z.string().max(200).nullable(),
  payload: z.record(z.unknown()),
  order: z.number().int().positive(),
});

const lessonSchema = z.object({
  id: z.string(),
  title: z.string().min(1).max(200),
  order: z.number().int().positive(),
  blocks: z.array(blockSchema),
});

const moduleSchema = z.object({
  id: z.string(),
  title: z.string().min(1).max(200),
  order: z.number().int().positive(),
  lessons: z.array(lessonSchema),
});

const structureSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).nullable().optional(),
  modules: z.array(moduleSchema),
});

const isTemp = (id: string) => id.startsWith("temp_");

// PUT /api/courses/[id]/structure
// Reconciles the full course structure in one interactive transaction.
// New items have IDs prefixed with "temp_"; existing items have real DB IDs.
// Returns the saved structure with all real IDs so the client can update its state.
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user.roles.includes("MENTOR")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: courseId } = await params;

  const existing = await prisma.course.findFirst({
    where: { id: courseId, creatorId: session.user.id },
    include: {
      modules: {
        include: { lessons: { include: { blocks: true } } },
      },
    },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  const parsed = structureSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const payload = parsed.data;

  // ── Collect existing IDs ────────────────────────────────────────────────────
  const existingModuleIds = new Set(existing.modules.map((m) => m.id));
  const existingLessonIds = new Set(
    existing.modules.flatMap((m) => m.lessons.map((l) => l.id))
  );
  const existingBlockIds = new Set(
    existing.modules.flatMap((m) => m.lessons.flatMap((l) => l.blocks.map((b) => b.id)))
  );

  // IDs present in payload (real only — temp IDs are new)
  const payloadModuleIds = new Set(
    payload.modules.filter((m) => !isTemp(m.id)).map((m) => m.id)
  );
  const payloadLessonIds = new Set(
    payload.modules.flatMap((m) => m.lessons.filter((l) => !isTemp(l.id)).map((l) => l.id))
  );
  const payloadBlockIds = new Set(
    payload.modules.flatMap((m) =>
      m.lessons.flatMap((l) => l.blocks.filter((b) => !isTemp(b.id)).map((b) => b.id))
    )
  );

  // IDs to delete (in DB but absent from payload)
  const moduleIdsToDelete = Array.from(existingModuleIds).filter((id) => !payloadModuleIds.has(id));
  const lessonIdsToDelete = Array.from(existingLessonIds).filter((id) => !payloadLessonIds.has(id));
  const blockIdsToDelete = Array.from(existingBlockIds).filter((id) => !payloadBlockIds.has(id));

  // ── temp ID → real ID maps (filled during transaction) ─────────────────────
  const moduleIdMap: Record<string, string> = {};
  const lessonIdMap: Record<string, string> = {};

  // ── Run interactive transaction ─────────────────────────────────────────────
  const OFFSET = 100_000; // safe range above any real order value

  await prisma.$transaction(
    async (tx) => {
      // 1. Update course-level fields
      if (payload.title !== undefined || payload.description !== undefined) {
        await tx.course.update({
          where: { id: courseId },
          data: {
            ...(payload.title !== undefined ? { title: payload.title } : {}),
            ...(payload.description !== undefined
              ? { description: payload.description }
              : {}),
          },
        });
      }

      // 2. Delete removed items (module cascade handles nested lessons + blocks)
      if (moduleIdsToDelete.length > 0) {
        await tx.courseModule.deleteMany({ where: { id: { in: moduleIdsToDelete } } });
      }
      if (lessonIdsToDelete.length > 0) {
        await tx.lesson.deleteMany({ where: { id: { in: lessonIdsToDelete } } });
      }
      if (blockIdsToDelete.length > 0) {
        await tx.contentBlock.deleteMany({ where: { id: { in: blockIdsToDelete } } });
      }

      // 3. Shift all surviving existing items to offset range to avoid unique
      //    constraint collisions while we reorder them.
      if (existingModuleIds.size > 0) {
        await tx.courseModule.updateMany({
          where: { courseId, id: { in: Array.from(existingModuleIds) } },
          data: { order: { increment: OFFSET } },
        });
      }
      if (existingLessonIds.size > 0) {
        await tx.lesson.updateMany({
          where: { id: { in: Array.from(existingLessonIds) } },
          data: { order: { increment: OFFSET } },
        });
      }
      if (existingBlockIds.size > 0) {
        await tx.contentBlock.updateMany({
          where: { id: { in: Array.from(existingBlockIds) } },
          data: { order: { increment: OFFSET } },
        });
      }

      // 4. Create / update modules
      for (const mod of payload.modules) {
        if (isTemp(mod.id)) {
          const created = await tx.courseModule.create({
            data: { title: mod.title, order: mod.order, courseId },
          });
          moduleIdMap[mod.id] = created.id;
        } else {
          await tx.courseModule.update({
            where: { id: mod.id },
            data: { title: mod.title, order: mod.order },
          });
          moduleIdMap[mod.id] = mod.id;
        }
      }

      // 5. Create / update lessons
      for (const mod of payload.modules) {
        const realModuleId = moduleIdMap[mod.id];
        for (const lesson of mod.lessons) {
          if (isTemp(lesson.id)) {
            const created = await tx.lesson.create({
              data: { title: lesson.title, order: lesson.order, moduleId: realModuleId },
            });
            lessonIdMap[lesson.id] = created.id;
          } else {
            await tx.lesson.update({
              where: { id: lesson.id },
              data: { title: lesson.title, order: lesson.order, moduleId: realModuleId },
            });
            lessonIdMap[lesson.id] = lesson.id;
          }
        }
      }

      // 6. Create / update blocks
      for (const mod of payload.modules) {
        for (const lesson of mod.lessons) {
          const realLessonId = lessonIdMap[lesson.id];
          for (const block of lesson.blocks) {
            if (isTemp(block.id)) {
              await tx.contentBlock.create({
                data: {
                  type: block.type,
                  title: block.title,
                  payload: block.payload as InputJsonValue,
                  order: block.order,
                  lessonId: realLessonId,
                },
              });
            } else {
              await tx.contentBlock.update({
                where: { id: block.id },
                data: {
                  title: block.title,
                  payload: block.payload as InputJsonValue,
                  order: block.order,
                  lessonId: realLessonId,
                },
              });
            }
          }
        }
      }
    },
    { timeout: 15000 }
  );

  // ── Return the saved structure with real IDs ─────────────────────────────────
  const saved = await prisma.course.findUnique({
    where: { id: courseId },
    select: {
      id: true,
      title: true,
      description: true,
      modules: {
        orderBy: { order: "asc" },
        include: {
          lessons: {
            orderBy: { order: "asc" },
            include: { blocks: { orderBy: { order: "asc" } } },
          },
        },
      },
    },
  });

  return NextResponse.json(saved);
}
