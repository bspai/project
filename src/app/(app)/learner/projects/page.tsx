// src/app/(app)/learner/projects/page.tsx
import { requireRole } from "@/lib/auth/session";
import { Metadata } from "next";

export const metadata: Metadata = { title: "Browse Projects" };

export default async function LearnerProjectsPage() {
  await requireRole("LEARNER");

  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-surface-900">Browse Projects</h1>
        <p className="text-surface-500 text-sm mt-0.5">
          Find a project to work on.
        </p>
      </div>

      {/* Phase 4 will populate this */}
      <div className="bg-white rounded-xl border border-surface-200 border-dashed flex items-center justify-center py-24">
        <p className="text-surface-400 text-sm">Project search & browse — implemented in Phase 4</p>
      </div>
    </div>
  );
}
