// src/modules/projects/components/ProjectEditForm.tsx
"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { RichTextEditor } from "./RichTextEditor";
import { TechnologiesInput } from "./TechnologiesInput";
import { Button } from "@/modules/shared/components/Button";
import { Input } from "@/modules/shared/components/Input";
import { Card } from "@/modules/shared/components/Card";
import { useTrackEvent } from "@/modules/shared/hooks/useTrackEvent";
import type { ProjectFormValues } from "../types";
import { FileText, Cpu, Calendar, AlertCircle } from "lucide-react";
import { JsonValue } from "@prisma/client/runtime/library";

const schema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters"),
  deadline: z.string().min(1, "Deadline is required"),
  technologies: z.array(z.string()).min(1, "Add at least one technology"),
  descriptionJson: z.record(z.unknown()),
  descriptionText: z.string().min(10, "Description must be at least 10 characters"),
});

interface ProjectEditFormProps {
  projectId: string;
  defaultValues: ProjectFormValues;
  projectStatus: string;
  hasPendingVersion: boolean;
}

export function ProjectEditForm({
  projectId,
  defaultValues,
  projectStatus,
  hasPendingVersion,
}: ProjectEditFormProps) {
  const router = useRouter();
  const { trackEvent } = useTrackEvent();
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    control,
    setValue,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<ProjectFormValues>({
    resolver: zodResolver(schema),
    defaultValues,
  });

  const onSubmit = useCallback(
    async (values: ProjectFormValues) => {
      setSubmitError(null);
      try {
        const res = await fetch(`/api/projects/${projectId}/versions`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(values),
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error ?? "Failed to save changes");
        }

        const data = await res.json();

        trackEvent({
          action: "project_version_submitted",
          entity: "project",
          entityId: projectId,
          metadata: { versionNumber: data.versionNumber },
        });

        // Redirect back to detail page where the approval bar will appear
        router.push(`/consultant/projects/${projectId}`);
        router.refresh();
      } catch (err) {
        setSubmitError(err instanceof Error ? err.message : "Something went wrong");
      }
    },
    [projectId, router, trackEvent]
  );

  const isDisabled = hasPendingVersion;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {submitError && (
        <div className="flex items-start gap-3 bg-danger/10 border border-danger/20 text-danger rounded-xl px-4 py-3">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <p className="text-sm">{submitError}</p>
        </div>
      )}

      {/* Project Title + Deadline */}
      <Card padding="md">
        <div className="flex items-center gap-2 mb-4">
          <FileText className="w-4 h-4 text-brand-500" />
          <h2 className="text-sm font-semibold text-surface-800">Project Details</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <Input
              label="Project Title"
              placeholder="e.g. E-Commerce Platform"
              required
              disabled={isDisabled}
              error={errors.title?.message}
              {...register("title")}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-surface-700 mb-1.5">
              Project Deadline <span className="text-danger">*</span>
            </label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400 pointer-events-none" />
              <input
                type="date"
                disabled={isDisabled}
                className="w-full h-10 pl-10 pr-3 rounded-lg border border-surface-200 hover:border-surface-300 text-sm text-surface-900 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent bg-white disabled:bg-surface-50 disabled:text-surface-400"
                {...register("deadline")}
              />
            </div>
            {errors.deadline && (
              <p className="text-xs text-danger mt-1">{errors.deadline.message}</p>
            )}
          </div>
        </div>
      </Card>

      {/* Description */}
      <Card padding="md">
        <div className="flex items-center gap-2 mb-4">
          <FileText className="w-4 h-4 text-brand-500" />
          <h2 className="text-sm font-semibold text-surface-800">Description</h2>
        </div>
        <Controller
          name="descriptionJson"
          control={control}
          render={({ field }) => (
            <RichTextEditor
              value={field.value as JsonValue}
              onChange={(json, text) => {
                field.onChange(json);
                setValue("descriptionText", text);
              }}
              disabled={isDisabled}
              error={errors.descriptionText?.message}
            />
          )}
        />
      </Card>

      {/* Technologies */}
      <Card padding="md">
        <div className="flex items-center gap-2 mb-4">
          <Cpu className="w-4 h-4 text-brand-500" />
          <h2 className="text-sm font-semibold text-surface-800">Recommended Technologies</h2>
        </div>
        <Controller
          name="technologies"
          control={control}
          render={({ field }) => (
            <TechnologiesInput
              value={field.value}
              onChange={field.onChange}
              error={errors.technologies?.message}
            />
          )}
        />
      </Card>

      {/* Submit */}
      <div className="flex items-center justify-end gap-3 pt-2">
        <Button
          type="button"
          variant="ghost"
          onClick={() => router.push(`/consultant/projects/${projectId}`)}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          isLoading={isSubmitting}
          disabled={isDisabled || !isDirty}
          title={
            isDisabled
              ? "Resolve the pending version before submitting new changes"
              : !isDirty
              ? "No changes made"
              : undefined
          }
        >
          Submit Changes
        </Button>
      </div>

    </form>
  );
}
