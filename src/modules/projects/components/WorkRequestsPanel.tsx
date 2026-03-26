// src/modules/projects/components/WorkRequestsPanel.tsx
"use client";

import { useState } from "react";
import { CheckCircle2, XCircle, Clock, Users, ChevronDown, ChevronUp } from "lucide-react";
import { Avatar } from "@/modules/shared/components/Avatar";
import { Button } from "@/modules/shared/components/Button";
import { Badge } from "@/modules/shared/components/Badge";
import { useTrackEvent } from "@/modules/shared/hooks/useTrackEvent";

interface WorkRequest {
  id: string;
  status: string;
  message: string | null;
  createdAt: string;
  learner: {
    id: string;
    name: string;
    email: string;
    avatar: string | null;
    bio: string | null;
  };
}

interface WorkRequestsPanelProps {
  projectId: string;
  requests: WorkRequest[];
}

export function WorkRequestsPanel({ projectId, requests }: WorkRequestsPanelProps) {
  const { trackEvent } = useTrackEvent();
  const [expanded, setExpanded] = useState(true);
  const [actioningId, setActioningId] = useState<string | null>(null);
  const [localRequests, setLocalRequests] = useState(requests);
  const [error, setError] = useState<string | null>(null);

  const pending = localRequests.filter((r) => r.status === "PENDING");
  const actioned = localRequests.filter((r) => r.status !== "PENDING");

  async function handleAction(requestId: string, action: "approve" | "reject") {
    setActioningId(requestId);
    setError(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/request/${requestId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Action failed");
      }

      trackEvent({
        action: action === "approve" ? "work_request_approved" : "work_request_rejected",
        entity: "project",
        entityId: projectId,
      });

      if (action === "approve") {
        // Mark approved, reject all others
        setLocalRequests((prev) =>
          prev.map((r) => ({
            ...r,
            status: r.id === requestId ? "APPROVED" : r.status === "PENDING" ? "REJECTED" : r.status,
          }))
        );
        // Hard reload so project status badge updates to IN_PROGRESS
        setTimeout(() => {
          window.location.reload();
        }, 800);
      } else {
        setLocalRequests((prev) =>
          prev.map((r) => (r.id === requestId ? { ...r, status: "REJECTED" } : r))
        );
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setActioningId(null);
    }
  }

  if (localRequests.length === 0) return null;

  return (
    <div className="rounded-xl border-2 border-brand-200 bg-brand-50/50 overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-3.5">
        <div className="w-8 h-8 rounded-lg bg-brand-100 flex items-center justify-center shrink-0">
          <Users className="w-4 h-4 text-brand-600" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-surface-900">
            Work Requests
          </p>
          <p className="text-xs text-surface-500 mt-0.5">
            {pending.length > 0
              ? `${pending.length} pending — approve one to start the project`
              : "All requests actioned"}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {pending.length > 0 && (
            <Badge variant="info">{pending.length} pending</Badge>
          )}
          <button
            onClick={() => setExpanded(!expanded)}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-surface-500 hover:bg-brand-100 transition-colors"
          >
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {error && (
        <div className="mx-4 mb-3 text-sm text-danger bg-danger/10 rounded-lg px-3 py-2">
          {error}
        </div>
      )}

      {expanded && (
        <div className="border-t border-brand-200 divide-y divide-brand-100">
          {/* Pending requests first */}
          {pending.map((req) => (
            <div key={req.id} className="flex items-start gap-4 px-5 py-4 bg-white">
              <Avatar name={req.learner.name} src={req.learner.avatar} size="sm" className="mt-0.5 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-surface-900">{req.learner.name}</p>
                <p className="text-xs text-surface-400">{req.learner.email}</p>
                {req.learner.bio && (
                  <p className="text-xs text-surface-500 mt-1 line-clamp-2">{req.learner.bio}</p>
                )}
                {req.message && (
                  <p className="text-xs text-surface-600 mt-1 italic">"{req.message}"</p>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Button
                  size="sm"
                  variant="primary"
                  isLoading={actioningId === req.id}
                  leftIcon={<CheckCircle2 className="w-3.5 h-3.5" />}
                  onClick={() => handleAction(req.id, "approve")}
                >
                  Approve
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  isLoading={actioningId === req.id}
                  leftIcon={<XCircle className="w-3.5 h-3.5" />}
                  onClick={() => handleAction(req.id, "reject")}
                >
                  Reject
                </Button>
              </div>
            </div>
          ))}

          {/* Actioned requests */}
          {actioned.map((req) => (
            <div key={req.id} className="flex items-center gap-4 px-5 py-3 bg-surface-50">
              <Avatar name={req.learner.name} src={req.learner.avatar} size="sm" className="shrink-0 opacity-60" />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-surface-600">{req.learner.name}</p>
              </div>
              <div className="shrink-0">
                {req.status === "APPROVED" ? (
                  <Badge variant="success" dot>Approved</Badge>
                ) : (
                  <Badge variant="default" dot>Rejected</Badge>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
