// src/app/(app)/learner/courses/[id]/CourseReviews.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Star, Pencil, Trash2 } from "lucide-react";
import { StarRating, StarDisplay } from "@/modules/shared/components/StarRating";
import { Button } from "@/modules/shared/components/Button";
import { Card } from "@/modules/shared/components/Card";
import { formatDate } from "@/modules/shared/utils";

interface Reviewer {
  id: string;
  name: string;
  avatar: string | null;
}

interface Review {
  id: string;
  rating: number;
  body: string | null;
  createdAt: string;
  updatedAt: string;
  learnerId: string;
  learner: Reviewer;
}

interface CourseReviewsProps {
  courseId: string;
  currentUserId: string;
  /** Whether the current user is eligible to leave a review (enrolled + completed) */
  canReview: boolean;
  existingReview: Review | null;
  reviews: Review[];
  avg: number | null;
  count: number;
}

function ReviewForm({
  courseId,
  initial,
  onDone,
}: {
  courseId: string;
  initial?: Review;
  onDone: () => void;
}) {
  const router = useRouter();
  const [rating, setRating] = useState(initial?.rating ?? 0);
  const [body, setBody] = useState(initial?.body ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!rating) { setError("Please select a star rating."); return; }
    setSaving(true);
    setError("");

    let res: Response;
    if (initial) {
      res = await fetch(`/api/courses/${courseId}/reviews/${initial.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating, body: body.trim() || undefined }),
      });
    } else {
      res = await fetch(`/api/courses/${courseId}/reviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating, body: body.trim() || undefined }),
      });
    }

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Something went wrong.");
      setSaving(false);
      return;
    }

    setSaving(false);
    router.refresh();
    onDone();
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <p className="text-sm font-medium text-surface-700 mb-2">Your rating</p>
        <StarRating value={rating} onChange={setRating} size="lg" />
      </div>
      <div>
        <label className="text-sm font-medium text-surface-700 block mb-1.5">
          Review <span className="text-surface-400 font-normal">(optional)</span>
        </label>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={4}
          maxLength={2000}
          placeholder="Share what you learned or how this course helped you..."
          className="w-full px-3 py-2 rounded-lg border border-surface-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
        />
      </div>
      {error && <p className="text-xs text-danger">{error}</p>}
      <div className="flex gap-2 justify-end">
        <Button type="button" variant="ghost" size="sm" onClick={onDone} disabled={saving}>
          Cancel
        </Button>
        <Button type="submit" size="sm" isLoading={saving} disabled={!rating}>
          {initial ? "Update Review" : "Submit Review"}
        </Button>
      </div>
    </form>
  );
}

function ReviewCard({
  review,
  isOwn,
  courseId,
  onEdit,
}: {
  review: Review;
  isOwn: boolean;
  courseId: string;
  onEdit: () => void;
}) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    if (!confirm("Delete your review?")) return;
    setDeleting(true);
    await fetch(`/api/courses/${courseId}/reviews/${review.id}`, { method: "DELETE" });
    router.refresh();
  }

  return (
    <div className={`flex gap-3 py-4 ${isOwn ? "border border-brand-200 rounded-xl px-4 bg-brand-50/40" : ""}`}>
      <div className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center shrink-0 text-sm font-semibold text-brand-700">
        {review.learner.avatar ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={review.learner.avatar} alt={review.learner.name} className="w-8 h-8 rounded-full object-cover" />
        ) : (
          review.learner.name.charAt(0).toUpperCase()
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-sm font-semibold text-surface-900">
              {review.learner.name}
              {isOwn && <span className="ml-1.5 text-xs font-normal text-brand-600">(you)</span>}
            </p>
            <div className="flex items-center gap-2 mt-0.5">
              <StarRating value={review.rating} readOnly size="sm" />
              <span className="text-xs text-surface-400">{formatDate(review.createdAt)}</span>
            </div>
          </div>
          {isOwn && (
            <div className="flex items-center gap-1 shrink-0">
              <button
                onClick={onEdit}
                className="p-1 rounded text-surface-400 hover:text-brand-600 hover:bg-brand-50 transition-colors"
                title="Edit review"
              >
                <Pencil className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="p-1 rounded text-surface-400 hover:text-danger hover:bg-danger-50 transition-colors"
                title="Delete review"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
        {review.body && (
          <p className="text-sm text-surface-700 mt-2 leading-relaxed whitespace-pre-line">{review.body}</p>
        )}
      </div>
    </div>
  );
}

export function CourseReviews({
  courseId,
  currentUserId,
  canReview,
  existingReview,
  reviews,
  avg,
  count,
}: CourseReviewsProps) {
  const [showForm, setShowForm] = useState(false);
  const [editingReview, setEditingReview] = useState<Review | null>(null);

  const hasReview = !!existingReview;
  const showWriteForm = showForm || !!editingReview;

  return (
    <Card padding="md">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <h2 className="font-semibold text-surface-900">Reviews</h2>
          {avg !== null && count > 0 && (
            <StarDisplay avg={avg} count={count} size="md" />
          )}
          {count === 0 && (
            <span className="text-sm text-surface-400">No reviews yet</span>
          )}
        </div>
        {canReview && !hasReview && !showWriteForm && (
          <Button size="sm" variant="outline" leftIcon={<Star className="w-3.5 h-3.5" />} onClick={() => setShowForm(true)}>
            Write a Review
          </Button>
        )}
      </div>

      {/* Write / Edit form */}
      {showWriteForm && (
        <div className="mb-6 p-4 border border-surface-200 rounded-xl bg-surface-50">
          <p className="text-sm font-semibold text-surface-900 mb-3">
            {editingReview ? "Edit your review" : "Write a review"}
          </p>
          <ReviewForm
            courseId={courseId}
            initial={editingReview ?? undefined}
            onDone={() => { setShowForm(false); setEditingReview(null); }}
          />
        </div>
      )}

      {/* Not eligible hint */}
      {!canReview && !hasReview && (
        <p className="text-xs text-surface-400 mb-4">
          Complete all lessons to leave a review.
        </p>
      )}

      {/* Review list */}
      {reviews.length > 0 ? (
        <div className="divide-y divide-surface-100">
          {reviews.map((r) => (
            <ReviewCard
              key={r.id}
              review={r}
              isOwn={r.learnerId === currentUserId}
              courseId={courseId}
              onEdit={() => { setEditingReview(r); setShowForm(false); }}
            />
          ))}
        </div>
      ) : (
        !showWriteForm && (
          <p className="text-sm text-surface-400 text-center py-4">
            Be the first to review this course.
          </p>
        )
      )}
    </Card>
  );
}
