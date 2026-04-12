// src/app/(app)/learner/courses/[id]/learn/[lessonId]/page.tsx
import { requireAuth } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { LessonPlayer } from "./LessonPlayer";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string; lessonId: string }>;
}): Promise<Metadata> {
  const { lessonId } = await params;
  const lesson = await prisma.lesson.findUnique({ where: { id: lessonId }, select: { title: true } });
  return { title: lesson?.title ?? "Lesson" };
}

export default async function LessonPlayerPage({
  params,
}: {
  params: Promise<{ id: string; lessonId: string }>;
}) {
  const session = await requireAuth();
  const { id, lessonId } = await params;

  // Verify enrollment
  const enrollment = await prisma.enrollment.findUnique({
    where: { courseId_learnerId: { courseId: id, learnerId: session.user.id } },
    include: {
      progress: { select: { lessonId: true, isComplete: true } },
    },
  });
  if (!enrollment) notFound();

  // Fetch full course structure for sidebar nav
  const course = await prisma.course.findUnique({
    where: { id, status: "PUBLISHED" },
    select: {
      id: true,
      title: true,
      modules: {
        orderBy: { order: "asc" },
        select: {
          id: true,
          title: true,
          order: true,
          lessons: {
            orderBy: { order: "asc" },
            select: { id: true, title: true, order: true },
          },
        },
      },
    },
  });
  if (!course) notFound();

  // Fetch the current lesson with blocks
  const lesson = await prisma.lesson.findFirst({
    where: { id: lessonId, module: { courseId: id } },
    include: { blocks: { orderBy: { order: "asc" } } },
  });
  if (!lesson) notFound();

  const progressSet = new Set(
    enrollment.progress.filter((p) => p.isComplete).map((p) => p.lessonId)
  );

  // Build flat lesson list for prev/next navigation
  const allLessons = course.modules.flatMap((m) => m.lessons);
  const currentIndex = allLessons.findIndex((l) => l.id === lessonId);
  const prevLesson = currentIndex > 0 ? allLessons[currentIndex - 1] : null;
  const nextLesson = currentIndex < allLessons.length - 1 ? allLessons[currentIndex + 1] : null;

  return (
    <div className="flex h-full">
      {/* Sidebar course nav */}
      <aside className="hidden lg:flex flex-col w-72 border-r border-surface-200 bg-white overflow-y-auto shrink-0">
        <div className="px-4 py-3 border-b border-surface-100">
          <Link
            href={`/learner/courses/${id}`}
            className="flex items-center gap-1.5 text-xs text-surface-500 hover:text-brand-600 transition-colors"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            Back to course
          </Link>
          <p className="font-semibold text-surface-900 text-sm mt-2 line-clamp-2">{course.title}</p>
        </div>

        <nav className="flex-1 py-2">
          {course.modules.map((mod) => (
            <div key={mod.id}>
              <div className="px-4 py-2">
                <p className="text-xs font-semibold text-surface-500 uppercase tracking-wider">
                  {mod.order}. {mod.title}
                </p>
              </div>
              {mod.lessons.map((l) => {
                const isComplete = progressSet.has(l.id);
                const isCurrent = l.id === lessonId;
                return (
                  <Link
                    key={l.id}
                    href={`/learner/courses/${id}/learn/${l.id}`}
                    className={`flex items-center gap-2.5 px-4 py-2.5 text-sm transition-colors ${
                      isCurrent
                        ? "bg-brand-50 text-brand-700 font-medium"
                        : "text-surface-700 hover:bg-surface-50"
                    }`}
                  >
                    <span className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 text-xs ${
                      isComplete
                        ? "bg-success border-success text-white"
                        : isCurrent
                        ? "border-brand-400 text-brand-600"
                        : "border-surface-300 text-surface-400"
                    }`}>
                      {isComplete ? "✓" : l.order}
                    </span>
                    <span className="truncate">{l.title}</span>
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>
      </aside>

      {/* Main lesson content */}
      <div className="flex-1 overflow-y-auto">
        <LessonPlayer
          courseId={id}
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          lesson={lesson as any}
          isComplete={progressSet.has(lessonId)}
          prevLesson={prevLesson}
          nextLesson={nextLesson}
        />
      </div>
    </div>
  );
}
