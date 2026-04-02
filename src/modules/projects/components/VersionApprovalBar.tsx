// src/modules/projects/components/VersionApprovalBar.tsx
"use client";

import { useState } from "react";
import {
  CheckCircle2, ChevronDown, ChevronUp, GitBranch,
  AlertTriangle, Clock, UserCheck, FastForward,
} from "lucide-react";
import { Button } from "@/modules/shared/components/Button";
import { DiffViewer } from "./DiffViewer";
import { useTrackEvent } from "@/modules/shared/hooks/useTrackEvent";
import type { ProjectDiff } from "@/lib/diff";

interface SignoffInfo {
  userId: string;
  userName: string;
  role: string;
}

interface VersionApprovalBarProps {
  projectId: string;
  pendingVersionNumber: number;
  pendingVersionId: string;
  diff: ProjectDiff;
  projectStatus: string;
  /** Who is viewing this — "CONSULTANT" or "LEARNER" */
  viewerRole: "CONSULTANT" | "LEARNER";
  /** Current user ID */
  viewerId: string;
  /** Existing signoffs on the pending version */
  signoffs?: SignoffInfo[];
  /** Whether a next phase exists (enables defer button) */
  hasNextPhase?: boolean;
}

export function VersionApprovalBar({
  projectId,
  pendingVersionNumber,
  pendingVersionId,
  diff,
  projectStatus,
  viewerRole,
  viewerId,
  signoffs = [],
  hasNextPhase = false,
}: VersionApprovalBarProps) {
  const { trackEvent } = useTrackEvent();
  const [expanded, setExpanded] = useState(true);
  const [isApproving, setIsApproving] = useState(false);
  const [isDeferring, setIsDeferring] = useState(false);
  const [approved, setApproved] = useState(false);
  const [deferred, setDeferred] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSelfApprove = projectStatus === "OPEN" && viewerRole === "CONSULTANT";
  const isInProgress = projectStatus === "IN_PROGRESS";

  // Signoff status
  const consultantSigned = signoffs.some((s) => s.role === "CONSULTANT");
  const learnerSigned = signoffs.some((s) => s.role === "LEARNER");
  const viewerSigned = signoffs.some((s) => s.userId === viewerId);
  const canSignoff = isInProgress && !viewerSigned;

  async function handleSelfApprove() {
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
      setApproved(true);
      setTimeout(() => {
        window.location.href =
          viewerRole === "CONSULTANT"
            ? `/consultant/projects/${projectId}`
            : `/learner/projects/${projectId}`;
      }, 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setIsApproving(false);
    }
  }

  async function handleSignoff() {
    setIsApproving(true);
    setError(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/signoff`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ versionId: pendingVersionId }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Signoff failed");
      }
      const result = await res.json();
      trackEvent({
        action: "version_signoff",
        entity: "project",
        entityId: projectId,
        metadata: { versionNumber: pendingVersionNumber, bothSigned: result.bothSigned },
      });
      setApproved(true);
      setTimeout(() => {
        window.location.href =
          viewerRole === "CONSULTANT"
            ? `/consultant/projects/${projectId}`
            : `/learner/projects/${projectId}`;
      }, 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setIsApproving(false);
    }
  }

  async function handleDefer() {
    setIsDeferring(true);
    setError(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/defer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ versionId: pendingVersionId }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Defer failed");
      }
      trackEvent({
        action: "version_deferred",
        entity: "project",
        entityId: projectId,
        metadata: { versionNumber: pendingVersionNumber },
      });
      setDeferred(true);
      setTimeout(() => {
        window.location.href =
          viewerRole === "CONSULTANT"
            ? `/consultant/projects/${projectId}`
            : `/learner/projects/${projectId}`;
      }, 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setIsDeferring(false);
    }
  }

  // Success banners
  if (approved) {
    return (
      <div className="rounded-xl border-2 border-success/30 bg-success/5 px-5 py-4 flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-success/20 flex items-center justify-center shrink-0">
          <CheckCircle2 className="w-4 h-4 text-success" />
        </div>
        <div>
          <p className="text-sm font-semibold text-success-dark">
            {canSelfApprove
              ? `Version ${pendingVersionNumber} approved`
              : `You have signed off on version ${pendingVersionNumber}`}
          </p>
          <p className="text-xs text-surface-500 mt-0.5">Refreshing page…</p>
        </div>
      </div>
    );
  }

  if (deferred) {
    return (
      <div className="rounded-xl border-2 border-surface-300 bg-surface-50 px-5 py-4 flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-surface-200 flex items-center justify-center shrink-0">
          <FastForward className="w-4 h-4 text-surface-600" />
        </div>
        <div>
          <p className="text-sm font-semibold text-surface-700">
            Version {pendingVersionNumber} deferred to next phase
          </p>
          <p className="text-xs text-surface-500 mt-0.5">Refreshing page…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border-2 border-warning/40 bg-warning/5 overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-3.5">
        <div className="w-8 h-8 rounded-lg bg-warning/20 flex items-center justify-center shrink-0">
          <GitBranch className="w-4 h-4 text-warning-dark" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-surface-900">
            Version {pendingVersionNumber} pending {canSelfApprove ? "approval" : "signoff"}
          </p>
          <p className="text-xs text-surface-500 mt-0.5">
            {canSelfApprove
              ? "Review the changes below and approve to make them live."
              : isInProgress
                ? "Both consultant and learner must sign off to activate these changes."
                : "Changes are pending signoff from both parties."}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {canSelfApprove && (
            <Button
              size="sm"
              variant="primary"
              isLoading={isApproving}
              leftIcon={<CheckCircle2 className="w-4 h-4" />}
              onClick={handleSelfApprove}
            >
              Approve Changes
            </Button>
          )}
          {canSignoff && (
            <Button
              size="sm"
              variant="primary"
              isLoading={isApproving}
              leftIcon={<UserCheck className="w-4 h-4" />}
              onClick={handleSignoff}
            >
              Sign Off
            </Button>
          )}
          {isInProgress && hasNextPhase && !viewerSigned && (
            <Button
              size="sm"
              variant="outline"
              isLoading={isDeferring}
              leftIcon={<FastForward className="w-4 h-4" />}
              onClick={handleDefer}
            >
              Defer to Next Phase
            </Button>
          )}
          <button
            onClick={() => setExpanded(!expanded)}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-surface-500 hover:bg-warning/10 transition-colors"
          >
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Signoff status indicators (IN_PROGRESS only) */}
      {isInProgress && (
        <div className="flex items-center gap-4 px-5 pb-2">
          <div className="flex items-center gap-1.5 text-xs">
            {consultantSigned ? (
              <CheckCircle2 className="w-3.5 h-3.5 text-success" />
            ) : (
              <Clock className="w-3.5 h-3.5 text-surface-400" />
            )}
            <span className={consultantSigned ? "text-success-dark font-medium" : "text-surface-500"}>
              Consultant {consultantSigned ? "signed" : "pending"}
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-xs">
            {learnerSigned ? (
              <CheckCircle2 className="w-3.5 h-3.5 text-success" />
            ) : (
              <Clock className="w-3.5 h-3.5 text-surface-400" />
            )}
            <span className={learnerSigned ? "text-success-dark font-medium" : "text-surface-500"}>
              Learner {learnerSigned ? "signed" : "pending"}
            </span>
          </div>
          {viewerSigned && (
            <span className="text-xs text-brand-600 font-medium ml-auto">
              You have signed off — waiting for the other party
            </span>
          )}
        </div>
      )}

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
