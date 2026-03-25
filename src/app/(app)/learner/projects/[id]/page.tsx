// src/app/(app)/learner/projects/[id]/page.tsx
import { requireRole } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { notFound } from "next/navigation";
import { Metadata } from "next";
import Link from "next/link";
import {
  ChevronLeft, Calendar, Flag, Cpu,
  GitBranch, MessageSquare, User, Clock,
} from "lucide-react";
import { Card, CardHeader, CardTitle } from "@/modules/shared/components/Card";
import { Badge } from "@/modules/shared/components/Badge";
import { Avatar } from "@/modules/shared/components/Avatar";
import { RichTextViewer } from "@/modules/projects/components/RichTextViewer";
import { MilestoneList } from "@/modules/projects/components/MilestoneList";
import { ProjectStatusBadge } from "@/modules/projects/components/ProjectStatusBadge";
import { WorkRequestButton } from "@/modules/projects/components/WorkRequestButton";
import { formatDate, formatRelative } from "@/modules/shared/utils";
import { JsonValue } from "@prisma/client/runtime/library";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const project = await prisma.project.findUnique({
    where: { id },
    select: { title: true },
  });
  return { title: project?.title ?? "Project" };
}

export default async function LearnerProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: projectId } = await params;
  const session = await requireRole("LEARNER");

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      creator: { select: { id: true, name: true, email: true, avatar: true } },
      milestones: { orderBy: { order: "asc" } },
      phases: { orderBy: { phaseNumber: "asc" } },
      versions: { where: { isActive: true }, take: 1 },
      _count: { select: { workRequests: true, comments: true } },
    },
  });

  if (!project) notFound();
  if (project.status === "ARCHIVED") notFound();

  const [existingRequest, assignee] = await Promise.all([
    prisma.workRequest.findUnique({
      where: { projectId_learnerId: { projectId, learnerId: session.user.id } },
    }),
    prisma.projectAssignee.findUnique({
      where: { projectId_learnerId: { projectId, learnerId: session.user.id } },
    }),
  ]);

  const activeVersion = project.versions[0];
  const isAssigned = !!assignee;
  const requestStatus = (existingRequest?.status ?? null) as
    | "PENDING" | "APPROVED" | "REJECTED" | null;
  const canRequest = project.status === "OPEN";

  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-surface-500 mb-6">
        <Link
          href="/learner/projects"
          className="flex items-center gap-1 hover:text-surface-800 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          Browse Projects
        </Link>
        <span>/</span>
        <span className="text-surface-800 font-medium truncate max-w-xs">{project.title}</span>
      </div>

      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 flex-wrap mb-2">
          <ProjectStatusBadge status={project.status} />
          <span className="text-xs text-surface-400">
            Posted {formatRelative(project.createdAt)}
          </span>
        </div>
        <h1 className="text-2xl font-bold text-surface-900 leading-tight">{project.title}</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column */}
        <div className="lg:col-span-2 space-y-6">
          <Card padding="md">
            <CardHeader>
              <CardTitle>Project Description</CardTitle>
              {activeVersion && (
                <span className="text-xs text-surface-400">v{activeVersion.versionNumber}</span>
              )}
            </CardHeader>
            {activeVersion?.descriptionJson ? (
              <RichTextViewer content={activeVersion.descriptionJson as JsonValue} />
            ) : (
              <p className="text-sm text-surface-400 italic">No description provided.</p>
            )}
          </Card>

          {/* Comments placeholder */}
          <Card padding="md">
            <CardHeader>
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-surface-400" />
                <CardTitle>Comments</CardTitle>
                <Badge variant="default">{project._count.comments}</Badge>
              </div>
            </CardHeader>
            <p className="text-sm text-surface-400 italic">
              Comments will be available in Phase 7.
            </p>
          </Card>
        </div>

        {/* Right sidebar */}
        <div className="space-y-4">
          {/* Request button */}
          {(canRequest || isAssigned) && (
            <Card padding="md">
              <WorkRequestButton
                projectId={projectId}
                requestStatus={requestStatus}
                isAssigned={isAssigned}
              />
              {!existingRequest && !isAssigned && canRequest && (
                <p className="text-xs text-surface-400 text-center mt-3">
                  The consultant will review your request.
                </p>
              )}
            </Card>
          )}

          {/* Project info */}
          <Card padding="md">
            <CardTitle className="mb-4">Project Info</CardTitle>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <User className="w-4 h-4 text-surface-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs text-surface-500 mb-1">Consultant</p>
                  <div className="flex items-center gap-2">
                    <Avatar name={project.creator.name} src={project.creator.avatar} size="xs" />
                    <span className="text-sm font-medium text-surface-800">{project.creator.name}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Calendar className="w-4 h-4 text-surface-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs text-surface-500 mb-0.5">Deadline</p>
                  <p className="text-sm font-medium text-surface-800">{formatDate(project.deadline)}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <GitBranch className="w-4 h-4 text-surface-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs text-surface-500 mb-0.5">Phase</p>
                  <p className="text-sm font-medium text-surface-800">
                    Phase {project.currentPhase} of {project.phases.length}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Clock className="w-4 h-4 text-surface-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs text-surface-500 mb-0.5">Interested</p>
                  <p className="text-sm font-medium text-surface-800">
                    {project._count.workRequests} learner{project._count.workRequests !== 1 ? "s" : ""}
                  </p>
                </div>
              </div>
            </div>
          </Card>

          {/* Technologies */}
          {project.technologies.length > 0 && (
            <Card padding="md">
              <div className="flex items-center gap-2 mb-3">
                <Cpu className="w-4 h-4 text-surface-400" />
                <CardTitle>Technologies</CardTitle>
              </div>
              <div className="flex flex-wrap gap-2">
                {project.technologies.map((tech) => (
                  <span
                    key={tech}
                    className="px-2.5 py-1 bg-brand-50 text-brand-700 border border-brand-200 rounded-lg text-xs font-medium"
                  >
                    {tech}
                  </span>
                ))}
              </div>
            </Card>
          )}

          {/* Milestones */}
          {project.milestones.length > 0 && (
            <Card padding="md">
              <div className="flex items-center gap-2 mb-3">
                <Flag className="w-4 h-4 text-surface-400" />
                <CardTitle>Milestones</CardTitle>
                <Badge variant="default">{project.milestones.length}</Badge>
              </div>
              <MilestoneList milestones={project.milestones} />
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
