// src/app/(app)/mentor/courses/new/NewCourseForm.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/modules/shared/components/Button";
import { Card } from "@/modules/shared/components/Card";

export function NewCourseForm() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isOpen, setIsOpen] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/courses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, description, isOpen }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to create course");
      router.push(`/mentor/courses/${data.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setLoading(false);
    }
  }

  return (
    <Card padding="lg">
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-surface-700">
            Course Title <span className="text-danger">*</span>
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Introduction to Python"
            required
            minLength={3}
            disabled={loading}
            className="w-full h-10 px-3 rounded-lg border border-surface-200 text-sm text-surface-900 placeholder:text-surface-400 focus:outline-none focus:ring-2 focus:ring-brand-500 disabled:opacity-50"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium text-surface-700">
            Description <span className="text-surface-400 font-normal">(optional)</span>
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What will learners gain from this course?"
            rows={4}
            maxLength={2000}
            disabled={loading}
            className="w-full px-3 py-2.5 rounded-lg border border-surface-200 text-sm text-surface-900 placeholder:text-surface-400 focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none disabled:opacity-50"
          />
          <p className="text-xs text-surface-400">{description.length}/2000</p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            role="switch"
            aria-checked={isOpen}
            onClick={() => setIsOpen(!isOpen)}
            disabled={loading}
            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500 ${isOpen ? "bg-brand-600" : "bg-surface-300"}`}
          >
            <span
              className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${isOpen ? "translate-x-4.5" : "translate-x-0.5"}`}
            />
          </button>
          <div>
            <p className="text-sm font-medium text-surface-700">Open enrollment</p>
            <p className="text-xs text-surface-500">
              {isOpen ? "Learners can self-enroll" : "Admin must assign learners"}
            </p>
          </div>
        </div>

        {error && <p className="text-sm text-danger">{error}</p>}

        <div className="flex gap-3 justify-end pt-1">
          <Button
            type="button"
            variant="ghost"
            onClick={() => router.back()}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button type="submit" isLoading={loading} disabled={!title.trim()}>
            Create Course
          </Button>
        </div>
      </form>
    </Card>
  );
}
