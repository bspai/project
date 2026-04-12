// src/app/(app)/mentor/courses/page.tsx
import { requireRole } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { Metadata } from "next";
import Link from "next/link";
import { GraduationCap, Plus, BookOpen, Users, Layers } from "lucide-react";
import { Card } from "@/modules/shared/components/Card";
import { Button } from "@/modules/shared/components/Button";
import { Badge } from "@/modules/shared/components/Badge";
import { EmptyState } from "@/modules/shared/components/EmptyState";

export const metadata: Metadata = { title: "My Courses" };
export const dynamic = "force-dynamic";

export default async function MentorCoursesPage() {
  const session = await requireRole("MENTOR");

  const courses = await prisma.course.findMany({
    where: { creatorId: session.user.id },
    orderBy: { updatedAt: "desc" },
    include: {
      _count: { select: { modules: true, enrollments: true } },
    },
  });

  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-2">
          <GraduationCap className="w-5 h-5 text-surface-400" />
          <h1 className="text-2xl font-bold text-surface-900">My Courses</h1>
        </div>
        <Link href="/mentor/courses/new">
          <Button leftIcon={<Plus className="w-4 h-4" />}>New Course</Button>
        </Link>
      </div>

      {courses.length === 0 ? (
        <EmptyState
          icon={<GraduationCap className="w-8 h-8" />}
          title="No courses yet"
          description="Create your first course to start sharing knowledge with learners."
          action={
            <Link href="/mentor/courses/new">
              <Button leftIcon={<Plus className="w-4 h-4" />}>Create Course</Button>
            </Link>
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {courses.map((course) => (
            <Link key={course.id} href={`/mentor/courses/${course.id}`}>
              <Card padding="none" className="hover:shadow-md transition-shadow h-full flex flex-col">
                {/* Cover image or placeholder */}
                <div className="h-36 bg-gradient-to-br from-brand-50 to-brand-100 rounded-t-xl flex items-center justify-center relative overflow-hidden">
                  {course.coverImage ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={course.coverImage}
                      alt={course.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <BookOpen className="w-10 h-10 text-brand-300" />
                  )}
                  <div className="absolute top-3 right-3">
                    <Badge
                      variant={
                        course.status === "PUBLISHED" ? "success" :
                        course.status === "DRAFT" ? "default" : "warning"
                      }
                      dot
                    >
                      {course.status.charAt(0) + course.status.slice(1).toLowerCase()}
                    </Badge>
                  </div>
                </div>

                <div className="p-4 flex flex-col flex-1">
                  <h3 className="font-semibold text-surface-900 line-clamp-2 mb-1">{course.title}</h3>
                  {course.description && (
                    <p className="text-sm text-surface-500 line-clamp-2 mb-3">{course.description}</p>
                  )}
                  <div className="mt-auto flex items-center gap-4 text-xs text-surface-400">
                    <span className="flex items-center gap-1">
                      <Layers className="w-3.5 h-3.5" />
                      {course._count.modules} module{course._count.modules !== 1 ? "s" : ""}
                    </span>
                    <span className="flex items-center gap-1">
                      <Users className="w-3.5 h-3.5" />
                      {course._count.enrollments} enrolled
                    </span>
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
