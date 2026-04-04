// src/modules/projects/components/MilestoneManager.tsx
"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2, Circle, AlertCircle, Loader2,
  Plus, Pencil, Trash2, Check, X, Flag,
} from "lucide-react";
import { formatDate, formatDeadline, cn } from "@/modules/shared/utils";

interface Milestone {
  id: string;
  title: string;
  deadline: Date | string;
  isComplete: boolean;
  order: number;
  phaseNumber: number;
}

interface Phase {
  phaseNumber: number;
  title: string | null;
}

interface MilestoneManagerProps {
  projectId: string;
  milestones: Milestone[];
  phases: Phase[];
  currentPhase: number;
  canToggle?: boolean;
  canManage?: boolean;
  showPhase?: boolean;
}

interface AddForm {
  title: string;
  deadline: string;
  phaseNumber: number;
}

interface EditForm {
  title: string;
  deadline: string;
  phaseNumber: number;
}

export function MilestoneManager({
  projectId,
  milestones: initialMilestones,
  phases,
  currentPhase,
  canToggle = false,
  canManage = false,
  showPhase = false,
}: MilestoneManagerProps) {
  const router = useRouter();
  const [milestones, setMilestones] = useState<Milestone[]>(initialMilestones);
  const [toggleLoading, setToggleLoading] = useState<Record<string, boolean>>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<EditForm>({ title: "", deadline: "", phaseNumber: 1 });
  const [editLoading, setEditLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [addForm, setAddForm] = useState<AddForm>({ title: "", deadline: "", phaseNumber: currentPhase });
  const [addLoading, setAddLoading] = useState(false);

  const sorted = [...milestones].sort((a, b) => a.order - b.order);
  const completed = sorted.filter((m) => m.isComplete).length;

  const startEdit = useCallback((m: Milestone) => {
    setEditingId(m.id);
    setEditForm({
      title: m.title,
      deadline: new Date(m.deadline).toISOString().slice(0, 10),
      phaseNumber: m.phaseNumber,
    });
  }, []);

  const cancelEdit = useCallback(() => {
    setEditingId(null);
  }, []);

  const toggle = useCallback(async (id: string) => {
    if (!canToggle || toggleLoading[id]) return;
    const prev = milestones.find((m) => m.id === id)?.isComplete ?? false;
    setMilestones((ms) => ms.map((m) => m.id === id ? { ...m, isComplete: !prev } : m));
    setToggleLoading((l) => ({ ...l, [id]: true }));
    try {
      const res = await fetch(`/api/projects/${projectId}/milestones/${id}`, { method: "PATCH" });
      if (!res.ok) {
        setMilestones((ms) => ms.map((m) => m.id === id ? { ...m, isComplete: prev } : m));
        return;
      }
      const data = await res.json();
      if (data.phaseAdvanced || data.phaseReverted) router.refresh();
    } catch {
      setMilestones((ms) => ms.map((m) => m.id === id ? { ...m, isComplete: prev } : m));
    } finally {
      setToggleLoading((l) => ({ ...l, [id]: false }));
    }
  }, [canToggle, toggleLoading, milestones, projectId, router]);

  const saveEdit = useCallback(async () => {
    if (!editingId || editLoading) return;
    setEditLoading(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/milestones/${editingId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      });
      if (!res.ok) return;
      const updated = await res.json();
      setMilestones((ms) => ms.map((m) => m.id === editingId ? { ...m, ...updated } : m));
      setEditingId(null);
    } finally {
      setEditLoading(false);
    }
  }, [editingId, editLoading, editForm, projectId]);

  const deleteMilestone = useCallback(async (id: string) => {
    setDeletingId(id);
    try {
      const res = await fetch(`/api/projects/${projectId}/milestones/${id}`, { method: "DELETE" });
      if (!res.ok) return;
      setMilestones((ms) => ms.filter((m) => m.id !== id));
    } finally {
      setDeletingId(null);
    }
  }, [projectId]);

  const saveAdd = useCallback(async () => {
    if (addLoading || !addForm.title || !addForm.deadline) return;
    setAddLoading(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/milestones`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(addForm),
      });
      if (!res.ok) return;
      const created = await res.json();
      setMilestones((ms) => [...ms, created]);
      setAdding(false);
      setAddForm({ title: "", deadline: "", phaseNumber: currentPhase });
    } finally {
      setAddLoading(false);
    }
  }, [addLoading, addForm, projectId, currentPhase]);

  return (
    <div className="space-y-3">
      {/* Progress bar */}
      {sorted.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs text-surface-500">{completed} of {sorted.length} complete</span>
            <span className="text-xs font-medium text-surface-700">
              {Math.round((completed / sorted.length) * 100)}%
            </span>
          </div>
          <div className="h-1.5 bg-surface-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-brand-500 rounded-full transition-all duration-500"
              style={{ width: `${(completed / sorted.length) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* Milestone rows */}
      {sorted.length === 0 && !adding && (
        <div className="flex items-center gap-2 py-4 text-surface-400">
          <Flag className="w-4 h-4" />
          <span className="text-sm">No milestones yet</span>
        </div>
      )}

      {sorted.map((milestone) => {
        const isComplete = milestone.isComplete;
        const isLoading = toggleLoading[milestone.id];
        const isDeleting = deletingId === milestone.id;
        const isEditing = editingId === milestone.id;
        const deadlineStr = formatDeadline(milestone.deadline);
        const isOverdue = !isComplete && deadlineStr.includes("overdue");

        if (isEditing) {
          return (
            <div key={milestone.id} className="flex items-start gap-2 p-3 rounded-xl border border-brand-200 bg-brand-50">
              <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-2">
                <input
                  type="text"
                  value={editForm.title}
                  onChange={(e) => setEditForm((f) => ({ ...f, title: e.target.value }))}
                  className="sm:col-span-1 h-9 px-3 rounded-lg border border-surface-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                  placeholder="Title"
                />
                <input
                  type="date"
                  value={editForm.deadline}
                  onChange={(e) => setEditForm((f) => ({ ...f, deadline: e.target.value }))}
                  className="h-9 px-3 rounded-lg border border-surface-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
                {phases.length > 1 && (
                  <select
                    value={editForm.phaseNumber}
                    onChange={(e) => setEditForm((f) => ({ ...f, phaseNumber: Number(e.target.value) }))}
                    className="h-9 px-3 rounded-lg border border-surface-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                  >
                    {phases.map((p) => (
                      <option key={p.phaseNumber} value={p.phaseNumber}>
                        Phase {p.phaseNumber}{p.title ? ` — ${p.title}` : ""}
                      </option>
                    ))}
                  </select>
                )}
              </div>
              <button
                onClick={saveEdit}
                disabled={editLoading}
                className="mt-1 w-7 h-7 flex items-center justify-center rounded-lg text-success hover:bg-success/10 transition-colors shrink-0"
              >
                {editLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              </button>
              <button
                onClick={cancelEdit}
                className="mt-1 w-7 h-7 flex items-center justify-center rounded-lg text-surface-400 hover:bg-surface-100 transition-colors shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          );
        }

        return (
          <div
            key={milestone.id}
            className={cn(
              "flex items-start gap-3 px-3 py-2.5 rounded-lg transition-colors group",
              isComplete ? "bg-success/5" : isOverdue ? "bg-danger/5" : "hover:bg-surface-50",
              canToggle && !canManage && "cursor-pointer select-none"
            )}
            onClick={canToggle && !canManage ? () => toggle(milestone.id) : undefined}
          >
            {/* Toggle icon */}
            <div
              className={cn("mt-0.5 shrink-0", canToggle && "cursor-pointer")}
              onClick={canToggle ? (e) => { e.stopPropagation(); toggle(milestone.id); } : undefined}
            >
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
                <span className={cn("text-sm font-medium", isComplete ? "line-through text-surface-400" : "text-surface-800")}>
                  {milestone.title}
                </span>
                {showPhase && (
                  <span className="text-xs text-surface-400 bg-surface-100 px-1.5 py-0.5 rounded">
                    Phase {milestone.phaseNumber}
                  </span>
                )}
              </div>
              <p className={cn("text-xs mt-0.5", isOverdue ? "text-danger" : "text-surface-400")}>
                {formatDate(milestone.deadline)} · {deadlineStr}
              </p>
            </div>

            {/* Manage actions */}
            {canManage && (
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                <button
                  onClick={() => startEdit(milestone)}
                  className="w-7 h-7 flex items-center justify-center rounded-lg text-surface-400 hover:text-brand-600 hover:bg-brand-50 transition-colors"
                  title="Edit milestone"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => deleteMilestone(milestone.id)}
                  disabled={isDeleting}
                  className="w-7 h-7 flex items-center justify-center rounded-lg text-surface-400 hover:text-danger hover:bg-danger/10 transition-colors"
                  title="Delete milestone"
                >
                  {isDeleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                </button>
              </div>
            )}
          </div>
        );
      })}

      {/* Add form */}
      {adding && (
        <div className="flex items-start gap-2 p-3 rounded-xl border border-brand-200 bg-brand-50">
          <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-2">
            <input
              type="text"
              value={addForm.title}
              onChange={(e) => setAddForm((f) => ({ ...f, title: e.target.value }))}
              className="sm:col-span-1 h-9 px-3 rounded-lg border border-surface-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              placeholder="Milestone title…"
              autoFocus
            />
            <input
              type="date"
              value={addForm.deadline}
              onChange={(e) => setAddForm((f) => ({ ...f, deadline: e.target.value }))}
              className="h-9 px-3 rounded-lg border border-surface-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
            {phases.length > 1 && (
              <select
                value={addForm.phaseNumber}
                onChange={(e) => setAddForm((f) => ({ ...f, phaseNumber: Number(e.target.value) }))}
                className="h-9 px-3 rounded-lg border border-surface-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                {phases.map((p) => (
                  <option key={p.phaseNumber} value={p.phaseNumber}>
                    Phase {p.phaseNumber}{p.title ? ` — ${p.title}` : ""}
                  </option>
                ))}
              </select>
            )}
          </div>
          <button
            onClick={saveAdd}
            disabled={addLoading || !addForm.title || !addForm.deadline}
            className="mt-1 w-7 h-7 flex items-center justify-center rounded-lg text-success hover:bg-success/10 transition-colors disabled:opacity-40 shrink-0"
          >
            {addLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
          </button>
          <button
            onClick={() => { setAdding(false); setAddForm({ title: "", deadline: "", phaseNumber: currentPhase }); }}
            className="mt-1 w-7 h-7 flex items-center justify-center rounded-lg text-surface-400 hover:bg-surface-100 transition-colors shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Add button */}
      {canManage && !adding && (
        <button
          onClick={() => setAdding(true)}
          className="flex items-center gap-1.5 text-xs text-brand-600 hover:text-brand-700 font-medium py-1 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          Add Milestone
        </button>
      )}
    </div>
  );
}
