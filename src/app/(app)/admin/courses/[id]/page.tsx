// src/app/(app)/admin/courses/[id]/page.tsx
import { requireRole } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import {
  GraduationCap, ArrowLeft, Download, BookOpen, Users, Layers,
  CheckCircle2, Clock, ChevronRight,
} from "lucide-react";
import { Card } from "@/modules/shared/components/Card";
import { Badge } from "@/modules/shared/components/Badge";
import { formatDate } from "@/modules/shared/utils";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const course = await prisma.course.findUnique({ where: { id }, select: { title: true } });
  return { title: course ? `${course.title} — Admin` : "Course" };
}

export default async function AdminCourseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireRole("ADMIN");
  const { id } = await params;

  const course = await prisma.course.findUnique({
    where: { id },
    include: {
      creator: { select: { id: true, name: true, email: true } },
      modules: {
        orderBy: { order: "asc" },
        include: {
          lessons: {
            orderBy: { order: "asc" },
            include: { _count: { select: { blocks: true } } },
          },
        },
      },
      _count: { select: { enrollments: true, reviews: true } },
    },
  });

  if (!course) notFound();

  const totalLessons = course.modules.reduce((s, m) => s + m.lessons.length, 0);

  return (
    <div className="p-6 lg:p-8 max-w-4xl mx-auto">
      {/* Back */}
      <Link
        href="/admin/courses"
        className="inline-flex items-center gap-1 text-sm text-surface-500 hover:text-surface-700 mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Course Management
      </Link>

      {/* Header */}
      <div className="flex items-start gap-4 mb-6">
        <div className="w-12 h-12 rounded-xl bg-brand-50 flex items-center justify-center shrink-0">
          {course.coverImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={course.coverImage} alt="" className="w-12 h-12 rounded-xl object-cover" />
          ) : (
            <GraduationCap className="w-6 h-6 text-brand-500" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold text-surface-900">{course.title}</h1>
          <p className="text-sm text-surface-500 mt-0.5">by {course.creator.name} ({course.creator.email})</p>
          <div className="flex items-center gap-3 mt-2 text-xs text-surface-400 flex-wrap">
            <Badge
              variant={course.status === "PUBLISHED" ? "success" : course.status === "ARCHIVED" ? "warning" : "default"}
              dot
            >
              {course.status.charAt(0) + course.status.slice(1).toLowerCase()}
            </Badge>
            <span className="flex items-center gap-1"><Layers className="w-3.5 h-3.5" />{course.modules.length} modules</span>
            <span className="flex items-center gap-1"><BookOpen className="w-3.5 h-3.5" />{totalLessons} lessons</span>
            <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" />{course._count.enrollments} enrolled</span>
            <span className="flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" />{course._count.reviews} reviews</span>
            <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />Updated {formatDate(course.updatedAt)}</span>
          </div>
        </div>

        <a
          href={`/api/admin/courses/${id}/export`}
          download
          className="inline-flex items-center gap-1.5 px-4 h-9 rounded-lg border border-surface-200 text-sm font-medium text-surface-700 hover:bg-surface-50 transition-colors shrink-0"
        >
          <Download className="w-4 h-4" />
          Export
        </a>
      </div>

      {course.description && (
        <Card padding="md" className="mb-6">
          <p className="text-sm text-surface-600 leading-relaxed whitespace-pre-line">{course.description}</p>
        </Card>
      )}

      {/* Module outline */}
      <div className="space-y-3">
        <p className="font-semibold text-surface-900">Course Content</p>
        {course.modules.length === 0 ? (
          <Card padding="md">
            <p className="text-sm text-surface-400 text-center py-2">No modules yet.</p>
          </Card>
        ) : (
          course.modules.map((mod) => (
            <Card key={mod.id} padding="none">
              <div className="px-4 py-3 bg-surface-50 border-b border-surface-100 rounded-t-xl flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center text-xs font-bold shrink-0">
                  {mod.order}
                </span>
                <span className="font-semibold text-surface-900 text-sm">{mod.title}</span>
                <span className="text-xs text-surface-400 ml-auto">{mod.lessons.length} lessons</span>
              </div>
              <div className="divide-y divide-surface-100">
                {mod.lessons.map((lesson) => (
                  <div key={lesson.id} className="flex items-center gap-3 px-4 py-2.5">
                    <ChevronRight className="w-3.5 h-3.5 text-surface-300 shrink-0" />
                    <span className="flex-1 text-sm text-surface-700">{lesson.title}</span>
                    <span className="text-xs text-surface-400">{lesson._count.blocks} block{lesson._count.blocks !== 1 ? "s" : ""}</span>
                  </div>
                ))}
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
