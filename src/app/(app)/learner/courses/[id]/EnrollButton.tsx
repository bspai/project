// src/app/(app)/learner/courses/[id]/EnrollButton.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/modules/shared/components/Button";

export function EnrollButton({ courseId }: { courseId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleEnroll() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/courses/${courseId}/enroll`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to enroll");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setLoading(false);
    }
  }

  return (
    <div className="space-y-2">
      <Button onClick={handleEnroll} isLoading={loading} className="w-full justify-center">
        Enroll Now — It&apos;s Free
      </Button>
      {error && <p className="text-xs text-danger text-center">{error}</p>}
    </div>
  );
}
