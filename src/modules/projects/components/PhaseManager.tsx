// src/modules/projects/components/PhaseManager.tsx
"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Loader2, Plus, Pencil, Trash2, Check, X, GitBranch,
} from "lucide-react";

interface Phase {
  id: string;
  phaseNumber: number;
  title: string;
  status: string;
}

interface PhaseManagerProps {
  projectId: string;
  phases: Phase[];
  canManage?: boolean;
}

export function PhaseManager({
  projectId,
  phases: initialPhases,
  canManage = false,
}: PhaseManagerProps) {
  const router = useRouter();
  const [phases, setPhases] = useState<Phase[]>(initialPhases);

  useEffect(() => {
    setPhases(initialPhases);
  }, [initialPhases]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editLoading, setEditLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [addTitle, setAddTitle] = useState("");
  const [addLoading, setAddLoading] = useState(false);

  const startEdit = useCallback((phase: Phase) => {
    setEditingId(phase.id);
    setEditTitle(phase.title);
  }, []);

  const saveEdit = useCallback(async () => {
    if (!editingId || editLoading) return;
    setEditLoading(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/phases/${editingId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: editTitle }),
      });
      if (!res.ok) return;
      const updated = await res.json();
      setPhases((ps) => ps.map((p) => p.id === editingId ? { ...p, title: updated.title } : p));
      setEditingId(null);
    } finally {
      setEditLoading(false);
    }
  }, [editingId, editLoading, editTitle, projectId]);

  const deletePhase = useCallback(async (id: string) => {
    setDeletingId(id);
    try {
      const res = await fetch(`/api/projects/${projectId}/phases/${id}`, { method: "DELETE" });
      if (!res.ok) return;
      setPhases((ps) => ps.filter((p) => p.id !== id));
    } finally {
      setDeletingId(null);
    }
  }, [projectId]);

  const saveAdd = useCallback(async () => {
    if (addLoading) return;
    setAddLoading(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/phases`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: addTitle }),
      });
      if (!res.ok) return;
      const created = await res.json();
      setPhases((ps) => [...ps, created]);
      setAdding(false);
      setAddTitle("");
      router.refresh();
    } finally {
      setAddLoading(false);
    }
  }, [addLoading, addTitle, projectId, router]);

  const sorted = [...phases].sort((a, b) => a.phaseNumber - b.phaseNumber);

  return (
    <div className="space-y-2">
      {sorted.length === 0 && !adding && (
        <div className="flex items-center gap-2 py-4 text-surface-400">
          <GitBranch className="w-4 h-4" />
          <span className="text-sm">No phases yet</span>
        </div>
      )}

      {sorted.map((phase) => {
        const isDeleting = deletingId === phase.id;
        const isEditing = editingId === phase.id;
        const canDelete = phase.status === "UPCOMING" && phases.length > 1;

        if (isEditing) {
          return (
            <div key={phase.id} className="flex items-center gap-2 p-2 rounded-xl border border-brand-200 bg-brand-50">
              <input
                type="text"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="flex-1 h-8 px-3 rounded-lg border border-surface-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                placeholder="Phase title…"
                autoFocus
                onKeyDown={(e) => { if (e.key === "Enter") saveEdit(); if (e.key === "Escape") setEditingId(null); }}
              />
              <button
                onClick={saveEdit}
                disabled={editLoading}
                className="w-7 h-7 flex items-center justify-center rounded-lg text-success hover:bg-success/10 transition-colors shrink-0"
              >
                {editLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              </button>
              <button
                onClick={() => setEditingId(null)}
                className="w-7 h-7 flex items-center justify-center rounded-lg text-surface-400 hover:bg-surface-100 transition-colors shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          );
        }

        return (
          <div key={phase.id} className="flex items-center gap-3 px-3 py-2.5 rounded-lg group hover:bg-surface-50 transition-colors">
            <div className={`w-2 h-2 rounded-full shrink-0 ${
              phase.status === "ACTIVE" ? "bg-brand-500" :
              phase.status === "COMPLETE" ? "bg-success" : "bg-surface-200"
            }`} />
            <span className="text-sm text-surface-700 flex-1">
              Phase {phase.phaseNumber}{phase.title ? ` — ${phase.title}` : ""}
            </span>
            <span className={`text-xs shrink-0 ${
              phase.status === "ACTIVE" ? "text-brand-600 font-medium" :
              phase.status === "COMPLETE" ? "text-success" : "text-surface-400"
            }`}>
              {phase.status === "ACTIVE" ? "Active" : phase.status === "COMPLETE" ? "Done" : "Upcoming"}
            </span>
            {canManage && (
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                <button
                  onClick={() => startEdit(phase)}
                  className="w-7 h-7 flex items-center justify-center rounded-lg text-surface-400 hover:text-brand-600 hover:bg-brand-50 transition-colors"
                  title="Edit phase title"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                {canDelete && (
                  <button
                    onClick={() => deletePhase(phase.id)}
                    disabled={isDeleting}
                    className="w-7 h-7 flex items-center justify-center rounded-lg text-surface-400 hover:text-danger hover:bg-danger/10 transition-colors"
                    title="Delete phase"
                  >
                    {isDeleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                  </button>
                )}
              </div>
            )}
          </div>
        );
      })}

      {/* Add form */}
      {adding && (
        <div className="flex items-center gap-2 p-2 rounded-xl border border-brand-200 bg-brand-50">
          <input
            type="text"
            value={addTitle}
            onChange={(e) => setAddTitle(e.target.value)}
            className="flex-1 h-8 px-3 rounded-lg border border-surface-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            placeholder="Phase title (optional)…"
            autoFocus
            onKeyDown={(e) => { if (e.key === "Enter") saveAdd(); if (e.key === "Escape") { setAdding(false); setAddTitle(""); } }}
          />
          <button
            onClick={saveAdd}
            disabled={addLoading}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-success hover:bg-success/10 transition-colors disabled:opacity-40 shrink-0"
          >
            {addLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
          </button>
          <button
            onClick={() => { setAdding(false); setAddTitle(""); }}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-surface-400 hover:bg-surface-100 transition-colors shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {canManage && !adding && (
        <button
          onClick={() => setAdding(true)}
          className="flex items-center gap-1.5 text-xs text-brand-600 hover:text-brand-700 font-medium py-1 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          Add Phase
        </button>
      )}
    </div>
  );
}
