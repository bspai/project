// src/app/(app)/consultant/analytics/page.tsx
import { requireRole } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { Metadata } from "next";
import {
  BarChart2, Activity, CheckCircle2, GitBranch,
  ThumbsUp, Clock, FolderKanban,
} from "lucide-react";
import { Card, CardTitle } from "@/modules/shared/components/Card";
import { Badge } from "@/modules/shared/components/Badge";
import { formatRelative } from "@/modules/shared/utils";

export const metadata: Metadata = { title: "Analytics" };
export const dynamic = "force-dynamic";

const ACTION_LABELS: Record<string, { label: string; variant: "info" | "success" | "warning" | "danger" | "default" }> = {
  project_version_submitted: { label: "Version Submitted",     variant: "info" },
  version_signoff:           { label: "Signoff Given",         variant: "info" },
  version_self_approved:     { label: "Self-Approved",         variant: "default" },
  work_request_approved:     { label: "Request Approved",      variant: "success" },
  work_request_rejected:     { label: "Request Rejected",      variant: "danger" },
  work_request_sent:         { label: "Request Sent",          variant: "default" },
  project_completed:         { label: "Project Completed",     variant: "success" },
  project_reopened:          { label: "Project Reopened",      variant: "warning" },
  project_search:            { label: "Project Search",        variant: "default" },
};

function actionLabel(action: string) {
  return ACTION_LABELS[action]?.label ?? action.replace(/_/g, " ");
}
function actionVariant(action: string) {
  return ACTION_LABELS[action]?.variant ?? "default";
}

export default async function ConsultantAnalyticsPage() {
  const session = await requireRole("CONSULTANT");
  const userId = session.user.id;

  const since30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const since7  = new Date(Date.now() -  7 * 24 * 60 * 60 * 1000);

  const [
    totalEvents30,
    completions30,
    versionsSubmitted30,
    signoffs30,
    totalEvents7,
    breakdown,
    recentRaw,
    projectStats,
  ] = await Promise.all([
    // Stat cards — last 30 days
    prisma.usageEvent.count({ where: { userId, createdAt: { gte: since30 } } }),
    prisma.usageEvent.count({ where: { userId, action: "project_completed",         createdAt: { gte: since30 } } }),
    prisma.usageEvent.count({ where: { userId, action: "project_version_submitted", createdAt: { gte: since30 } } }),
    prisma.usageEvent.count({ where: { userId, action: "version_signoff",           createdAt: { gte: since30 } } }),

    // Week-over-week comparison
    prisma.usageEvent.count({ where: { userId, createdAt: { gte: since7 } } }),

    // Action breakdown — last 30 days
    prisma.usageEvent.groupBy({
      by: ["action"],
      where: { userId, createdAt: { gte: since30 } },
      _count: { action: true },
      orderBy: { _count: { action: "desc" } },
    }),

    // Recent events — last 15
    prisma.usageEvent.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 15,
      select: { id: true, action: true, createdAt: true, projectId: true },
    }),

    // Per-project event counts — top 6 most active (last 30 days)
    prisma.usageEvent.groupBy({
      by: ["projectId"],
      where: { userId, projectId: { not: null }, createdAt: { gte: since30 } },
      _count: { projectId: true },
      orderBy: { _count: { projectId: "desc" } },
      take: 6,
    }),
  ]);

  // Resolve project titles
  const projectIds = [
    ...new Set([
      ...projectStats.map((e) => e.projectId).filter(Boolean) as string[],
      ...recentRaw.map((e) => e.projectId).filter(Boolean) as string[],
    ]),
  ];
  const projects = projectIds.length > 0
    ? await prisma.project.findMany({
        where: { id: { in: projectIds } },
        select: { id: true, title: true, status: true },
      })
    : [];
  const projectMap = Object.fromEntries(projects.map((p) => [p.id, p]));

  const maxBreakdown = breakdown[0]?._count.action ?? 1;
  const maxProjectActivity = projectStats[0]?._count.projectId ?? 1;

  const statCards = [
    {
      label: "Total Actions",
      sublabel: "last 30 days",
      value: totalEvents30,
      icon: <Activity className="w-5 h-5" />,
      color: "text-brand-600",
      bg: "bg-brand-50",
      note: `${totalEvents7} in last 7 days`,
    },
    {
      label: "Versions Submitted",
      sublabel: "last 30 days",
      value: versionsSubmitted30,
      icon: <GitBranch className="w-5 h-5" />,
      color: "text-info",
      bg: "bg-info/10",
      note: null,
    },
    {
      label: "Signoffs Given",
      sublabel: "last 30 days",
      value: signoffs30,
      icon: <ThumbsUp className="w-5 h-5" />,
      color: "text-warning",
      bg: "bg-warning/10",
      note: null,
    },
    {
      label: "Projects Completed",
      sublabel: "last 30 days",
      value: completions30,
      icon: <CheckCircle2 className="w-5 h-5" />,
      color: "text-success",
      bg: "bg-success/10",
      note: null,
    },
  ];

  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-1">
          <BarChart2 className="w-5 h-5 text-surface-400" />
          <h1 className="text-2xl font-bold text-surface-900">Analytics</h1>
        </div>
        <p className="text-sm text-surface-500">Your activity over the last 30 days.</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {statCards.map((stat) => (
          <Card key={stat.label} padding="md">
            <div className="flex items-start gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${stat.bg} ${stat.color} shrink-0`}>
                {stat.icon}
              </div>
              <div className="min-w-0">
                <p className="text-2xl font-bold text-surface-900 leading-none mb-1">{stat.value}</p>
                <p className="text-xs font-medium text-surface-700">{stat.label}</p>
                <p className="text-xs text-surface-400">{stat.sublabel}</p>
                {stat.note && (
                  <p className="text-xs text-surface-400 mt-1">{stat.note}</p>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Action breakdown */}
        <Card padding="md">
          <CardTitle className="mb-4">Activity Breakdown</CardTitle>
          {breakdown.length === 0 ? (
            <p className="text-sm text-surface-400 italic">No activity in the last 30 days.</p>
          ) : (
            <div className="space-y-3">
              {breakdown.map((row) => {
                const count = row._count.action;
                const pct = Math.round((count / maxBreakdown) * 100);
                return (
                  <div key={row.action}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-surface-700">{actionLabel(row.action)}</span>
                      <span className="text-sm font-medium text-surface-900">{count}</span>
                    </div>
                    <div className="h-2 w-full bg-surface-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-brand-500 rounded-full transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        {/* Project activity */}
        <Card padding="md">
          <div className="flex items-center gap-2 mb-4">
            <FolderKanban className="w-4 h-4 text-surface-400" />
            <CardTitle>Most Active Projects</CardTitle>
          </div>
          {projectStats.length === 0 ? (
            <p className="text-sm text-surface-400 italic">No project activity in the last 30 days.</p>
          ) : (
            <div className="space-y-3">
              {projectStats.map((row) => {
                const pid = row.projectId as string;
                const count = row._count.projectId;
                const pct = Math.round((count / maxProjectActivity) * 100);
                const proj = projectMap[pid];
                return (
                  <div key={pid}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-surface-700 truncate max-w-[200px]" title={proj?.title}>
                        {proj?.title ?? "Unknown project"}
                      </span>
                      <div className="flex items-center gap-2 shrink-0">
                        {proj && (
                          <Badge
                            variant={
                              proj.status === "DONE" ? "success" :
                              proj.status === "IN_PROGRESS" ? "warning" :
                              proj.status === "OPEN" ? "info" : "default"
                            }
                          >
                            {proj.status === "IN_PROGRESS" ? "Active" :
                             proj.status.charAt(0) + proj.status.slice(1).toLowerCase()}
                          </Badge>
                        )}
                        <span className="text-sm font-medium text-surface-900">{count}</span>
                      </div>
                    </div>
                    <div className="h-2 w-full bg-surface-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-success rounded-full transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>

      {/* Recent activity */}
      <Card padding="none">
        <div className="flex items-center gap-2 px-6 py-4 border-b border-surface-100">
          <Clock className="w-4 h-4 text-surface-400" />
          <CardTitle>Recent Activity</CardTitle>
        </div>
        {recentRaw.length === 0 ? (
          <div className="px-6 py-10 text-center text-sm text-surface-400 italic">
            No activity recorded yet.
          </div>
        ) : (
          <div className="divide-y divide-surface-100">
            {recentRaw.map((event) => {
              const proj = event.projectId ? projectMap[event.projectId] : null;
              return (
                <div key={event.id} className="flex items-center gap-4 px-6 py-3">
                  <Badge variant={actionVariant(event.action)}>
                    {actionLabel(event.action)}
                  </Badge>
                  <span className="text-sm text-surface-600 flex-1 truncate">
                    {proj?.title ?? (event.projectId ? "Deleted project" : "—")}
                  </span>
                  <span className="text-xs text-surface-400 shrink-0">
                    {formatRelative(event.createdAt)}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
