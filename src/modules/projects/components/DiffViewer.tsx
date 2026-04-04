// src/modules/projects/components/DiffViewer.tsx
"use client";

import { cn } from "@/modules/shared/utils";
import type { ProjectDiff, DiffSegment } from "@/lib/diff";

interface DiffViewerProps {
  diff: ProjectDiff;
  className?: string;
}

function SegmentedText({ segments }: { segments: DiffSegment[] }) {
  return (
    <span className="leading-relaxed">
      {segments.map((seg, i) => {
        if (seg.type === "equal") {
          return <span key={i}>{seg.text}</span>;
        }
        if (seg.type === "insert") {
          return (
            <mark
              key={i}
              className="bg-success/20 text-success-dark rounded px-0.5 not-italic font-normal"
            >
              {seg.text}
            </mark>
          );
        }
        // delete
        return (
          <del
            key={i}
            className="bg-danger/15 text-danger-dark rounded px-0.5 decoration-danger/60"
          >
            {seg.text}
          </del>
        );
      })}
    </span>
  );
}

function DiffSection({
  label,
  diff,
  multiline = false,
}: {
  label: string;
  diff: { changed: boolean; segments?: DiffSegment[]; oldValue?: string; newValue?: string };
  multiline?: boolean;
}) {
  if (!diff.changed) return null;

  return (
    <div className="border border-surface-200 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-surface-50 border-b border-surface-200">
        <span className="text-sm font-medium text-surface-700">{label}</span>
        <div className="flex items-center gap-3 text-xs">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-success/30 border border-success/40 inline-block" />
            <span className="text-success-dark">Added</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-danger/20 border border-danger/30 inline-block" />
            <span className="text-danger-dark">Removed</span>
          </span>
        </div>
      </div>

      {/* Body */}
      <div className={cn("px-4 py-3 bg-white text-sm", multiline && "whitespace-pre-wrap font-mono text-xs leading-6")}>
        {diff.segments ? (
          <SegmentedText segments={diff.segments} />
        ) : (
          <div className="space-y-1">
            <div>
              <del className="bg-danger/15 text-danger-dark rounded px-1 decoration-danger/60">
                {diff.oldValue}
              </del>
            </div>
            <div>
              <mark className="bg-success/20 text-success-dark rounded px-1 not-italic">
                {diff.newValue}
              </mark>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export function DiffViewer({ diff, className }: DiffViewerProps) {
  if (!diff.hasAnyChange) {
    return (
      <div className="text-sm text-surface-400 italic px-1">
        No changes detected.
      </div>
    );
  }

  return (
    <div className={cn("space-y-3", className)}>
      <DiffSection label="Title" diff={diff.title} />
      <DiffSection label="Deadline" diff={diff.deadline} />
      <DiffSection label="Technologies" diff={diff.technologies} />
      <DiffSection label="Description" diff={diff.description} multiline />
    </div>
  );
}
