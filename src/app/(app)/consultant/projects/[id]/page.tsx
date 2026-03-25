// src/app/(app)/consultant/projects/[id]/page.tsx
import { requireRole } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { notFound } from "next/navigation";
import { Metadata } from "next";
import Link from "next/link";
import {
  ChevronLeft, Pencil, Calendar, Clock,
  Flag, Cpu, Users, GitBranch, MessageSquare, User,
} from "lucide-react";
import { Card, CardHeader, CardTitle } from "@/modules/shared/components/Card";
import { Button } from "@/modules/shared/components/Button";
import { Badge } from "@/modules/shared/components/Badge";
import { Avatar } from "@/modules/shared/components/Avatar";
import { RichTextViewer } from "@/modules/projects/components/RichTextViewer";
import { MilestoneList } from "@/modules/projects/components/MilestoneList";
import { ProjectStatusBadge } from "@/modules/projects/components/ProjectStatusBadge";
import { VersionApprovalBar } from "@/modules/projects/components/VersionApprovalBar";
import { formatDate, formatDateTime, formatRelative } from "@/modules/shared/utils";
import { diffProjectVersions } from "@/lib/diff";
import { JsonValue } from "@prisma/client/runtime/library";

// Always fetch fresh data — never serve stale cached version after approval
export const dynamic = "force-dynamic";

// ─── generateMetadata ────────────────────────────────────────────────────────

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

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function ConsultantProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: projectId } = await params;
  const session = await requireRole("CONSULTANT");

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      creator: { select: { id: true, name: true, email: true, avatar: true } },
      milestones: { orderBy: { order: "asc" } },
      phases: { orderBy: { phaseNumber: "asc" } },
      assignees: {
        include: {
          learner: { select: { id: true, name: true, email: true, avatar: true } },
        },
      },
      versions: {
        orderBy: { versionNumber: "desc" },
        include: {
          signoffs: {
            include: { user: { select: { id: true, name: true, role: true } } },
          },
        },
      },
      _count: { select: { workRequests: true, comments: true } },
    },
  });

  if (!project) notFound();
  if (project.creatorId !== session.user.id) notFound();

  const allVersions = [...project.versions].sort(
    (a, b) => b.versionNumber - a.versionNumber
  );

  // Active version: isActive = true → this is what the description panel shows
  const activeVersion = project.versions.find((v) => v.isActive);

  // Pending version: exists only before approval
  const pendingVersion = project.versions.find((v) => v.status === "PENDING");

  // ── Diff computation ──────────────────────────────────────────────────────
  // Only compute when both an active AND a pending version exist simultaneously.
  // After approval: pendingVersion is null → diff is null → approval bar hidden.
  // activeVersion.descriptionJson is the OLD content (still active).
  // pendingVersion.descriptionJson is the NEW proposed content.
  const diff = (() => {
    if (!pendingVersion || !activeVersion) return null;

    const oldSnap = activeVersion.metaSnapshot as {
      title: string;
      deadline: string;
      technologies: string[];
      milestones: Array<{ title: string; deadline: string }>;
    } | null;

    const newSnap = pendingVersion.metaSnapshot as {
      title: string;
      deadline: string;
      technologies: string[];
      milestones: Array<{ title: string; deadline: string }>;
    } | null;

    const oldMeta = {
      title: oldSnap?.title ?? project.title,
      deadline: oldSnap?.deadline ?? project.deadline,
      technologies: oldSnap?.technologies ?? project.technologies,
      milestones: oldSnap?.milestones ?? project.milestones,
    };
    const newMeta = {
      title: newSnap?.title ?? project.title,
      deadline: newSnap?.deadline ?? project.deadline,
      technologies: newSnap?.technologies ?? project.technologies,
      milestones: newSnap?.milestones ?? project.milestones,
    };

    return diffProjectVersions(
      {
        descriptionText: activeVersion.descriptionText,
        descriptionJson: activeVersion.descriptionJson as JsonValue,
      },
      {
        descriptionText: pendingVersion.descriptionText,
        descriptionJson: pendingVersion.descriptionJson as JsonValue,
      },
      oldMeta,
      newMeta
    );
  })();

  // ── Version status badge config ───────────────────────────────────────────
  const versionStatusConfig: Record<
    string,
    { variant: "success" | "warning" | "info" | "default"; label: string }
  > = {
    SELF_APPROVED: { variant: "success", label: "Approved" },
    APPROVED: { variant: "success", label: "Signed Off" },
    PENDING: { variant: "warning", label: "Pending Signoff" },
    DEFERRED: { variant: "default", label: "Deferred" },
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-surface-500 mb-6">
        <Link
          href="/consultant/projects"
          className="flex items-center gap-1 hover:text-surface-800 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          My Projects
        </Link>
        <span>/</span>
        <span className="text-surface-800 font-medium truncate max-w-xs">
          {project.title}
        </span>
      </div>

      {/* Page header */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <div className="min-w-0">
          <div className="flex items-center gap-3 flex-wrap mb-2">
            <ProjectStatusBadge status={project.status} />
            <span className="text-xs text-surface-400 font-mono">
              v{activeVersion?.versionNumber ?? 1}
              {pendingVersion && (
                <span className="ml-2 text-warning-dark font-sans">
                  (v{pendingVersion.versionNumber} pending)
                </span>
              )}
            </span>
            <span className="text-xs text-surface-400">
              Updated {formatRelative(project.updatedAt)}
            </span>
          </div>
          <h1 className="text-2xl font-bold text-surface-900 leading-tight">
            {project.title}
          </h1>
        </div>
        {project.status !== "DONE" && project.status !== "ARCHIVED" && (
          <Link
            href={`/consultant/projects/${project.id}/edit`}
            className="shrink-0"
          >
            <Button
              variant="outline"
              size="sm"
              leftIcon={<Pencil className="w-4 h-4" />}
            >
              Edit
            </Button>
          </Link>
        )}
      </div>

      {/* Approval bar — only shown when pending version exists */}
      {pendingVersion && diff && (
        <div className="mb-6">
          <VersionApprovalBar
            projectId={project.id}
            pendingVersionNumber={pendingVersion.versionNumber}
            pendingVersionId={pendingVersion.id}
            diff={diff}
            projectStatus={project.status}
          />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 ">
        {/* ── Center column: Description, Version History, Comments ── */}
        <div className="space-y-6 lg:col-span-3">
          {/* Description — always shows the ACTIVE (approved) version */}
          <Card padding="md">
            <CardHeader>
              <CardTitle>Description</CardTitle>
              {activeVersion && (
                <span className="text-xs text-surface-400">
                  Version {activeVersion.versionNumber} ·{" "}
                  {formatDateTime(activeVersion.submittedAt)}
                </span>
              )}
            </CardHeader>
            {activeVersion?.descriptionJson ? (
              <RichTextViewer
                content={
                  activeVersion.descriptionJson as JsonValue
                }
              />
            ) : (
              <p className="text-sm text-surface-400 italic">
                No description provided.
              </p>
            )}
          </Card>

          {/* ── Left column: Milestones and Phases ── */}
          <Card padding="md">
            <div className="flex items-center gap-2 mb-3">
              <Flag className="w-4 h-4 text-surface-400" />
              <CardTitle>Milestones</CardTitle>
              <Badge variant="default">{project.milestones.length}</Badge>
            </div>
            <MilestoneList
              milestones={project.milestones}
              showPhase={project.phases.length > 1}
            />
          </Card>

          {project.phases.length > 1 && (
            <Card padding="md">
              <div className="flex items-center gap-2 mb-3">
                <GitBranch className="w-4 h-4 text-surface-400" />
                <CardTitle>Phases</CardTitle>
              </div>
              <div className="space-y-2">
                {project.phases.map((phase) => (
                  <div key={phase.id} className="flex items-center gap-3">
                    <div
                      className={`w-2 h-2 rounded-full shrink-0 ${phase.status === "ACTIVE"
                        ? "bg-brand-500"
                        : phase.status === "COMPLETE"
                          ? "bg-success"
                          : "bg-surface-200"
                        }`}
                    />
                    <span className="text-sm text-surface-700 flex-1">
                      Phase {phase.phaseNumber}
                      {phase.title ? ` — ${phase.title}` : ""}
                    </span>
                    <span
                      className={`text-xs ${phase.status === "ACTIVE"
                        ? "text-brand-600 font-medium"
                        : phase.status === "COMPLETE"
                          ? "text-success"
                          : "text-surface-400"
                        }`}
                    >
                      {phase.status === "ACTIVE"
                        ? "Active"
                        : phase.status === "COMPLETE"
                          ? "Done"
                          : "Upcoming"}
                    </span>
                  </div>
                ))}
              </div>
            </Card>
          )}

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

        {/* ── Right sidebar ── */}
        <div className="space-y-4 lg:col-span-1">
          <Card padding="md">
            <CardTitle className="mb-4">Project Info</CardTitle>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <Calendar className="w-4 h-4 text-surface-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs text-surface-500 mb-0.5">Deadline</p>
                  <p className="text-sm font-medium text-surface-800">
                    {formatDate(project.deadline)}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <GitBranch className="w-4 h-4 text-surface-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs text-surface-500 mb-0.5">
                    Current Phase
                  </p>
                  <p className="text-sm font-medium text-surface-800">
                    Phase {project.currentPhase}
                    {project.phases.find(
                      (p) => p.phaseNumber === project.currentPhase
                    )?.title
                      ? ` — ${project.phases.find((p) => p.phaseNumber === project.currentPhase)?.title}`
                      : ""}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Clock className="w-4 h-4 text-surface-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs text-surface-500 mb-0.5">Created</p>
                  <p className="text-sm font-medium text-surface-800">
                    {formatDate(project.createdAt)}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Users className="w-4 h-4 text-surface-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs text-surface-500 mb-0.5">
                    Work Requests
                  </p>
                  <p className="text-sm font-medium text-surface-800">
                    {project._count.workRequests}
                  </p>
                </div>
              </div>
            </div>
          </Card>

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

          <Card padding="md">
            <div className="flex items-center gap-2 mb-3">
              <User className="w-4 h-4 text-surface-400" />
              <CardTitle>Assigned Learner</CardTitle>
            </div>
            {project.assignees.length === 0 ? (
              <p className="text-sm text-surface-400">
                No learner assigned yet.
                {project.status === "OPEN" && (
                  <span className="block mt-1 text-xs">
                    Learners can request to work on this project.
                  </span>
                )}
              </p>
            ) : (
              <div className="space-y-2">
                {project.assignees.map(({ learner }) => (
                  <div key={learner.id} className="flex items-center gap-3">
                    <Avatar
                      name={learner.name}
                      src={learner.avatar}
                      size="sm"
                    />
                    <div>
                      <p className="text-sm font-medium text-surface-800">
                        {learner.name}
                      </p>
                      <p className="text-xs text-surface-400">
                        {learner.email}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Version history */}
          {allVersions.length > 1 && (
            <Card padding="none">
              <div className="px-6 py-4 border-b border-surface-100">
                <div className="flex items-center gap-2">
                  <GitBranch className="w-4 h-4 text-surface-400" />
                  <CardTitle>Version History</CardTitle>
                  <Badge variant="default">{allVersions.length}</Badge>
                </div>
              </div>
              <div className="divide-y divide-surface-100">
                {allVersions.map((version) => {
                  const statusCfg =
                    versionStatusConfig[version.status] ??
                    versionStatusConfig.PENDING;
                  return (
                    <div
                      key={version.id}
                      className="flex items-center gap-4 px-6 py-3"
                    >
                      <span className="text-sm font-mono font-medium text-surface-700 w-8 shrink-0">
                        v{version.versionNumber}
                      </span>
                      <Badge variant={statusCfg.variant}>
                        {statusCfg.label}
                      </Badge>
                      {version.isActive && (
                        <Badge variant="info">Current</Badge>
                      )}
                      {/* <span className="text-xs text-surface-400">
                        Phase {version.phaseNumber}
                      </span>
                      <div className="flex-1" />
                      {version.signoffs.length > 0 && (
                        <div className="flex items-center gap-1">
                          {version.signoffs.map((s) => (
                            <Avatar
                              key={s.id}
                              name={s.user.name}
                              size="xs"
                              className="ring-2 ring-white"
                            />
                          ))}
                        </div>
                      )}
                      <span className="text-xs text-surface-400 shrink-0">
                        {formatRelative(version.submittedAt)}
                      </span> */}
                    </div>
                  );
                })}
              </div>
            </Card>
          )}

        </div>
      </div>
    </div>
  );
}