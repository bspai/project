// src/app/(app)/consultant/projects/new/page.tsx
import { requireRole } from "@/lib/auth/session";
import { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { ProjectForm } from "@/modules/projects/components/ProjectForm";

export const metadata: Metadata = { title: "New Project" };

export default async function NewProjectPage() {
  await requireRole("CONSULTANT");

  return (
    <div className="p-6 lg:p-8 max-w-3xl mx-auto">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-surface-500 mb-6">
        <Link
          href="/consultant/projects"
          className="flex items-center gap-1 hover:text-surface-800 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          My Projects
        </Link>
        <span>/</span>
        <span className="text-surface-800 font-medium">New Project</span>
      </div>

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-surface-900">Create New Project</h1>
        <p className="text-surface-500 text-sm mt-1">
          Fill in the details below. Learners will be able to discover and request to work on this project.
        </p>
      </div>

      <ProjectForm mode="create" />
    </div>
  );
}
