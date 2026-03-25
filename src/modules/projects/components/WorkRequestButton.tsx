// src/modules/projects/components/WorkRequestButton.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Send, Clock, CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/modules/shared/components/Button";
import { useTrackEvent } from "@/modules/shared/hooks/useTrackEvent";

interface WorkRequestButtonProps {
  projectId: string;
  requestStatus: "PENDING" | "APPROVED" | "REJECTED" | null;
  isAssigned: boolean;
}

export function WorkRequestButton({ projectId, requestStatus, isAssigned }: WorkRequestButtonProps) {
  const router = useRouter();
  const { trackEvent } = useTrackEvent();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [localStatus, setLocalStatus] = useState(requestStatus);

  if (isAssigned) {
    return (
      <div className="flex items-center gap-2 px-4 py-2.5 bg-success/10 border border-success/20 rounded-xl">
        <CheckCircle2 className="w-4 h-4 text-success" />
        <span className="text-sm font-medium text-success-dark">You are assigned to this project</span>
      </div>
    );
  }

  if (localStatus === "APPROVED") {
    return (
      <div className="flex items-center gap-2 px-4 py-2.5 bg-success/10 border border-success/20 rounded-xl">
        <CheckCircle2 className="w-4 h-4 text-success" />
        <span className="text-sm font-medium text-success-dark">Request approved</span>
      </div>
    );
  }

  if (localStatus === "PENDING") {
    return (
      <div className="flex items-center gap-2 px-4 py-2.5 bg-warning/10 border border-warning/20 rounded-xl">
        <Clock className="w-4 h-4 text-warning-dark" />
        <span className="text-sm font-medium text-warning-dark">Request sent — awaiting approval</span>
      </div>
    );
  }

  if (localStatus === "REJECTED") {
    return (
      <div className="flex items-center gap-2 px-4 py-2.5 bg-danger/10 border border-danger/20 rounded-xl">
        <XCircle className="w-4 h-4 text-danger" />
        <span className="text-sm font-medium text-danger-dark">Request was not accepted</span>
      </div>
    );
  }

  async function handleRequest() {
    setIsSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Failed to send request");
      }
      trackEvent({ action: "work_request_sent", entity: "project", entityId: projectId });
      setLocalStatus("PENDING");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-2">
      <Button
        onClick={handleRequest}
        isLoading={isSubmitting}
        leftIcon={<Send className="w-4 h-4" />}
        className="w-full"
      >
        Request to Work on This Project
      </Button>
      {error && <p className="text-xs text-danger text-center">{error}</p>}
    </div>
  );
}
