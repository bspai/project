// src/modules/projects/components/StatusSelector.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Button } from "@/modules/shared/components/Button";

const STATUSES = [
  { value: "OPEN",        label: "Open" },
  { value: "IN_PROGRESS", label: "In Progress" },
  { value: "ON_HOLD",     label: "On Hold" },
  { value: "DONE",        label: "Done" },
] as const;

interface StatusSelectorProps {
  projectId: string;
  currentStatus: string;
}

export function StatusSelector({ projectId, currentStatus }: StatusSelectorProps) {
  const router = useRouter();
  const [selected, setSelected] = useState(currentStatus);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isDirty = selected !== currentStatus;

  async function handleSave() {
    if (!isDirty || loading) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: selected }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Failed to update status");
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setSelected(currentStatus);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-2">
      <select
        value={selected}
        onChange={(e) => setSelected(e.target.value)}
        disabled={loading}
        className="w-full h-9 px-3 rounded-lg border border-surface-200 text-sm text-surface-900 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500 disabled:bg-surface-50 disabled:text-surface-400"
      >
        {STATUSES.map((s) => (
          <option key={s.value} value={s.value}>{s.label}</option>
        ))}
      </select>

      {isDirty && (
        <Button
          size="sm"
          variant="primary"
          className="w-full"
          isLoading={loading}
          leftIcon={loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : undefined}
          onClick={handleSave}
        >
          Save Status
        </Button>
      )}

      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  );
}
