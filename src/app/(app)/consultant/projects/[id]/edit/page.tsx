// src/app/(app)/consultant/projects/[id]/edit/page.tsx
import { requireRole } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { notFound, redirect } from "next/navigation";
import { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft, AlertTriangle } from "lucide-react";
import { ProjectEditForm } from "@/modules/projects/components/ProjectEditForm";
import { JsonValue } from "@prisma/client/runtime/library";

export async function generateMetadata({
  params,
}: {
  params: { id: string };
}): Promise<Metadata> {
  const project = await prisma.project.findUnique({
    where: { id: params.id },
    select: { title: true },
  });
  return { title: `Edit — ${project?.title ?? "Project"}` };
}

export default async function EditProjectPage({
  params,
}: {
  params: { id: string };
}) {
  const session = await requireRole("CONSULTANT");

  const project = await prisma.project.findUnique({
    where: { id: params.id },
    include: {
      milestones: { orderBy: { order: "asc" } },
      versions: {
        where: { isActive: true },
        take: 1,
      },
    },
  });

  if (!project) notFound();
  if (project.creatorId !== session.user.id) notFound();

  // Don't allow editing completed/archived projects
  if (project.status === "DONE" || project.status === "ARCHIVED") {
    redirect(`/consultant/projects/${params.id}`);
  }

  // Check for a pending version — warn the user
  const pendingVersion = await prisma.projectVersion.findFirst({
    where: { projectId: params.id, status: "PENDING" },
  });

  const activeVersion = project.versions[0];

  const defaultValues = {
    title: project.title,
    deadline: project.deadline.toISOString().slice(0, 10),
    technologies: project.technologies,
    milestones: project.milestones.map((m) => ({
      id: m.id,
      title: m.title,
      deadline: m.deadline.toISOString().slice(0, 10),
      phaseNumber: m.phaseNumber,
    })),
    descriptionJson:
      (activeVersion?.descriptionJson as JsonValue) ?? {},
    descriptionText: activeVersion?.descriptionText ?? "",
  };

  return (
    <div className="p-6 lg:p-8 max-w-3xl mx-auto">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-surface-500 mb-6">
        <Link
          href={`/consultant/projects/${params.id}`}
          className="flex items-center gap-1 hover:text-surface-800 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          {project.title}
        </Link>
        <span>/</span>
        <span className="text-surface-800 font-medium">Edit</span>
      </div>

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-surface-900">Edit Project</h1>
        <p className="text-surface-500 text-sm mt-1">
          Submitting changes will create a new version.
          {project.status === "OPEN"
            ? " You can approve the changes yourself since the project is still open."
            : " Changes will need to be signed off by both you and the assigned learner."}
        </p>
      </div>

      {/* Pending version warning */}
      {pendingVersion && (
        <div className="flex items-start gap-3 bg-warning/10 border border-warning/30 rounded-xl px-4 py-3 mb-6">
          <AlertTriangle className="w-4 h-4 text-warning-dark mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-medium text-warning-dark">
              Version {pendingVersion.versionNumber} is awaiting approval
            </p>
            <p className="text-xs text-surface-600 mt-0.5">
              You must approve or the pending version must be resolved before
              submitting new changes.
            </p>
          </div>
        </div>
      )}

      <ProjectEditForm
        projectId={params.id}
        defaultValues={defaultValues}
        projectStatus={project.status}
        hasPendingVersion={!!pendingVersion}
      />
    </div>
  );
}
