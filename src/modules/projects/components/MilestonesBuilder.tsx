// src/modules/projects/components/MilestonesBuilder.tsx
"use client";

import { useCallback } from "react";
import { Plus, Trash2, GripVertical, Flag } from "lucide-react";
import { v4 as uuidv4 } from "uuid";
import { cn } from "@/modules/shared/utils";
import { Button } from "@/modules/shared/components/Button";
import type { MilestoneInput, PhaseInput } from "../types";

interface MilestonesBuilderProps {
  value: MilestoneInput[];
  onChange: (milestones: MilestoneInput[]) => void;
  projectDeadline?: string; // ISO string — milestones can't exceed this
  phases?: PhaseInput[];
  error?: string;
}

export function MilestonesBuilder({
  value,
  onChange,
  projectDeadline,
  phases = [],
  error,
}: MilestonesBuilderProps) {
  const hasPhases = phases.length > 0;
  const addMilestone = useCallback(() => {
    onChange([
      ...value,
      {
        id: uuidv4(),
        title: "",
        deadline: "",
        phaseNumber: 1,
      },
    ]);
  }, [value, onChange]);

  const removeMilestone = useCallback(
    (id: string) => {
      onChange(value.filter((m) => m.id !== id));
    },
    [value, onChange]
  );

  const updateMilestone = useCallback(
    (id: string, field: keyof MilestoneInput, val: string | number) => {
      onChange(
        value.map((m) => (m.id === id ? { ...m, [field]: val } : m))
      );
    },
    [value, onChange]
  );

  return (
    <div className="space-y-3">
      {value.length === 0 ? (
        <div className="border border-dashed border-surface-200 rounded-xl py-8 text-center">
          <Flag className="w-8 h-8 text-surface-300 mx-auto mb-2" />
          <p className="text-sm text-surface-500">No milestones yet</p>
          <p className="text-xs text-surface-400 mt-0.5">
            Add milestones to break the project into trackable goals
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {value.map((milestone, index) => (
            <div
              key={milestone.id}
              className={cn(
                "flex items-start gap-3 p-3 rounded-xl border bg-white",
                "border-surface-200 hover:border-surface-300 transition-colors"
              )}
            >
              {/* Drag handle (visual only in Phase 1) */}
              <div className="mt-2.5 text-surface-300 cursor-grab shrink-0">
                <GripVertical className="w-4 h-4" />
              </div>

              {/* Index badge */}
              <div className="mt-2 w-6 h-6 rounded-full bg-brand-100 text-brand-700 text-xs font-semibold flex items-center justify-center shrink-0">
                {index + 1}
              </div>

              {/* Fields */}
              <div className={cn(
                "flex-1 grid grid-cols-1 gap-2",
                hasPhases ? "sm:grid-cols-4" : "sm:grid-cols-3"
              )}>
                {/* Title */}
                <div className="sm:col-span-2">
                  <input
                    type="text"
                    placeholder="Milestone title…"
                    value={milestone.title}
                    onChange={(e) =>
                      updateMilestone(milestone.id, "title", e.target.value)
                    }
                    className={cn(
                      "w-full h-9 px-3 rounded-lg border text-sm bg-surface-50",
                      "focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent",
                      "placeholder:text-surface-400 text-surface-900",
                      !milestone.title
                        ? "border-surface-200"
                        : "border-surface-300"
                    )}
                  />
                </div>

                {/* Deadline */}
                <div>
                  <input
                    type="date"
                    value={milestone.deadline}
                    max={projectDeadline?.slice(0, 10)}
                    onChange={(e) =>
                      updateMilestone(milestone.id, "deadline", e.target.value)
                    }
                    className={cn(
                      "w-full h-9 px-3 rounded-lg border text-sm bg-surface-50",
                      "focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent",
                      "text-surface-900",
                      !milestone.deadline
                        ? "border-surface-200"
                        : "border-surface-300"
                    )}
                  />
                </div>

                {/* Phase selector */}
                {hasPhases && (
                  <div>
                    <select
                      value={milestone.phaseNumber}
                      onChange={(e) =>
                        updateMilestone(milestone.id, "phaseNumber", Number(e.target.value))
                      }
                      className={cn(
                        "w-full h-9 px-3 rounded-lg border text-sm bg-surface-50",
                        "focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent",
                        "text-surface-900 border-surface-200"
                      )}
                    >
                      {phases.map((phase, i) => (
                        <option key={phase.id} value={i + 1}>
                          Phase {i + 1}{phase.title ? ` — ${phase.title}` : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* Remove */}
              <button
                type="button"
                onClick={() => removeMilestone(milestone.id)}
                className="mt-2 w-7 h-7 flex items-center justify-center rounded-lg text-surface-400 hover:text-danger hover:bg-danger/10 transition-colors shrink-0"
                title="Remove milestone"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      <Button
        type="button"
        variant="outline"
        size="sm"
        leftIcon={<Plus className="w-4 h-4" />}
        onClick={addMilestone}
      >
        Add Milestone
      </Button>

      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  );
}
