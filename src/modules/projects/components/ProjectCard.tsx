// src/modules/projects/components/ProjectCard.tsx
import Link from "next/link";
import { Calendar, Flag, ArrowRight } from "lucide-react";
import { Card } from "@/modules/shared/components/Card";
import { Badge } from "@/modules/shared/components/Badge";
import { Avatar } from "@/modules/shared/components/Avatar";
import { ProjectStatusBadge } from "./ProjectStatusBadge";
import { formatDate, formatDeadline, truncate } from "@/modules/shared/utils";

interface ProjectCardProps {
  project: {
    id: string;
    title: string;
    status: string;
    deadline: string;
    technologies: string[];
    creator: { id: string; name: string; avatar?: string | null };
    activeVersion: { descriptionText: string } | null;
    _count: { milestones: number; workRequests: number };
  };
  href: string;
  requestStatus?: "PENDING" | "APPROVED" | "REJECTED" | null;
  isAssigned?: boolean;
}

export function ProjectCard({ project, href, requestStatus, isAssigned }: ProjectCardProps) {
  const deadlineStr = formatDeadline(project.deadline);
  const isOverdue = deadlineStr.includes("overdue");

  return (
    <Link href={href} className="block group">
      <Card
        padding="md"
        hover
        className="h-full flex flex-col transition-all duration-200 group-hover:border-brand-200"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <ProjectStatusBadge status={project.status} />
          <div className="flex items-center gap-2 shrink-0">
            {isAssigned && <Badge variant="success" dot>Assigned</Badge>}
            {!isAssigned && requestStatus === "PENDING" && <Badge variant="warning" dot>Requested</Badge>}
            {!isAssigned && requestStatus === "REJECTED" && <Badge variant="danger">Rejected</Badge>}
          </div>
        </div>

        {/* Title */}
        <h3 className="font-semibold text-surface-900 mb-2 group-hover:text-brand-600 transition-colors leading-snug">
          {project.title}
        </h3>

        {/* Description snippet */}
        {project.activeVersion?.descriptionText && (
          <p className="text-sm text-surface-500 mb-4 flex-1 leading-relaxed">
            {truncate(project.activeVersion.descriptionText, 140)}
          </p>
        )}

        {/* Technologies */}
        {project.technologies.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-4">
            {project.technologies.slice(0, 4).map((tech) => (
              <span
                key={tech}
                className="px-2 py-0.5 bg-brand-50 text-brand-600 border border-brand-100 rounded-md text-xs font-medium"
              >
                {tech}
              </span>
            ))}
            {project.technologies.length > 4 && (
              <span className="px-2 py-0.5 bg-surface-100 text-surface-500 rounded-md text-xs">
                +{project.technologies.length - 4}
              </span>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-surface-100 mt-auto">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <Avatar name={project.creator.name} src={project.creator.avatar} size="xs" />
              <span className="text-xs text-surface-500">{project.creator.name}</span>
            </div>
            <div className="flex items-center gap-1 text-xs text-surface-400">
              <Flag className="w-3 h-3" />
              <span>{project._count.milestones}</span>
            </div>
          </div>
          <div className={`flex items-center gap-1 text-xs ${isOverdue ? "text-danger" : "text-surface-400"}`}>
            <Calendar className="w-3 h-3" />
            <span>{formatDate(project.deadline)}</span>
          </div>
        </div>

        <div className="flex items-center justify-end mt-3">
          <span className="text-xs font-medium text-brand-500 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            View details <ArrowRight className="w-3 h-3" />
          </span>
        </div>
      </Card>
    </Link>
  );
}
