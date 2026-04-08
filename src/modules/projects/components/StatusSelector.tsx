// src/modules/projects/components/StatusSelector.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, RotateCcw } from "lucide-react";
import { Button } from "@/modules/shared/components/Button";

const ACTIVE_STATUSES = [
  { value: "OPEN",        label: "Open" },
  { value: "IN_PROGRESS", label: "In Progress" },
  { value: "ON_HOLD",     label: "On Hold" },
] as const;

interface StatusSelectorProps {
  projectId: string;
  currentStatus: string;
}

export function StatusSelector({ projectId, currentStatus }: StatusSelectorProps) {
  const router = useRouter();
  const [selected, setSelected] = useState(
    currentStatus === "DONE" ? "IN_PROGRESS" : currentStatus
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [doneModalOpen, setDoneModalOpen] = useState(false);
  const [reopenModalOpen, setReopenModalOpen] = useState(false);
  const [reopenReason, setReopenReason] = useState("");

  const isDirty = selected !== currentStatus;

  async function patchStatus(status: string, reason?: string) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, ...(reason ? { reason } : {}) }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Failed to update status");
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  // DONE state: show completion badge + reopen flow
  if (currentStatus === "DONE") {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-sm font-medium text-success-dark">
          <CheckCircle2 className="w-4 h-4" />
          Project Complete
        </div>

        <Button
          size="sm"
          variant="outline"
          className="w-full"
          leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
          onClick={() => { setError(null); setReopenModalOpen(true); }}
          disabled={loading}
        >
          Reopen Project
        </Button>

        {error && <p className="text-xs text-danger">{error}</p>}

        {reopenModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div
              className="absolute inset-0 bg-black/40"
              onClick={() => { if (!loading) { setReopenModalOpen(false); setReopenReason(""); } }}
            />
            <div className="relative bg-white rounded-xl shadow-xl p-6 w-full max-w-md mx-4 space-y-4">
              <h2 className="text-base font-semibold text-surface-900">Reopen this project?</h2>
              <p className="text-sm text-surface-500">
                The project will move back to{" "}
                <span className="font-medium text-surface-800">In Progress</span>. A note will
                be posted in the comments so the learner is informed.
              </p>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-surface-700">
                  Reason <span className="text-danger">*</span>
                </label>
                <textarea
                  rows={3}
                  value={reopenReason}
                  onChange={(e) => setReopenReason(e.target.value)}
                  placeholder="e.g. Follow-up work required on phase 2 deliverable"
                  className="w-full rounded-lg border border-surface-200 px-3 py-2 text-sm text-surface-900 placeholder:text-surface-400 focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
                  disabled={loading}
                />
              </div>
              {error && <p className="text-xs text-danger">{error}</p>}
              <div className="flex gap-3 justify-end">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => { setReopenModalOpen(false); setReopenReason(""); }}
                  disabled={loading}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  variant="primary"
                  disabled={!reopenReason.trim() || loading}
                  isLoading={loading}
                  onClick={async () => {
                    await patchStatus("IN_PROGRESS", reopenReason.trim());
                    setReopenModalOpen(false);
                    setReopenReason("");
                  }}
                >
                  Reopen
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Normal state: dropdown for OPEN/IN_PROGRESS/ON_HOLD + separate Mark as Complete
  return (
    <div className="space-y-2">
      <select
        value={selected}
        onChange={(e) => setSelected(e.target.value)}
        disabled={loading}
        className="w-full h-9 px-3 rounded-lg border border-surface-200 text-sm text-surface-900 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500 disabled:bg-surface-50 disabled:text-surface-400"
      >
        {ACTIVE_STATUSES.map((s) => (
          <option key={s.value} value={s.value}>{s.label}</option>
        ))}
      </select>

      {isDirty && (
        <Button
          size="sm"
          variant="outline"
          className="w-full"
          isLoading={loading}
          onClick={() => patchStatus(selected)}
        >
          Save Status
        </Button>
      )}

      <div className="pt-2 border-t border-surface-100">
        <Button
          size="sm"
          variant="primary"
          className="w-full"
          leftIcon={<CheckCircle2 className="w-3.5 h-3.5" />}
          onClick={() => { setError(null); setDoneModalOpen(true); }}
          disabled={loading}
        >
          Mark as Complete
        </Button>
      </div>

      {error && <p className="text-xs text-danger">{error}</p>}

      {doneModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => { if (!loading) setDoneModalOpen(false); }}
          />
          <div className="relative bg-white rounded-xl shadow-xl p-6 w-full max-w-md mx-4 space-y-4">
            <h2 className="text-base font-semibold text-surface-900">Mark project as complete?</h2>
            <p className="text-sm text-surface-500">
              This marks the project as{" "}
              <span className="font-medium text-surface-800">Done</span>. The learner will be
              notified. You can still reopen it later if needed.
            </p>
            {error && <p className="text-xs text-danger">{error}</p>}
            <div className="flex gap-3 justify-end">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setDoneModalOpen(false)}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                variant="primary"
                isLoading={loading}
                onClick={async () => {
                  await patchStatus("DONE");
                  setDoneModalOpen(false);
                }}
              >
                Mark Complete
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
