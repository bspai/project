// src/modules/projects/components/ProjectSearchBar.tsx
"use client";

import { Search, X, SlidersHorizontal } from "lucide-react";
import { cn } from "@/modules/shared/utils";

interface ProjectSearchBarProps {
  search: string;
  onSearchChange: (v: string) => void;
  selectedTech: string;
  onTechChange: (v: string) => void;
  availableTechs: string[];
  resultCount: number;
  totalCount: number;
}

export function ProjectSearchBar({
  search,
  onSearchChange,
  selectedTech,
  onTechChange,
  availableTechs,
  resultCount,
  totalCount,
}: ProjectSearchBarProps) {
  const hasFilters = search.length > 0 || selectedTech.length > 0;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search projects by title or technology…"
            className={cn(
              "w-full h-10 pl-10 pr-10 rounded-xl border text-sm bg-white",
              "placeholder:text-surface-400 text-surface-900",
              "focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent",
              "border-surface-200 hover:border-surface-300 transition-colors"
            )}
          />
          {search && (
            <button
              onClick={() => onSearchChange("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-400 hover:text-surface-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        {hasFilters && (
          <button
            onClick={() => { onSearchChange(""); onTechChange(""); }}
            className="flex items-center gap-1.5 text-sm text-surface-500 hover:text-surface-800 transition-colors shrink-0"
          >
            <X className="w-4 h-4" />
            Clear
          </button>
        )}
      </div>

      {availableTechs.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 text-xs text-surface-400 shrink-0">
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Filter:</span>
          </div>
          {availableTechs.map((tech) => (
            <button
              key={tech}
              onClick={() => onTechChange(selectedTech === tech ? "" : tech)}
              className={cn(
                "px-2.5 py-1 rounded-lg text-xs font-medium border transition-all",
                selectedTech === tech
                  ? "bg-brand-600 text-white border-brand-600"
                  : "bg-white text-surface-600 border-surface-200 hover:border-brand-300 hover:text-brand-600"
              )}
            >
              {tech}
            </button>
          ))}
        </div>
      )}

      <p className="text-xs text-surface-400">
        {hasFilters ? (
          <>
            Showing <span className="font-medium text-surface-600">{resultCount}</span> of{" "}
            <span className="font-medium text-surface-600">{totalCount}</span> projects
          </>
        ) : (
          <>
            <span className="font-medium text-surface-600">{totalCount}</span> open project
            {totalCount !== 1 ? "s" : ""} available
          </>
        )}
      </p>
    </div>
  );
}
