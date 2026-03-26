// src/app/(app)/consultant/dashboard/page.tsx
import { requireRole } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { Metadata } from "next";
import Link from "next/link";
import { FolderKanban, Plus, Clock, CheckCircle2, CircleDot, Bell } from "lucide-react";
import { Card } from "@/modules/shared/components/Card";
import { Button } from "@/modules/shared/components/Button";
import { Badge } from "@/modules/shared/components/Badge";
import { formatDate, statusLabel } from "@/modules/shared/utils";

export const metadata: Metadata = { title: "Dashboard" };

export default async function ConsultantDashboardPage() {
  const session = await requireRole("CONSULTANT");

  const [projects, stats, pendingRequestCount] = await Promise.all([
    prisma.project.findMany({
      where: { creatorId: session.user.id },
      orderBy: { updatedAt: "desc" },
      take: 5,
      include: {
        _count: { select: { workRequests: true, comments: true } },
        versions: { where: { isActive: true }, take: 1 },
      },
    }),
    prisma.project.groupBy({
      by: ["status"],
      where: { creatorId: session.user.id },
      _count: true,
    }),
    // Count pending work requests across all consultant's OPEN projects
    prisma.workRequest.count({
      where: {
        status: "PENDING",
        project: { creatorId: session.user.id, status: "OPEN" },
      },
    }),
  ]);

  const statMap = Object.fromEntries(stats.map((s) => [s.status, s._count]));

  const statCards = [
    { label: "Open",        value: statMap.OPEN ?? 0,        icon: <CircleDot className="w-5 h-5" />,    color: "text-info",    bg: "bg-info/10" },
    { label: "In Progress", value: statMap.IN_PROGRESS ?? 0, icon: <Clock className="w-5 h-5" />,        color: "text-warning", bg: "bg-warning/10" },
    { label: "Completed",   value: statMap.DONE ?? 0,        icon: <CheckCircle2 className="w-5 h-5" />, color: "text-success", bg: "bg-success/10" },
  ];

  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-surface-900">
            Welcome back, {session.user.name.split(" ")[0]} 👋
          </h1>
          <p className="text-surface-500 text-sm mt-0.5">
            {pendingRequestCount > 0
              ? `You have ${pendingRequestCount} pending work request${pendingRequestCount > 1 ? "s" : ""} to review.`
              : "Here's an overview of your projects."}
          </p>
        </div>
        <Link href="/consultant/projects/new">
          <Button leftIcon={<Plus className="w-4 h-4" />}>New Project</Button>
        </Link>
      </div>

      {/* Pending requests alert */}
      {pendingRequestCount > 0 && (
        <div className="flex items-center gap-3 bg-brand-50 border border-brand-200 rounded-xl px-4 py-3 mb-6">
          <Bell className="w-4 h-4 text-brand-600 shrink-0" />
          <p className="text-sm text-brand-800 flex-1">
            <span className="font-semibold">{pendingRequestCount} learner{pendingRequestCount > 1 ? "s" : ""}</span> requested to work on your projects.
          </p>
          <Link href="/consultant/projects">
            <Button size="sm" variant="outline">Review</Button>
          </Link>
        </div>
      )}

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

      {/* Recent projects */}
      <Card padding="none">
        <div className="flex items-center justify-between px-6 py-4 border-b border-surface-100">
          <div className="flex items-center gap-2">
            <FolderKanban className="w-5 h-5 text-surface-400" />
            <h2 className="text-base font-semibold text-surface-900">Recent Projects</h2>
          </div>
          <Link href="/consultant/projects">
            <Button variant="ghost" size="sm">View all</Button>
          </Link>
        </div>

        {projects.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
            <div className="w-12 h-12 rounded-2xl bg-surface-100 flex items-center justify-center text-surface-400 mb-3">
              <FolderKanban className="w-6 h-6" />
            </div>
            <p className="font-medium text-surface-800 mb-1">No projects yet</p>
            <p className="text-sm text-surface-500 mb-4">Create your first project to get started.</p>
            <Link href="/consultant/projects/new">
              <Button size="sm" leftIcon={<Plus className="w-4 h-4" />}>Create Project</Button>
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-surface-100">
            {projects.map((project) => (
              <Link
                key={project.id}
                href={`/consultant/projects/${project.id}`}
                className="flex items-center gap-4 px-6 py-4 hover:bg-surface-50 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-surface-900 truncate">{project.title}</p>
                    {project._count.workRequests > 0 && project.status === "OPEN" && (
                      <Badge variant="info">{project._count.workRequests} requests</Badge>
                    )}
                  </div>
                  <p className="text-sm text-surface-500 mt-0.5">
                    Due {formatDate(project.deadline)} · {project._count.comments} comments
                  </p>
                </div>
                <Badge
                  variant={
                    project.status === "OPEN" ? "info" :
                    project.status === "IN_PROGRESS" ? "warning" :
                    project.status === "DONE" ? "success" : "default"
                  }
                  dot
                >
                  {statusLabel(project.status)}
                </Badge>
              </Link>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
