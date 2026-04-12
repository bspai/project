// src/app/(app)/mentor/dashboard/page.tsx
import { requireRole } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { Metadata } from "next";
import Link from "next/link";
import { GraduationCap, Plus, BookOpen, Users, Eye } from "lucide-react";
import { Card } from "@/modules/shared/components/Card";
import { Button } from "@/modules/shared/components/Button";
import { Badge } from "@/modules/shared/components/Badge";

export const metadata: Metadata = { title: "Mentor Dashboard" };

export default async function MentorDashboardPage() {
  const session = await requireRole("MENTOR");

  const [courses, totalEnrollments] = await Promise.all([
    prisma.course.findMany({
      where: { creatorId: session.user.id },
      orderBy: { updatedAt: "desc" },
      take: 5,
      include: {
        _count: { select: { modules: true, enrollments: true } },
      },
    }),
    prisma.enrollment.count({
      where: { course: { creatorId: session.user.id } },
    }),
  ]);

  const published = courses.filter((c) => c.status === "PUBLISHED").length;
  const drafts = courses.filter((c) => c.status === "DRAFT").length;

  const statCards = [
    { label: "Total Courses",   value: courses.length,    icon: <GraduationCap className="w-5 h-5" />, color: "text-brand-600",  bg: "bg-brand-50" },
    { label: "Published",       value: published,          icon: <Eye className="w-5 h-5" />,           color: "text-success",    bg: "bg-success/10" },
    { label: "Total Learners",  value: totalEnrollments,  icon: <Users className="w-5 h-5" />,          color: "text-info",       bg: "bg-info/10" },
  ];

  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-surface-900">
            Welcome back, {session.user.name.split(" ")[0]}
          </h1>
          <p className="text-surface-500 text-sm mt-0.5">
            {drafts > 0
              ? `You have ${drafts} draft course${drafts > 1 ? "s" : ""} ready to publish.`
              : "Here's an overview of your courses."}
          </p>
        </div>
        <Link href="/mentor/courses/new">
          <Button leftIcon={<Plus className="w-4 h-4" />}>New Course</Button>
        </Link>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        {statCards.map((stat) => (
          <Card key={stat.label} padding="md">
            <div className="flex items-center gap-4">
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${stat.bg} ${stat.color} shrink-0`}>
                {stat.icon}
              </div>
              <div>
                <p className="text-2xl font-bold text-surface-900">{stat.value}</p>
                <p className="text-sm text-surface-500">{stat.label}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Recent courses */}
      <Card padding="none">
        <div className="flex items-center justify-between px-6 py-4 border-b border-surface-100">
          <div className="flex items-center gap-2">
            <GraduationCap className="w-5 h-5 text-surface-400" />
            <h2 className="text-base font-semibold text-surface-900">My Courses</h2>
          </div>
          <Link href="/mentor/courses">
            <Button variant="ghost" size="sm">View all</Button>
          </Link>
        </div>

        {courses.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
            <div className="w-12 h-12 rounded-2xl bg-surface-100 flex items-center justify-center text-surface-400 mb-3">
              <GraduationCap className="w-6 h-6" />
            </div>
            <p className="font-medium text-surface-800 mb-1">No courses yet</p>
            <p className="text-sm text-surface-500 mb-4">Create your first course to start teaching.</p>
            <Link href="/mentor/courses/new">
              <Button size="sm" leftIcon={<Plus className="w-4 h-4" />}>Create Course</Button>
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-surface-100">
            {courses.map((course) => (
              <Link
                key={course.id}
                href={`/mentor/courses/${course.id}`}
                className="flex items-center gap-4 px-6 py-4 hover:bg-surface-50 transition-colors"
              >
                <div className="w-10 h-10 rounded-lg bg-brand-50 flex items-center justify-center shrink-0">
                  <BookOpen className="w-5 h-5 text-brand-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-surface-900 truncate">{course.title}</p>
                  <p className="text-sm text-surface-500 mt-0.5">
                    {course._count.modules} module{course._count.modules !== 1 ? "s" : ""} · {course._count.enrollments} enrolled
                  </p>
                </div>
                <Badge
                  variant={
                    course.status === "PUBLISHED" ? "success" :
                    course.status === "DRAFT" ? "default" : "warning"
                  }
                  dot
                >
                  {course.status.charAt(0) + course.status.slice(1).toLowerCase()}
                </Badge>
              </Link>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
