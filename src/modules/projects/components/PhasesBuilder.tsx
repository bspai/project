// src/modules/projects/components/PhasesBuilder.tsx
"use client";

import { useCallback } from "react";
import { Plus, Trash2, GripVertical, GitBranch } from "lucide-react";
import { v4 as uuidv4 } from "uuid";
import { cn } from "@/modules/shared/utils";
import { Button } from "@/modules/shared/components/Button";
import type { PhaseInput } from "../types";

interface PhasesBuilderProps {
  value: PhaseInput[];
  onChange: (phases: PhaseInput[]) => void;
  error?: string;
}

export function PhasesBuilder({ value, onChange, error }: PhasesBuilderProps) {
  const addPhase = useCallback(() => {
    onChange([
      ...value,
      { id: uuidv4(), title: "" },
    ]);
  }, [value, onChange]);

  const removePhase = useCallback(
    (id: string) => {
      if (value.length <= 1) return;
      onChange(value.filter((p) => p.id !== id));
    },
    [value, onChange]
  );

  const updatePhase = useCallback(
    (id: string, title: string) => {
      onChange(value.map((p) => (p.id === id ? { ...p, title } : p)));
    },
    [value, onChange]
  );

  return (
    <div className="space-y-3">
      {value.length === 0 ? (
        <div className="border border-dashed border-surface-200 rounded-xl py-8 text-center">
          <GitBranch className="w-8 h-8 text-surface-300 mx-auto mb-2" />
          <p className="text-sm text-surface-500">No phases defined</p>
          <p className="text-xs text-surface-400 mt-0.5">
            A single default phase will be created automatically
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {value.map((phase, index) => (
            <div
              key={phase.id}
              className={cn(
                "flex items-center gap-3 p-3 rounded-xl border bg-white",
                "border-surface-200 hover:border-surface-300 transition-colors"
              )}
            >
              <div className="text-surface-300 cursor-grab shrink-0">
                <GripVertical className="w-4 h-4" />
              </div>

              <div className="w-6 h-6 rounded-full bg-brand-100 text-brand-700 text-xs font-semibold flex items-center justify-center shrink-0">
                {index + 1}
              </div>

              <input
                type="text"
                placeholder={`Phase ${index + 1} title (e.g. Planning, Development…)`}
                value={phase.title}
                onChange={(e) => updatePhase(phase.id, e.target.value)}
                className={cn(
                  "flex-1 h-9 px-3 rounded-lg border text-sm bg-surface-50",
                  "focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent",
                  "placeholder:text-surface-400 text-surface-900",
                  !phase.title ? "border-surface-200" : "border-surface-300"
                )}
              />

              <button
                type="button"
                onClick={() => removePhase(phase.id)}
                disabled={value.length <= 1}
                className={cn(
                  "w-7 h-7 flex items-center justify-center rounded-lg transition-colors shrink-0",
                  value.length <= 1
                    ? "text-surface-200 cursor-not-allowed"
                    : "text-surface-400 hover:text-danger hover:bg-danger/10"
                )}
                title={value.length <= 1 ? "At least one phase is required" : "Remove phase"}
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
        onClick={addPhase}
      >
        Add Phase
      </Button>

      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  );
}
