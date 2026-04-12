// src/app/api/admin/courses/import/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth-options";
import { prisma } from "@/lib/db/prisma";
import { z } from "zod";
import { InputJsonValue } from "@prisma/client/runtime/library";
import { ContentBlockType, CourseStatus } from "@prisma/client";

const blockSchema = z.object({
  type: z.nativeEnum(ContentBlockType),
  title: z.string().nullable().optional(),
  order: z.number().int(),
  payload: z.record(z.unknown()),
});

const lessonSchema = z.object({
  title: z.string().min(1),
  order: z.number().int(),
  duration: z.number().int().nullable().optional(),
  blocks: z.array(blockSchema).default([]),
});

const moduleSchema = z.object({
  title: z.string().min(1),
  order: z.number().int(),
  lessons: z.array(lessonSchema).default([]),
});

const courseSchema = z.object({
  title: z.string().min(1),
  description: z.string().nullable().optional(),
  coverImage: z.string().nullable().optional(),
  status: z.nativeEnum(CourseStatus).default("DRAFT"),
  isOpen: z.boolean().default(true),
  modules: z.array(moduleSchema).default([]),
});

const bundleSchema = z.object({
  __version: z.literal(1),
  course: courseSchema,
});

const importSchema = z.object({
  mentorId: z.string().min(1),
  bundle: bundleSchema,
  // Optionally override the imported status (admin may want to import as DRAFT regardless)
  importAsStatus: z.nativeEnum(CourseStatus).optional(),
});

// POST /api/admin/courses/import
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user.roles.includes("ADMIN")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });

  const parsed = importSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid import bundle", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { mentorId, bundle, importAsStatus } = parsed.data;

  // Verify mentor exists and has MENTOR role
  const mentor = await prisma.user.findUnique({ where: { id: mentorId } });
  if (!mentor || !mentor.roles.includes("MENTOR")) {
    return NextResponse.json(
      { error: "Selected user is not a mentor or does not exist." },
      { status: 400 }
    );
  }

  const { course: c } = bundle;
  const status = importAsStatus ?? c.status;

  // Create the entire course tree in a single transaction
  const created = await prisma.$transaction(async (tx) => {
    const course = await tx.course.create({
      data: {
        title: c.title,
        description: c.description ?? null,
        coverImage: c.coverImage ?? null,
        status,
        isOpen: c.isOpen,
        creatorId: mentorId,
      },
    });

    for (const mod of c.modules) {
      const createdModule = await tx.courseModule.create({
        data: {
          title: mod.title,
          order: mod.order,
          courseId: course.id,
        },
      });

      for (const lesson of mod.lessons) {
        const createdLesson = await tx.lesson.create({
          data: {
            title: lesson.title,
            order: lesson.order,
            duration: lesson.duration ?? null,
            moduleId: createdModule.id,
          },
        });

        for (const block of lesson.blocks) {
          await tx.contentBlock.create({
            data: {
              type: block.type,
              title: block.title ?? null,
              order: block.order,
              payload: block.payload as InputJsonValue,
              lessonId: createdLesson.id,
            },
          });
        }
      }
    }

    return course;
  });

  return NextResponse.json({ id: created.id, title: created.title }, { status: 201 });
}
