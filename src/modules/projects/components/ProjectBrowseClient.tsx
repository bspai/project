// src/modules/projects/components/ProjectBrowseClient.tsx
"use client";

import { useEffect } from "react";
import { ProjectCard } from "./ProjectCard";
import { ProjectSearchBar } from "./ProjectSearchBar";
import { EmptyState } from "@/modules/shared/components/EmptyState";
import { useProjectSearch } from "../hooks/useProjectSearch";
import { useTrackEvent } from "@/modules/shared/hooks/useTrackEvent";
import { Search } from "lucide-react";

interface BrowseProject {
  id: string;
  title: string;
  status: string;
  deadline: string;
  technologies: string[];
  creator: { id: string; name: string; avatar?: string | null };
  activeVersion: { descriptionText: string } | null;
  _count: { milestones: number; workRequests: number };
}

interface ProjectBrowseClientProps {
  projects: BrowseProject[];
  requestMap: Record<string, "PENDING" | "APPROVED" | "REJECTED">;
  assignedIds: string[];
}

export function ProjectBrowseClient({ projects, requestMap, assignedIds }: ProjectBrowseClientProps) {
  const { trackEvent } = useTrackEvent();
  const {
    search, setSearch,
    selectedTech, setSelectedTech,
    availableTechs,
    filtered,
    totalCount,
    resultCount,
  } = useProjectSearch(projects);

  useEffect(() => {
    if (!search) return;
    const t = setTimeout(() => {
      trackEvent({ action: "project_search", metadata: { query: search } });
    }, 800);
    return () => clearTimeout(t);
  }, [search, trackEvent]);

  const assignedSet = new Set(assignedIds);

  return (
    <div className="space-y-6">
      <ProjectSearchBar
        search={search}
        onSearchChange={setSearch}
        selectedTech={selectedTech}
        onTechChange={setSelectedTech}
        availableTechs={availableTechs}
        resultCount={resultCount}
        totalCount={totalCount}
      />

      {filtered.length === 0 ? (
        <EmptyState
          icon={<Search className="w-7 h-7" />}
          title="No projects found"
          description={
            search || selectedTech
              ? "Try adjusting your search or filters."
              : "There are no open projects available right now."
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              href={`/learner/projects/${project.id}`}
              requestStatus={requestMap[project.id] ?? null}
              isAssigned={assignedSet.has(project.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
