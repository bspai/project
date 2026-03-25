// src/modules/projects/hooks/useProjectSearch.ts
"use client";

import { useState, useMemo } from "react";

interface SearchableProject {
  id: string;
  title: string;
  technologies: string[];
  [key: string]: unknown;
}

export function useProjectSearch<T extends SearchableProject>(projects: T[]) {
  const [search, setSearch] = useState("");
  const [selectedTech, setSelectedTech] = useState("");

  const availableTechs = useMemo(() => {
    const set = new Set<string>();
    for (const p of projects) {
      for (const t of p.technologies) set.add(t);
    }
    return Array.from(set).sort();
  }, [projects]);

  const filtered = useMemo(() => {
    let result = projects;

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          p.technologies.some((t) => t.toLowerCase().includes(q))
      );
    }

    if (selectedTech) {
      result = result.filter((p) =>
        p.technologies.some((t) => t.toLowerCase() === selectedTech.toLowerCase())
      );
    }

    return result;
  }, [projects, search, selectedTech]);

  return {
    search,
    setSearch,
    selectedTech,
    setSelectedTech,
    availableTechs,
    filtered,
    totalCount: projects.length,
    resultCount: filtered.length,
  };
}
