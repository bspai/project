// src/modules/projects/components/CommentItem.tsx
"use client";

import { useState } from "react";
import { Avatar } from "@/modules/shared/components/Avatar";
import { Badge } from "@/modules/shared/components/Badge";
import { Button } from "@/modules/shared/components/Button";
import { formatRelative } from "@/modules/shared/utils";

export type CommentAuthor = {
  id: string;
  name: string;
  roles: string[];
  avatar: string | null;
};

export type CommentData = {
  id: string;
  body: string;
  createdAt: string;
  isEdited: boolean;
  author: CommentAuthor;
  replies?: Omit<CommentData, "replies">[];
};

interface CommentItemProps {
  comment: CommentData;
  projectId: string;
  viewerId: string;
  canComment: boolean;
  isReply?: boolean;
  onChanged: () => void;
}

export function CommentItem({
  comment,
  projectId,
  viewerId,
  canComment,
  isReply = false,
  onChanged,
}: CommentItemProps) {
  const [showReplyBox, setShowReplyBox] = useState(false);
  const [replyBody, setReplyBody] = useState("");
  const [isSubmittingReply, setIsSubmittingReply] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editBody, setEditBody] = useState(comment.body);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isOwn = comment.author.id === viewerId;

  async function handleReply() {
    if (!replyBody.trim()) return;
    setIsSubmittingReply(true);
    setError(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: replyBody.trim(), parentId: comment.id }),
      });
      if (!res.ok) throw new Error();
      setReplyBody("");
      setShowReplyBox(false);
      onChanged();
    } catch {
      setError("Failed to post reply.");
    } finally {
      setIsSubmittingReply(false);
    }
  }

  async function handleSaveEdit() {
    if (!editBody.trim()) return;
    setIsSavingEdit(true);
    setError(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/comments/${comment.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: editBody.trim() }),
      });
      if (!res.ok) throw new Error();
      setIsEditing(false);
      onChanged();
    } catch {
      setError("Failed to save edit.");
    } finally {
      setIsSavingEdit(false);
    }
  }

  async function handleDelete() {
    setIsDeleting(true);
    setError(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/comments/${comment.id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error();
      onChanged();
    } catch {
      setError("Failed to delete comment.");
      setIsDeleting(false);
    }
  }

  return (
    <div className={`group ${isReply ? "ml-10 mt-3" : ""}`}>
      <div className="flex gap-3">
        <Avatar name={comment.author.name} src={comment.author.avatar} size="sm" className="shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="text-sm font-medium text-surface-900">{comment.author.name}</span>
            <Badge variant={comment.author.roles.includes("CONSULTANT") ? "info" : comment.author.roles.includes("MENTOR") ? "info" : "success"}>
              {comment.author.roles[0]
                ? comment.author.roles[0].charAt(0) + comment.author.roles[0].slice(1).toLowerCase()
                : "Learner"}
            </Badge>
            <span className="text-xs text-surface-400">{formatRelative(comment.createdAt)}</span>
            {comment.isEdited && (
              <span className="text-xs text-surface-400 italic">(edited)</span>
            )}
          </div>

          {/* Body or edit form */}
          {isEditing ? (
            <div className="mt-1">
              <textarea
                value={editBody}
                onChange={(e) => setEditBody(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 text-sm border border-surface-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
              />
              <div className="flex gap-2 mt-2">
                <Button size="sm" onClick={handleSaveEdit} isLoading={isSavingEdit} disabled={!editBody.trim()}>
                  Save
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => { setIsEditing(false); setEditBody(comment.body); }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <p className="text-sm text-surface-700 whitespace-pre-wrap break-words">{comment.body}</p>
          )}

          {error && <p className="text-xs text-danger mt-1">{error}</p>}

          {/* Action bar */}
          {!isEditing && (
            <div className="flex items-center gap-3 mt-1.5 h-5">
              {canComment && !isReply && (
                <button
                  onClick={() => setShowReplyBox(!showReplyBox)}
                  className="text-xs text-surface-400 hover:text-brand-600 transition-colors"
                >
                  Reply
                </button>
              )}
              {isOwn && (
                <>
                  <button
                    onClick={() => setIsEditing(true)}
                    className="text-xs text-surface-400 hover:text-surface-700 transition-colors opacity-0 group-hover:opacity-100"
                  >
                    Edit
                  </button>
                  <button
                    onClick={handleDelete}
                    disabled={isDeleting}
                    className="text-xs text-surface-400 hover:text-danger transition-colors opacity-0 group-hover:opacity-100 disabled:opacity-50"
                  >
                    {isDeleting ? "Deleting…" : "Delete"}
                  </button>
                </>
              )}
            </div>
          )}

          {/* Reply compose box */}
          {showReplyBox && (
            <div className="mt-3">
              <textarea
                value={replyBody}
                onChange={(e) => setReplyBody(e.target.value)}
                placeholder="Write a reply…"
                rows={2}
                autoFocus
                className="w-full px-3 py-2 text-sm border border-surface-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
              />
              <div className="flex gap-2 mt-2">
                <Button
                  size="sm"
                  onClick={handleReply}
                  isLoading={isSubmittingReply}
                  disabled={!replyBody.trim()}
                >
                  Post Reply
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => { setShowReplyBox(false); setReplyBody(""); }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Replies */}
      {!isReply && comment.replies && comment.replies.length > 0 && (
        <div className="mt-2 border-l-2 border-surface-100 pl-3">
          {comment.replies.map((reply) => (
            <CommentItem
              key={reply.id}
              comment={reply}
              projectId={projectId}
              viewerId={viewerId}
              canComment={canComment}
              isReply
              onChanged={onChanged}
            />
          ))}
        </div>
      )}
    </div>
  );
}
