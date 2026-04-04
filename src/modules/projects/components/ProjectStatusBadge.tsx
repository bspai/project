// src/modules/projects/components/ProjectStatusBadge.tsx
import { Badge } from "@/modules/shared/components/Badge";

interface ProjectStatusBadgeProps {
  status: string;
  size?: "sm" | "md";
}

const config: Record<string, { variant: "info" | "warning" | "success" | "default"; label: string }> = {
  OPEN:        { variant: "info",    label: "Open" },
  IN_PROGRESS: { variant: "warning", label: "In Progress" },
  ON_HOLD:     { variant: "default", label: "On Hold" },
  DONE:        { variant: "success", label: "Done" },
  ARCHIVED:    { variant: "default", label: "Archived" },
};

export function ProjectStatusBadge({ status }: ProjectStatusBadgeProps) {
  const { variant, label } = config[status] ?? config.ARCHIVED;
  return <Badge variant={variant} dot>{label}</Badge>;
}
