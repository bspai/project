// src/modules/shared/hooks/useTrackEvent.ts
"use client";

import { useCallback } from "react";
import { useSession } from "next-auth/react";

interface TrackEventPayload {
  action: string;
  entity?: string;
  entityId?: string;
  projectId?: string;
  metadata?: Record<string, unknown>;
}

export function useTrackEvent() {
  const { data: session } = useSession();

  const trackEvent = useCallback(
    async (payload: TrackEventPayload) => {
      try {
        // Fire-and-forget — never block the UI
        fetch("/api/analytics/track", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...payload,
            userId: session?.user?.id,
            sessionId: getSessionId(),
          }),
        }).catch(() => {
          // Silently ignore tracking failures
        });
      } catch {
        // Never throw
      }
    },
    [session?.user?.id]
  );

  return { trackEvent };
}

// Client-side session ID (tab-scoped)
function getSessionId(): string {
  if (typeof window === "undefined") return "";
  const key = "lms_sid";
  let sid = sessionStorage.getItem(key);
  if (!sid) {
    sid = Math.random().toString(36).slice(2) + Date.now().toString(36);
    sessionStorage.setItem(key, sid);
  }
  return sid;
}
