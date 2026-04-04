// src/modules/projects/components/MilestoneList.tsx
"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Circle, Flag, AlertCircle, Loader2 } from "lucide-react";
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
  projectId?: string;
  canToggle?: boolean;
}

export function MilestoneList({
  milestones,
  showPhase = false,
  projectId,
  canToggle = false,
}: MilestoneListProps) {
  const router = useRouter();
  const [states, setStates] = useState<Record<string, boolean>>(
    () => Object.fromEntries(milestones.map((m) => [m.id, m.isComplete]))
  );
  const [loading, setLoading] = useState<Record<string, boolean>>({});

  const toggle = useCallback(
    async (id: string) => {
      if (!canToggle || !projectId || loading[id]) return;

      const prev = states[id];
      setStates((s) => ({ ...s, [id]: !prev }));
      setLoading((l) => ({ ...l, [id]: true }));

      try {
        const res = await fetch(
          `/api/projects/${projectId}/milestones/${id}`,
          { method: "PATCH" }
        );

        if (!res.ok) {
          setStates((s) => ({ ...s, [id]: prev }));
          return;
        }

        const data = await res.json();
        if (data.phaseAdvanced || data.phaseReverted) {
          router.refresh();
        }
      } catch {
        setStates((s) => ({ ...s, [id]: prev }));
      } finally {
        setLoading((l) => ({ ...l, [id]: false }));
      }
    },
    [canToggle, projectId, states, loading, router]
  );

  if (milestones.length === 0) {
    return (
      <div className="flex items-center gap-2 py-4 text-surface-400">
        <Flag className="w-4 h-4" />
        <span className="text-sm">No milestones defined</span>
      </div>
    );
  }

  const sorted = [...milestones].sort((a, b) => a.order - b.order);
  const completed = sorted.filter((m) => states[m.id]).length;

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
        const isComplete = states[milestone.id];
        const isLoading = loading[milestone.id];
        const deadlineStr = formatDeadline(milestone.deadline);
        const isOverdue = !isComplete && deadlineStr.includes("overdue");
        const isDueSoon =
          !isComplete &&
          !isOverdue &&
          deadlineStr.includes("d remaining") &&
          parseInt(deadlineStr) <= 7;

        return (
          <div
            key={milestone.id}
            onClick={() => toggle(milestone.id)}
            className={cn(
              "flex items-start gap-3 px-3 py-2.5 rounded-lg transition-colors",
              isComplete
                ? "bg-success/5"
                : isOverdue
                ? "bg-danger/5"
                : "hover:bg-surface-50",
              canToggle && "cursor-pointer select-none"
            )}
          >
            {/* Icon */}
            <div className="mt-0.5 shrink-0">
              {isLoading ? (
                <Loader2 className="w-4 h-4 text-surface-400 animate-spin" />
              ) : isComplete ? (
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
                    isComplete ? "line-through text-surface-400" : "text-surface-800"
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
