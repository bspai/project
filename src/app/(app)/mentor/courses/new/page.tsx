// src/app/(app)/mentor/courses/new/page.tsx
import { requireRole } from "@/lib/auth/session";
import { Metadata } from "next";
import { GraduationCap } from "lucide-react";
import { NewCourseForm } from "./NewCourseForm";

export const metadata: Metadata = { title: "Create Course" };

export default async function NewCoursePage() {
  await requireRole("MENTOR");
  return (
    <div className="p-6 lg:p-8 max-w-2xl mx-auto">
      <div className="flex items-center gap-2 mb-8">
        <GraduationCap className="w-5 h-5 text-surface-400" />
        <h1 className="text-2xl font-bold text-surface-900">Create Course</h1>
      </div>
      <NewCourseForm />
    </div>
  );
}
