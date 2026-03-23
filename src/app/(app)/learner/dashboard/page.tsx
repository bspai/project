// src/app/(app)/learner/dashboard/page.tsx
import { requireRole } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { Metadata } from "next";
import Link from "next/link";
import { Search, Clock, CheckCircle2, FolderOpen } from "lucide-react";
import { Card } from "@/modules/shared/components/Card";
import { Button } from "@/modules/shared/components/Button";
import { Badge } from "@/modules/shared/components/Badge";
import { formatDate, statusLabel } from "@/modules/shared/utils";

export const metadata: Metadata = { title: "Dashboard" };

export default async function LearnerDashboardPage() {
  const session = await requireRole("LEARNER");

  const [assignedProjects, pendingRequests, openProjectCount] = await Promise.all([
    prisma.projectAssignee.findMany({
      where: { learnerId: session.user.id },
      include: {
        project: {
          include: {
            creator: { select: { name: true } },
            _count: { select: { comments: true } },
          },
        },
      },
      orderBy: { assignedAt: "desc" },
      take: 5,
    }),
    prisma.workRequest.count({
      where: { learnerId: session.user.id, status: "PENDING" },
    }),
    prisma.project.count({ where: { status: "OPEN" } }),
  ]);

  const statCards = [
    {
      label: "Active Projects",
      value: assignedProjects.filter((a) => a.project.status === "IN_PROGRESS").length,
      icon: <Clock className="w-5 h-5" />,
      color: "text-warning",
      bg: "bg-warning/10",
    },
    {
      label: "Completed",
      value: assignedProjects.filter((a) => a.project.status === "DONE").length,
      icon: <CheckCircle2 className="w-5 h-5" />,
      color: "text-success",
      bg: "bg-success/10",
    },
    {
      label: "Open to Apply",
      value: openProjectCount,
      icon: <FolderOpen className="w-5 h-5" />,
      color: "text-info",
      bg: "bg-info/10",
    },
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
            {pendingRequests > 0
              ? `You have ${pendingRequests} pending request${pendingRequests > 1 ? "s" : ""}.`
              : "Find a project and start building."}
          </p>
        </div>
        <Link href="/learner/projects">
          <Button leftIcon={<Search className="w-4 h-4" />}>Browse Projects</Button>
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

      {/* My Projects */}
      <Card padding="none">
        <div className="flex items-center justify-between px-6 py-4 border-b border-surface-100">
          <h2 className="text-base font-semibold text-surface-900">My Projects</h2>
          <Link href="/learner/projects">
            <Button variant="ghost" size="sm">Browse all</Button>
          </Link>
        </div>

        {assignedProjects.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
            <div className="w-12 h-12 rounded-2xl bg-surface-100 flex items-center justify-center text-surface-400 mb-3">
              <Search className="w-6 h-6" />
            </div>
            <p className="font-medium text-surface-800 mb-1">No projects yet</p>
            <p className="text-sm text-surface-500 mb-4">
              Browse open projects and request to work on one.
            </p>
            <Link href="/learner/projects">
              <Button size="sm" leftIcon={<Search className="w-4 h-4" />}>
                Find Projects
              </Button>
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-surface-100">
            {assignedProjects.map(({ project }) => (
              <Link
                key={project.id}
                href={`/learner/projects/${project.id}`}
                className="flex items-center gap-4 px-6 py-4 hover:bg-surface-50 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-surface-900 truncate">{project.title}</p>
                  <p className="text-sm text-surface-500 mt-0.5">
                    By {project.creator.name} · Due {formatDate(project.deadline)}
                  </p>
                </div>
                <Badge
                  variant={
                    project.status === "IN_PROGRESS" ? "warning" :
                    project.status === "DONE" ? "success" : "info"
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
