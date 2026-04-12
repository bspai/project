// src/app/api/admin/courses/[id]/export/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth-options";
import { prisma } from "@/lib/db/prisma";

// GET /api/admin/courses/[id]/export
// Returns a self-contained JSON bundle of the course (no IDs, ready to import anywhere).
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user.roles.includes("ADMIN")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  const course = await prisma.course.findUnique({
    where: { id },
    include: {
      creator: { select: { name: true, email: true } },
      modules: {
        orderBy: { order: "asc" },
        include: {
          lessons: {
            orderBy: { order: "asc" },
            include: {
              blocks: { orderBy: { order: "asc" } },
            },
          },
        },
      },
    },
  });

  if (!course) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Strip DB-specific IDs and relations — keep only portable data
  const bundle = {
    __version: 1,
    exportedAt: new Date().toISOString(),
    originalCreator: { name: course.creator.name, email: course.creator.email },
    course: {
      title: course.title,
      description: course.description,
      coverImage: course.coverImage,
      status: course.status,
      isOpen: course.isOpen,
      modules: course.modules.map((mod) => ({
        title: mod.title,
        order: mod.order,
        lessons: mod.lessons.map((lesson) => ({
          title: lesson.title,
          order: lesson.order,
          duration: lesson.duration,
          blocks: lesson.blocks.map((block) => ({
            type: block.type,
            title: block.title,
            order: block.order,
            payload: block.payload,
          })),
        })),
      })),
    },
  };

  const filename = `course-${course.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${Date.now()}.json`;

  return new NextResponse(JSON.stringify(bundle, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
