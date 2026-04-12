// src/app/(app)/mentor/courses/[id]/page.tsx
import { requireRole } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { Metadata } from "next";
import { notFound } from "next/navigation";
import { CourseBuilder } from "./CourseBuilder";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const course = await prisma.course.findUnique({ where: { id }, select: { title: true } });
  return { title: course ? `${course.title} — Builder` : "Course Builder" };
}

export default async function MentorCourseBuilderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireRole("MENTOR");
  const { id } = await params;

  const course = await prisma.course.findUnique({
    where: { id },
    include: {
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
      _count: { select: { enrollments: true } },
      reviews: {
        orderBy: { createdAt: "desc" },
        include: { learner: { select: { id: true, name: true, avatar: true } } },
      },
    },
  });

  if (!course || course.creatorId !== session.user.id) notFound();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return <CourseBuilder course={course as any} />;
}
