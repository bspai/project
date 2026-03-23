// src/app/(app)/consultant/projects/page.tsx
import { requireRole } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { Metadata } from "next";
import Link from "next/link";
import { Plus, FolderKanban } from "lucide-react";
import { Button } from "@/modules/shared/components/Button";
import { Badge } from "@/modules/shared/components/Badge";
import { Card } from "@/modules/shared/components/Card";
import { EmptyState } from "@/modules/shared/components/EmptyState";
import { formatDate, formatDeadline, statusLabel } from "@/modules/shared/utils";

export const metadata: Metadata = { title: "My Projects" };

export default async function ConsultantProjectsPage() {
  const session = await requireRole("CONSULTANT");

  const projects = await prisma.project.findMany({
    where: { creatorId: session.user.id },
    orderBy: { updatedAt: "desc" },
    include: {
      versions: {
        where: { isActive: true },
        select: { versionNumber: true },
        take: 1,
      },
      _count: {
        select: { workRequests: true, comments: true, milestones: true },
      },
    },
  });

  const statusBadgeVariant = (status: string) => {
    if (status === "OPEN") return "info";
    if (status === "IN_PROGRESS") return "warning";
    if (status === "DONE") return "success";
    return "default";
  };

  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-surface-900">My Projects</h1>
          <p className="text-surface-500 text-sm mt-0.5">
            {projects.length} project{projects.length !== 1 ? "s" : ""} total
          </p>
        </div>
        <Link href="/consultant/projects/new">
          <Button leftIcon={<Plus className="w-4 h-4" />}>New Project</Button>
        </Link>
      </div>

      {projects.length === 0 ? (
        <Card>
          <EmptyState
            icon={<FolderKanban className="w-7 h-7" />}
            title="No projects yet"
            description="Create your first project and start matching with learners."
            action={
              <Link href="/consultant/projects/new">
                <Button leftIcon={<Plus className="w-4 h-4" />}>Create Project</Button>
              </Link>
            }
          />
        </Card>
      ) : (
        <Card padding="none">
          <div className="grid grid-cols-12 gap-4 px-6 py-3 border-b border-surface-100 bg-surface-50 rounded-t-xl">
            <div className="col-span-5 text-xs font-semibold text-surface-500 uppercase tracking-wide">Project</div>
            <div className="col-span-2 text-xs font-semibold text-surface-500 uppercase tracking-wide">Status</div>
            <div className="col-span-2 text-xs font-semibold text-surface-500 uppercase tracking-wide">Deadline</div>
            <div className="col-span-1 text-xs font-semibold text-surface-500 uppercase tracking-wide text-center">Ver.</div>
            <div className="col-span-2 text-xs font-semibold text-surface-500 uppercase tracking-wide text-right">Actions</div>
          </div>
          <div className="divide-y divide-surface-100">
            {projects.map((project) => {
              const activeVersion = project.versions[0];
              const deadlineStr = formatDeadline(project.deadline);
              const isOverdue = deadlineStr.includes("overdue");
              return (
                <div key={project.id} className="grid grid-cols-12 gap-4 items-center px-6 py-4 hover:bg-surface-50 transition-colors">
                  <div className="col-span-5 min-w-0">
                    <Link href={`/consultant/projects/${project.id}`} className="font-medium text-surface-900 hover:text-brand-600 transition-colors truncate block">
                      {project.title}
                    </Link>
                    <p className="text-xs text-surface-500 mt-0.5">
                      {project._count.milestones} milestone{project._count.milestones !== 1 ? "s" : ""} · {project._count.comments} comment{project._count.comments !== 1 ? "s" : ""} · {project._count.workRequests} request{project._count.workRequests !== 1 ? "s" : ""}
                    </p>
                  </div>
                  <div className="col-span-2">
                    <Badge variant={statusBadgeVariant(project.status) as "info" | "warning" | "success" | "default"} dot>
                      {statusLabel(project.status)}
                    </Badge>
                  </div>
                  <div className="col-span-2">
                    <p className="text-sm text-surface-700">{formatDate(project.deadline)}</p>
                    <p className={`text-xs mt-0.5 ${isOverdue ? "text-danger" : "text-surface-400"}`}>{deadlineStr}</p>
                  </div>
                  <div className="col-span-1 text-center">
                    <span className="text-sm font-mono text-surface-600">v{activeVersion?.versionNumber ?? 1}</span>
                  </div>
                  <div className="col-span-2 flex items-center justify-end gap-2">
                    <Link href={`/consultant/projects/${project.id}`}>
                      <Button variant="ghost" size="sm">View</Button>
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}
    </div>
  );
}
