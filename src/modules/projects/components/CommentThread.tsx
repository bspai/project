// src/modules/projects/components/CommentThread.tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import { MessageSquare, RefreshCw } from "lucide-react";
import { Card, CardHeader, CardTitle } from "@/modules/shared/components/Card";
import { Badge } from "@/modules/shared/components/Badge";
import { Button } from "@/modules/shared/components/Button";
import { CommentItem, type CommentData } from "./CommentItem";

interface CommentThreadProps {
  projectId: string;
  viewerId: string;
  canComment: boolean;
}

export function CommentThread({ projectId, viewerId, canComment }: CommentThreadProps) {
  const [comments, setComments] = useState<CommentData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [newBody, setNewBody] = useState("");
  const [isPosting, setIsPosting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchComments = useCallback(async () => {
    try {
      const res = await fetch(`/api/projects/${projectId}/comments`);
      if (!res.ok) return;
      setComments(await res.json());
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  async function handlePost() {
    if (!newBody.trim()) return;
    setIsPosting(true);
    setError(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: newBody.trim() }),
      });
      if (!res.ok) throw new Error();
      setNewBody("");
      await fetchComments();
    } catch {
      setError("Failed to post comment. Please try again.");
    } finally {
      setIsPosting(false);
    }
  }

  return (
    <Card padding="md">
      <CardHeader>
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-surface-400" />
          <CardTitle>Comments</CardTitle>
          {!isLoading && <Badge variant="default">{comments.length}</Badge>}
        </div>
        <button
          onClick={async () => {
            setIsRefreshing(true);
            await fetchComments();
            setIsRefreshing(false);
          }}
          disabled={isLoading || isRefreshing}
          className="p-1 rounded text-surface-400 hover:text-surface-600 hover:bg-surface-100 transition-colors disabled:opacity-40"
          aria-label="Refresh comments"
        >
          <RefreshCw className={`w-4 h-4 ${isRefreshing ? "animate-spin" : ""}`} />
        </button>
      </CardHeader>

      {isLoading ? (
        <div className="space-y-4">
          {[0, 1].map((i) => (
            <div key={i} className="flex gap-3 animate-pulse">
              <div className="w-8 h-8 rounded-full bg-surface-100 shrink-0" />
              <div className="flex-1 space-y-2 py-1">
                <div className="h-3 bg-surface-100 rounded w-28" />
                <div className="h-3 bg-surface-100 rounded" />
                <div className="h-3 bg-surface-100 rounded w-3/4" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <>
          {comments.length > 0 && (
            <div className="divide-y divide-surface-100 mb-5">
              {comments.map((comment) => (
                <div key={comment.id} className="py-4 first:pt-0 last:pb-0">
                  <CommentItem
                    comment={comment}
                    projectId={projectId}
                    viewerId={viewerId}
                    canComment={canComment}
                    onChanged={fetchComments}
                  />
                </div>
              ))}
            </div>
          )}

          {canComment ? (
            <div className={comments.length > 0 ? "pt-4 border-t border-surface-100" : ""}>
              {comments.length === 0 && (
                <p className="text-sm text-surface-400 italic mb-4">
                  No comments yet. Be the first to comment.
                </p>
              )}
              <textarea
                value={newBody}
                onChange={(e) => setNewBody(e.target.value)}
                placeholder="Add a comment…"
                rows={3}
                className="w-full px-3 py-2 text-sm border border-surface-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
              />
              {error && <p className="text-xs text-danger mt-1">{error}</p>}
              <div className="mt-2 flex justify-end">
                <Button
                  size="sm"
                  onClick={handlePost}
                  isLoading={isPosting}
                  disabled={!newBody.trim()}
                >
                  Post Comment
                </Button>
              </div>
            </div>
          ) : (
            comments.length === 0 && (
              <p className="text-sm text-surface-400 italic">No comments yet.</p>
            )
          )}
        </>
      )}
    </Card>
  );
}
