// src/app/(app)/consultant/courses/page.tsx
import { requireRole } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { Metadata } from "next";
import { GraduationCap, BookOpen, Layers, Users } from "lucide-react";
import { Card } from "@/modules/shared/components/Card";
import { EmptyState } from "@/modules/shared/components/EmptyState";

export const metadata: Metadata = { title: "Courses" };
export const dynamic = "force-dynamic";

export default async function ConsultantCoursesPage() {
  await requireRole("CONSULTANT");

  const courses = await prisma.course.findMany({
    where: { status: "PUBLISHED" },
    orderBy: { updatedAt: "desc" },
    include: {
      creator: { select: { id: true, name: true } },
      _count: { select: { modules: true, enrollments: true } },
    },
  });

  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto">
      <div className="flex items-center gap-2 mb-8">
        <GraduationCap className="w-5 h-5 text-surface-400" />
        <h1 className="text-2xl font-bold text-surface-900">Courses</h1>
        <span className="text-sm text-surface-400 ml-1">({courses.length})</span>
      </div>

      {courses.length === 0 ? (
        <EmptyState
          icon={<GraduationCap className="w-8 h-8" />}
          title="No published courses yet"
          description="Courses created by mentors will appear here once published."
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {courses.map((course) => (
            <Card key={course.id} padding="none" className="flex flex-col">
              <div className="h-36 bg-gradient-to-br from-brand-50 to-brand-100 rounded-t-xl flex items-center justify-center overflow-hidden">
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
              </div>

              <div className="p-4 flex flex-col flex-1">
                <h3 className="font-semibold text-surface-900 line-clamp-2 mb-1">{course.title}</h3>
                {course.description && (
                  <p className="text-sm text-surface-500 line-clamp-2 mb-2">{course.description}</p>
                )}
                <p className="text-xs text-surface-400 mb-3">by {course.creator.name}</p>

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
          ))}
        </div>
      )}
    </div>
  );
}
