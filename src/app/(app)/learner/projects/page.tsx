// src/app/(app)/learner/projects/page.tsx
import { requireRole } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { Metadata } from "next";
import { ProjectBrowseClient } from "@/modules/projects/components/ProjectBrowseClient";

export const metadata: Metadata = { title: "Browse Projects" };

export default async function LearnerProjectsPage() {
  const session = await requireRole("LEARNER");

  const [projects, requests, assignments] = await Promise.all([
    prisma.project.findMany({
      where: { status: "OPEN" },
      orderBy: { createdAt: "desc" },
      include: {
        creator: { select: { id: true, name: true, avatar: true } },
        versions: {
          where: { isActive: true },
          select: { descriptionText: true },
          take: 1,
        },
        _count: { select: { milestones: true, workRequests: true } },
      },
    }),
    prisma.workRequest.findMany({
      where: { learnerId: session.user.id },
      select: { projectId: true, status: true },
    }),
    prisma.projectAssignee.findMany({
      where: { learnerId: session.user.id },
      select: { projectId: true },
    }),
  ]);

  const requestMap = Object.fromEntries(
    requests.map((r) => [r.projectId, r.status as "PENDING" | "APPROVED" | "REJECTED"])
  );
  const assignedIds = assignments.map((a) => a.projectId);

  const serialized = projects.map((p) => ({
    id: p.id,
    title: p.title,
    status: p.status,
    deadline: p.deadline.toISOString(),
    technologies: p.technologies,
    creator: p.creator,
    activeVersion: p.versions[0] ? { descriptionText: p.versions[0].descriptionText } : null,
    _count: p._count,
  }));

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-surface-900">Browse Projects</h1>
        <p className="text-surface-500 text-sm mt-0.5">
          Find a project to work on and request to join.
        </p>
      </div>
      <ProjectBrowseClient
        projects={serialized}
        requestMap={requestMap}
        assignedIds={assignedIds}
      />
    </div>
  );
}