// src/app/(app)/learner/courses/page.tsx
import { requireAuth } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { Metadata } from "next";
import Link from "next/link";
import { GraduationCap, BookOpen, Users, Layers, CheckCircle2 } from "lucide-react";
import { Card } from "@/modules/shared/components/Card";
import { Badge } from "@/modules/shared/components/Badge";
import { EmptyState } from "@/modules/shared/components/EmptyState";
import { StarDisplay } from "@/modules/shared/components/StarRating";

export const metadata: Metadata = { title: "Courses" };
export const dynamic = "force-dynamic";

export default async function LearnerCoursesPage() {
  const session = await requireAuth();

  // All published courses, with enrollment + progress status for the current user
  const courses = await prisma.course.findMany({
    where: { status: "PUBLISHED" },
    orderBy: { updatedAt: "desc" },
    include: {
      creator: { select: { id: true, name: true } },
      _count: { select: { modules: true, enrollments: true } },
      enrollments: {
        where: { learnerId: session.user.id },
        include: {
          progress: { select: { lessonId: true, isComplete: true } },
        },
      },
      modules: {
        select: { _count: { select: { lessons: true } } },
      },
      reviews: { select: { rating: true } },
    },
  });

  const enrolled = courses.filter((c) => c.enrollments.length > 0);
  const available = courses.filter((c) => c.enrollments.length === 0);

  function CourseCard({ course }: { course: typeof courses[number] }) {
    const enrollment = course.enrollments[0] ?? null;
    const totalLessons = course.modules.reduce((sum, m) => sum + m._count.lessons, 0);
    const completedLessons = enrollment?.progress.filter((p) => p.isComplete).length ?? 0;
    const pct = totalLessons > 0 && enrollment ? Math.round((completedLessons / totalLessons) * 100) : 0;
    const reviewCount = course.reviews.length;
    const avgRating =
      reviewCount > 0
        ? Math.round((course.reviews.reduce((s, r) => s + r.rating, 0) / reviewCount) * 10) / 10
        : null;

    return (
      <Link href={`/learner/courses/${course.id}`}>
        <Card padding="none" className="hover:shadow-md transition-shadow h-full flex flex-col">
          <div className="h-36 bg-gradient-to-br from-brand-50 to-brand-100 rounded-t-xl flex items-center justify-center relative overflow-hidden">
            {course.coverImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={course.coverImage} alt={course.title} className="w-full h-full object-cover" />
            ) : (
              <BookOpen className="w-10 h-10 text-brand-300" />
            )}
            {enrollment && completedLessons === totalLessons && totalLessons > 0 && (
              <div className="absolute top-3 right-3">
                <Badge variant="success" dot>Complete</Badge>
              </div>
            )}
          </div>

          <div className="p-4 flex flex-col flex-1">
            <h3 className="font-semibold text-surface-900 line-clamp-2 mb-1">{course.title}</h3>
            {course.description && (
              <p className="text-sm text-surface-500 line-clamp-2 mb-2">{course.description}</p>
            )}
            <p className="text-xs text-surface-400 mb-3">by {course.creator.name}</p>

            {enrollment && (
              <div className="mb-3">
                <div className="flex items-center justify-between text-xs text-surface-500 mb-1">
                  <span>Progress</span>
                  <span>{completedLessons}/{totalLessons} lessons</span>
                </div>
                <div className="h-1.5 bg-surface-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-brand-500 rounded-full transition-all"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            )}

            <div className="mt-auto flex items-center gap-4 text-xs text-surface-400 flex-wrap">
              <span className="flex items-center gap-1">
                <Layers className="w-3.5 h-3.5" />
                {course._count.modules} module{course._count.modules !== 1 ? "s" : ""}
              </span>
              <span className="flex items-center gap-1">
                <Users className="w-3.5 h-3.5" />
                {course._count.enrollments} enrolled
              </span>
              <StarDisplay avg={avgRating} count={reviewCount} size="sm" />
            </div>
          </div>
        </Card>
      </Link>
    );
  }

  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto">
      <div className="flex items-center gap-2 mb-8">
        <GraduationCap className="w-5 h-5 text-surface-400" />
        <h1 className="text-2xl font-bold text-surface-900">Courses</h1>
      </div>

      {/* Enrolled courses */}
      {enrolled.length > 0 && (
        <div className="mb-10">
          <div className="flex items-center gap-2 mb-4">
            <CheckCircle2 className="w-4 h-4 text-success" />
            <h2 className="font-semibold text-surface-900">My Courses</h2>
            <Badge variant="success">{enrolled.length}</Badge>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {enrolled.map((c) => <CourseCard key={c.id} course={c} />)}
          </div>
        </div>
      )}

      {/* Available courses */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <BookOpen className="w-4 h-4 text-surface-400" />
          <h2 className="font-semibold text-surface-900">Available Courses</h2>
          <Badge variant="default">{available.length}</Badge>
        </div>

        {available.length === 0 ? (
          <EmptyState
            icon={<GraduationCap className="w-8 h-8" />}
            title="No courses available"
            description="Check back later — new courses will appear here when published."
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {available.map((c) => <CourseCard key={c.id} course={c} />)}
          </div>
        )}
      </div>
    </div>
  );
}
