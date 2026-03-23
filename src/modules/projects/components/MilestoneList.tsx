// src/modules/projects/components/MilestoneList.tsx
import { CheckCircle2, Circle, Flag, AlertCircle } from "lucide-react";
import { formatDate, formatDeadline } from "@/modules/shared/utils";
import { cn } from "@/modules/shared/utils";

interface Milestone {
  id: string;
  title: string;
  deadline: Date | string;
  isComplete: boolean;
  order: number;
  phaseNumber: number;
}

interface MilestoneListProps {
  milestones: Milestone[];
  showPhase?: boolean;
}

export function MilestoneList({ milestones, showPhase = false }: MilestoneListProps) {
  if (milestones.length === 0) {
    return (
      <div className="flex items-center gap-2 py-4 text-surface-400">
        <Flag className="w-4 h-4" />
        <span className="text-sm">No milestones defined</span>
      </div>
    );
  }

  const sorted = [...milestones].sort((a, b) => a.order - b.order);
  const completed = sorted.filter((m) => m.isComplete).length;

  return (
    <div className="space-y-1">
      {/* Progress bar */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs text-surface-500">
          {completed} of {sorted.length} complete
        </span>
        <span className="text-xs font-medium text-surface-700">
          {Math.round((completed / sorted.length) * 100)}%
        </span>
      </div>
      <div className="h-1.5 bg-surface-100 rounded-full overflow-hidden mb-4">
        <div
          className="h-full bg-brand-500 rounded-full transition-all duration-500"
          style={{ width: `${(completed / sorted.length) * 100}%` }}
        />
      </div>

      {/* Milestone rows */}
      {sorted.map((milestone, index) => {
        const deadlineStr = formatDeadline(milestone.deadline);
        const isOverdue = !milestone.isComplete && deadlineStr.includes("overdue");
        const isDueSoon =
          !milestone.isComplete &&
          !isOverdue &&
          deadlineStr.includes("d remaining") &&
          parseInt(deadlineStr) <= 7;

        return (
          <div
            key={milestone.id}
            className={cn(
              "flex items-start gap-3 px-3 py-2.5 rounded-lg",
              milestone.isComplete
                ? "bg-success/5"
                : isOverdue
                ? "bg-danger/5"
                : "hover:bg-surface-50"
            )}
          >
            {/* Icon */}
            <div className="mt-0.5 shrink-0">
              {milestone.isComplete ? (
                <CheckCircle2 className="w-4 h-4 text-success" />
              ) : isOverdue ? (
                <AlertCircle className="w-4 h-4 text-danger" />
              ) : (
                <Circle className="w-4 h-4 text-surface-300" />
              )}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    "text-sm font-medium",
                    milestone.isComplete
                      ? "line-through text-surface-400"
                      : "text-surface-800"
                  )}
                >
                  {milestone.title}
                </span>
                {showPhase && (
                  <span className="text-xs text-surface-400 bg-surface-100 px-1.5 py-0.5 rounded">
                    Phase {milestone.phaseNumber}
                  </span>
                )}
              </div>
              <p
                className={cn(
                  "text-xs mt-0.5",
                  isOverdue
                    ? "text-danger"
                    : isDueSoon
                    ? "text-warning-dark"
                    : "text-surface-400"
                )}
              >
                {formatDate(milestone.deadline)} · {deadlineStr}
              </p>
            </div>

            {/* Step number */}
            <span className="text-xs text-surface-300 mt-0.5 shrink-0">
              {index + 1}
            </span>
          </div>
        );
      })}
    </div>
  );
}
