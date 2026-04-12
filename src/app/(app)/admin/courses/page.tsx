// src/app/(app)/admin/courses/page.tsx
import { requireRole } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { Metadata } from "next";
import Link from "next/link";
import {
  GraduationCap, Download, BookOpen, Users, Layers, Eye, EyeOff, FileText,
} from "lucide-react";
import { Card } from "@/modules/shared/components/Card";
import { Badge } from "@/modules/shared/components/Badge";
import { EmptyState } from "@/modules/shared/components/EmptyState";
import { ImportCourseForm } from "./ImportCourseForm";
import { formatDate } from "@/modules/shared/utils";

export const metadata: Metadata = { title: "Course Management" };
export const dynamic = "force-dynamic";

function statusVariant(status: string) {
  if (status === "PUBLISHED") return "success";
  if (status === "ARCHIVED") return "warning";
  return "default";
}

export default async function AdminCoursesPage() {
  await requireRole("ADMIN");

  const [courses, mentors] = await Promise.all([
    prisma.course.findMany({
      orderBy: { updatedAt: "desc" },
      include: {
        creator: { select: { id: true, name: true, email: true } },
        _count: { select: { modules: true, enrollments: true } },
      },
    }),
    prisma.user.findMany({
      where: { roles: { has: "MENTOR" } },
      orderBy: { name: "asc" },
      select: { id: true, name: true, email: true },
    }),
  ]);

  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-2">
          <GraduationCap className="w-5 h-5 text-surface-400" />
          <h1 className="text-2xl font-bold text-surface-900">Course Management</h1>
        </div>
        <ImportCourseForm mentors={mentors} />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {[
          { label: "Total Courses",    value: courses.length,                                              icon: <GraduationCap className="w-5 h-5" />, color: "text-brand-600",  bg: "bg-brand-50" },
          { label: "Published",        value: courses.filter((c) => c.status === "PUBLISHED").length,      icon: <Eye className="w-5 h-5" />,           color: "text-success",    bg: "bg-success/10" },
          { label: "Draft / Archived", value: courses.filter((c) => c.status !== "PUBLISHED").length,     icon: <EyeOff className="w-5 h-5" />,        color: "text-warning",    bg: "bg-warning/10" },
        ].map((s) => (
          <Card key={s.label} padding="md">
            <div className="flex items-center gap-4">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${s.bg} ${s.color}`}>
                {s.icon}
              </div>
              <div>
                <p className="text-2xl font-bold text-surface-900">{s.value}</p>
                <p className="text-sm text-surface-500">{s.label}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Course list */}
      <Card padding="none">
        <div className="px-6 py-4 border-b border-surface-100 flex items-center justify-between">
          <p className="font-semibold text-surface-900">All Courses</p>
          <span className="text-xs text-surface-400">{courses.length} total</span>
        </div>

        {courses.length === 0 ? (
          <EmptyState
            icon={<GraduationCap className="w-8 h-8" />}
            title="No courses yet"
            description="Import a course or ask a mentor to create one."
          />
        ) : (
          <div className="divide-y divide-surface-100">
            {courses.map((course) => (
              <div key={course.id} className="flex items-center gap-4 px-6 py-4">
                {/* Icon */}
                <div className="w-9 h-9 rounded-xl bg-brand-50 flex items-center justify-center shrink-0">
                  {course.coverImage ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={course.coverImage} alt="" className="w-9 h-9 rounded-xl object-cover" />
                  ) : (
                    <BookOpen className="w-4 h-4 text-brand-400" />
                  )}
                </div>

                {/* Title + meta */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-surface-900 truncate">{course.title}</p>
                  <div className="flex items-center gap-3 mt-0.5 text-xs text-surface-400 flex-wrap">
                    <span>by {course.creator.name}</span>
                    <span className="flex items-center gap-1">
                      <Layers className="w-3 h-3" />
                      {course._count.modules} module{course._count.modules !== 1 ? "s" : ""}
                    </span>
                    <span className="flex items-center gap-1">
                      <Users className="w-3 h-3" />
                      {course._count.enrollments} enrolled
                    </span>
                    <span>Updated {formatDate(course.updatedAt)}</span>
                  </div>
                </div>

                {/* Status badge */}
                <Badge variant={statusVariant(course.status)} dot>
                  {course.status.charAt(0) + course.status.slice(1).toLowerCase()}
                </Badge>

                {/* Actions */}
                <div className="flex items-center gap-2 shrink-0">
                  <Link
                    href={`/admin/courses/${course.id}`}
                    className="inline-flex items-center gap-1.5 px-3 h-8 rounded-lg border border-surface-200 text-xs font-medium text-surface-700 hover:bg-surface-50 transition-colors"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    View
                  </Link>

                  {/* Export — triggers file download via anchor */}
                  <a
                    href={`/api/admin/courses/${course.id}/export`}
                    download
                    className="inline-flex items-center gap-1.5 px-3 h-8 rounded-lg border border-surface-200 text-xs font-medium text-surface-700 hover:bg-surface-50 transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Export
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
