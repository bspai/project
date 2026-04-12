// src/app/(app)/learner/courses/[id]/page.tsx
import { requireAuth } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { GraduationCap, BookOpen, Layers, Users, Clock, CheckCircle2, Lock } from "lucide-react";
import { formatDate } from "@/modules/shared/utils";
import { Card } from "@/modules/shared/components/Card";
import { Badge } from "@/modules/shared/components/Badge";
import { StarDisplay } from "@/modules/shared/components/StarRating";
import { EnrollButton } from "./EnrollButton";
import { CourseReviews } from "./CourseReviews";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const course = await prisma.course.findUnique({ where: { id }, select: { title: true } });
  return { title: course?.title ?? "Course" };
}

export default async function LearnerCourseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireAuth();
  const { id } = await params;

  const course = await prisma.course.findUnique({
    where: { id, status: "PUBLISHED" },
    include: {
      creator: { select: { id: true, name: true } },
      modules: {
        orderBy: { order: "asc" },
        include: {
          lessons: {
            orderBy: { order: "asc" },
            select: { id: true, title: true, duration: true, order: true },
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

  if (!course) notFound();

  const enrollment = await prisma.enrollment.findUnique({
    where: { courseId_learnerId: { courseId: id, learnerId: session.user.id } },
    include: {
      progress: { select: { lessonId: true, isComplete: true } },
    },
  });

  const isEnrolled = !!enrollment;
  const totalLessons = course.modules.reduce((sum, m) => sum + m.lessons.length, 0);
  const completedLessons = enrollment?.progress.filter((p) => p.isComplete).length ?? 0;
  const completedSet = new Set(
    enrollment?.progress.filter((p) => p.isComplete).map((p) => p.lessonId) ?? []
  );
  const pct = totalLessons > 0 && isEnrolled ? Math.round((completedLessons / totalLessons) * 100) : 0;

  // Reviews
  const reviews = course.reviews;
  const reviewCount = reviews.length;
  const avgRating =
    reviewCount > 0
      ? Math.round((reviews.reduce((s, r) => s + r.rating, 0) / reviewCount) * 10) / 10
      : null;
  const existingReview = reviews.find((r) => r.learnerId === session.user.id) ?? null;
  const courseComplete = isEnrolled && totalLessons > 0 && completedLessons === totalLessons;

  // Find first incomplete lesson for "Continue" CTA
  let firstLessonId: string | null = null;
  let resumeLessonId: string | null = null;
  for (const mod of course.modules) {
    for (const lesson of mod.lessons) {
      if (!firstLessonId) firstLessonId = lesson.id;
      if (!resumeLessonId && !completedSet.has(lesson.id)) resumeLessonId = lesson.id;
    }
  }

  return (
    <div className="p-6 lg:p-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-start gap-4 mb-6">
        <div className="w-12 h-12 rounded-xl bg-brand-50 flex items-center justify-center shrink-0">
          {course.coverImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={course.coverImage} alt={course.title} className="w-12 h-12 rounded-xl object-cover" />
          ) : (
            <GraduationCap className="w-6 h-6 text-brand-600" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold text-surface-900">{course.title}</h1>
          <p className="text-sm text-surface-500 mt-1">by {course.creator.name}</p>
          <div className="flex items-center gap-3 mt-2 text-xs text-surface-400 flex-wrap">
            <span className="flex items-center gap-1">
              <Layers className="w-3.5 h-3.5" />
              {course.modules.length} module{course.modules.length !== 1 ? "s" : ""}
            </span>
            <span className="flex items-center gap-1">
              <BookOpen className="w-3.5 h-3.5" />
              {totalLessons} lesson{totalLessons !== 1 ? "s" : ""}
            </span>
            <span className="flex items-center gap-1">
              <Users className="w-3.5 h-3.5" />
              {course._count.enrollments} enrolled
            </span>
            <span>Last Updated: {formatDate(course.updatedAt)}</span>
            <StarDisplay avg={avgRating} count={reviewCount} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-4">
          {course.description && (
            <Card padding="md">
              <h2 className="font-semibold text-surface-900 mb-2">About this course</h2>
              <p className="text-sm text-surface-600 leading-relaxed whitespace-pre-line">
                {course.description}
              </p>
            </Card>
          )}

          {/* Reviews */}
          <CourseReviews
            courseId={id}
            currentUserId={session.user.id}
            canReview={courseComplete}
            // Dates are serialized to strings by Next.js Server→Client boundary
            existingReview={existingReview as never}
            reviews={reviews as never}
            avg={avgRating}
            count={reviewCount}
          />

          {/* Module & lesson list */}
          <div className="space-y-3">
            {course.modules.map((mod) => (
              <Card key={mod.id} padding="none">
                <div className="px-4 py-3 border-b border-surface-100 bg-surface-50 rounded-t-xl">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center text-xs font-bold shrink-0">
                      {mod.order}
                    </span>
                    <h3 className="font-semibold text-surface-900 text-sm">{mod.title}</h3>
                    <span className="text-xs text-surface-400 ml-auto">
                      {mod.lessons.length} lesson{mod.lessons.length !== 1 ? "s" : ""}
                    </span>
                  </div>
                </div>

                <div className="divide-y divide-surface-100">
                  {mod.lessons.map((lesson) => {
                    const isComplete = completedSet.has(lesson.id);
                    return (
                      <div key={lesson.id} className="flex items-center gap-3 px-4 py-3">
                        {isEnrolled ? (
                          isComplete ? (
                            <CheckCircle2 className="w-4 h-4 text-success shrink-0" />
                          ) : (
                            <BookOpen className="w-4 h-4 text-surface-400 shrink-0" />
                          )
                        ) : (
                          <Lock className="w-4 h-4 text-surface-300 shrink-0" />
                        )}

                        {isEnrolled ? (
                          <Link
                            href={`/learner/courses/${id}/learn/${lesson.id}`}
                            className="flex-1 text-sm font-medium text-brand-600 hover:text-brand-700 hover:underline truncate"
                          >
                            {lesson.title}
                          </Link>
                        ) : (
                          <span className="flex-1 text-sm text-surface-600 truncate">{lesson.title}</span>
                        )}

                        {lesson.duration && (
                          <span className="text-xs text-surface-400 shrink-0 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {lesson.duration} min
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <Card padding="md">
            {isEnrolled ? (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-success" />
                  <span className="text-sm font-medium text-surface-900">Enrolled</span>
                </div>

                {totalLessons > 0 && (
                  <div>
                    <div className="flex items-center justify-between text-sm mb-1.5">
                      <span className="text-surface-600">Progress</span>
                      <span className="font-semibold text-surface-900">{pct}%</span>
                    </div>
                    <div className="h-2 bg-surface-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-brand-500 rounded-full transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <p className="text-xs text-surface-500 mt-1.5">
                      {completedLessons} of {totalLessons} lessons complete
                    </p>
                  </div>
                )}

                {resumeLessonId ? (
                  <Link href={`/learner/courses/${id}/learn/${resumeLessonId}`}>
                    <button className="w-full h-10 rounded-lg bg-brand-600 text-white text-sm font-medium hover:bg-brand-700 transition-colors">
                      {completedLessons === 0 ? "Start Course" : "Continue Learning"}
                    </button>
                  </Link>
                ) : (
                  <div className="text-center py-1">
                    <Badge variant="success">Course Complete!</Badge>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-surface-600">
                  {course.isOpen
                    ? "Enroll to access all lessons and track your progress."
                    : "This course requires admin enrollment."}
                </p>
                {course.isOpen && (
                  <EnrollButton courseId={id} />
                )}
                {!course.isOpen && (
                  <div className="flex items-center gap-2 text-sm text-surface-500">
                    <Lock className="w-4 h-4 shrink-0" />
                    Contact an admin to be enrolled.
                  </div>
                )}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
