// src/modules/projects/components/VersionApprovalBar.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, ChevronDown, ChevronUp, GitBranch, AlertTriangle } from "lucide-react";
import { Button } from "@/modules/shared/components/Button";
import { DiffViewer } from "./DiffViewer";
import { useTrackEvent } from "@/modules/shared/hooks/useTrackEvent";
import type { ProjectDiff } from "@/lib/diff";

interface VersionApprovalBarProps {
  projectId: string;
  pendingVersionNumber: number;
  pendingVersionId: string;
  diff: ProjectDiff;
  projectStatus: string;
}

export function VersionApprovalBar({
  projectId,
  pendingVersionNumber,
  pendingVersionId,
  diff,
  projectStatus,
}: VersionApprovalBarProps) {
  const router = useRouter();
  const { trackEvent } = useTrackEvent();
  const [expanded, setExpanded] = useState(true);
  const [isApproving, setIsApproving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Self-approval only available when project is OPEN
  const canSelfApprove = projectStatus === "OPEN";

  async function handleApprove() {
    setIsApproving(true);
    setError(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ versionId: pendingVersionId }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Approval failed");
      }
      trackEvent({
        action: "version_self_approved",
        entity: "project",
        entityId: projectId,
        metadata: { versionNumber: pendingVersionNumber },
      });
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsApproving(false);
    }
  }

  return (
    <div className="rounded-xl border-2 border-warning/40 bg-warning/5 overflow-hidden">
      {/* Bar header */}
      <div className="flex items-center gap-3 px-5 py-3.5">
        <div className="w-8 h-8 rounded-lg bg-warning/20 flex items-center justify-center shrink-0">
          <GitBranch className="w-4 h-4 text-warning-dark" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-surface-900">
            Version {pendingVersionNumber} pending approval
          </p>
          <p className="text-xs text-surface-500 mt-0.5">
            {canSelfApprove
              ? "Review the changes below and approve to make them live."
              : "Changes are pending signoff from both parties."}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          TestDiffViewer
          {canSelfApprove && (
            <Button
              size="sm"
              variant="primary"
              isLoading={isApproving}
              leftIcon={<CheckCircle2 className="w-4 h-4" />}
              onClick={handleApprove}
            >
              Approve Changes
            </Button>
          )}
          <button
            onClick={() => setExpanded(!expanded)}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-surface-500 hover:bg-warning/10 transition-colors"
          >
            {expanded ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="mx-4 mb-3 flex items-center gap-2 text-sm text-danger bg-danger/10 rounded-lg px-3 py-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Diff panel */}
      {expanded && (
        <div className="px-5 pb-5 border-t border-warning/20 pt-4">
          <p className="text-xs font-semibold text-surface-500 uppercase tracking-wide mb-3">
            Changes in this version
          </p>
          <DiffViewer diff={diff} />
        </div>
      )}
    </div>
  );
}
