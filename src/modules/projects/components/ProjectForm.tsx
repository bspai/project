// src/modules/projects/components/ProjectForm.tsx
"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { RichTextEditor } from "./RichTextEditor";
import { MilestonesBuilder } from "./MilestonesBuilder";
import { TechnologiesInput } from "./TechnologiesInput";
import { Button } from "@/modules/shared/components/Button";
import { Input } from "@/modules/shared/components/Input";
import { Card } from "@/modules/shared/components/Card";
import { useTrackEvent } from "@/modules/shared/hooks/useTrackEvent";
import type { ProjectFormValues } from "../types";
import { FileText, Flag, Cpu, Calendar, AlertCircle } from "lucide-react";
import { JsonValue } from "@prisma/client/runtime/library";

const milestoneSchema = z.object({
  id: z.string(),
  title: z.string().min(1, "Milestone title is required"),
  deadline: z.string().min(1, "Milestone deadline is required"),
  phaseNumber: z.number().default(1),
});

const schema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters"),
  deadline: z.string().min(1, "Deadline is required"),
  technologies: z.array(z.string()).min(1, "Add at least one technology"),
  milestones: z.array(milestoneSchema),
  descriptionJson: z.record(z.unknown()),
  descriptionText: z.string().min(10, "Description must be at least 10 characters"),
});

interface ProjectFormProps {
  defaultValues?: Partial<ProjectFormValues>;
  projectId?: string; // if editing
  mode?: "create" | "edit";
}

export function ProjectForm({
  defaultValues,
  projectId,
  mode = "create",
}: ProjectFormProps) {
  const router = useRouter();
  const { trackEvent } = useTrackEvent();
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<ProjectFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: defaultValues?.title ?? "",
      deadline: defaultValues?.deadline ?? "",
      technologies: defaultValues?.technologies ?? [],
      milestones: defaultValues?.milestones ?? [],
      descriptionJson: defaultValues?.descriptionJson ?? {},
      descriptionText: defaultValues?.descriptionText ?? "",
    },
  });

  const deadline = watch("deadline");

  const onSubmit = useCallback(
    async (values: ProjectFormValues) => {
      setSubmitError(null);
      try {
        const url = mode === "edit" ? `/api/projects/${projectId}` : "/api/projects";
        const method = mode === "edit" ? "PUT" : "POST";

        const res = await fetch(url, {
          method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(values),
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error ?? "Failed to save project");
        }

        const data = await res.json();

        trackEvent({
          action: mode === "create" ? "project_created" : "project_updated",
          entity: "project",
          entityId: data.id,
          metadata: { title: values.title, milestoneCount: values.milestones.length },
        });

        router.push(`/consultant/projects/${data.id}`);
        router.refresh();
      } catch (err) {
        setSubmitError(err instanceof Error ? err.message : "Something went wrong");
      }
    },
    [mode, projectId, router, trackEvent]
  );

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {submitError && (
        <div className="flex items-start gap-3 bg-danger/10 border border-danger/20 text-danger rounded-xl px-4 py-3">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <p className="text-sm">{submitError}</p>
        </div>
      )}

      {/* Project Title */}
      <Card padding="md">
        <div className="flex items-center gap-2 mb-4">
          <FileText className="w-4 h-4 text-brand-500" />
          <h2 className="text-sm font-semibold text-surface-800">Project Details</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <Input
              label="Project Title"
              placeholder="e.g. E-Commerce Platform with Recommendation Engine"
              required
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
                min={new Date().toISOString().slice(0, 10)}
                className="w-full h-10 pl-10 pr-3 rounded-lg border border-surface-200 hover:border-surface-300 text-sm text-surface-900 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent bg-white"
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

      {/* Milestones */}
      <Card padding="md">
        <div className="flex items-center gap-2 mb-4">
          <Flag className="w-4 h-4 text-brand-500" />
          <h2 className="text-sm font-semibold text-surface-800">Milestones</h2>
          <span className="text-xs text-surface-400 ml-1">(optional)</span>
        </div>
        <Controller
          name="milestones"
          control={control}
          render={({ field }) => (
            <MilestonesBuilder
              value={field.value}
              onChange={field.onChange}
              projectDeadline={deadline}
              error={
                errors.milestones
                  ? "One or more milestones have missing fields"
                  : undefined
              }
            />
          )}
        />
      </Card>

      {/* Submit */}
      <div className="flex items-center justify-end gap-3 pt-2">
        <Button
          type="button"
          variant="ghost"
          onClick={() => router.back()}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
        <Button type="submit" isLoading={isSubmitting}>
          {mode === "create" ? "Submit Project" : "Save Changes"}
        </Button>
      </div>
    </form>
  );
}
