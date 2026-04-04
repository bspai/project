import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useProjectSearch } from "../useProjectSearch";

const mockProjects = [
  { id: "1", title: "React Dashboard", technologies: ["React", "TypeScript"] },
  { id: "2", title: "Node API", technologies: ["Node.js", "Express"] },
  { id: "3", title: "Full Stack App", technologies: ["React", "Node.js", "PostgreSQL"] },
];

describe("useProjectSearch", () => {
  it("returns all projects initially", () => {
    const { result } = renderHook(() => useProjectSearch(mockProjects));
    expect(result.current.filtered).toHaveLength(3);
    expect(result.current.totalCount).toBe(3);
    expect(result.current.resultCount).toBe(3);
  });

  it("filters by title search", () => {
    const { result } = renderHook(() => useProjectSearch(mockProjects));
    act(() => result.current.setSearch("Dashboard"));
    expect(result.current.filtered).toHaveLength(1);
    expect(result.current.filtered[0].id).toBe("1");
  });

  it("filters by technology in search", () => {
    const { result } = renderHook(() => useProjectSearch(mockProjects));
    act(() => result.current.setSearch("Express"));
    expect(result.current.filtered).toHaveLength(1);
    expect(result.current.filtered[0].id).toBe("2");
  });

  it("filters by selected technology", () => {
    const { result } = renderHook(() => useProjectSearch(mockProjects));
    act(() => result.current.setSelectedTech("React"));
    expect(result.current.filtered).toHaveLength(2);
    expect(result.current.filtered.map((p) => p.id)).toEqual(["1", "3"]);
  });

  it("combines search + tech filter", () => {
    const { result } = renderHook(() => useProjectSearch(mockProjects));
    act(() => {
      result.current.setSearch("App");
      result.current.setSelectedTech("React");
    });
    expect(result.current.filtered).toHaveLength(1);
    expect(result.current.filtered[0].id).toBe("3");
  });

  it("extracts and sorts available technologies", () => {
    const { result } = renderHook(() => useProjectSearch(mockProjects));
    expect(result.current.availableTechs).toEqual([
      "Express", "Node.js", "PostgreSQL", "React", "TypeScript",
    ]);
  });

  it("search is case-insensitive", () => {
    const { result } = renderHook(() => useProjectSearch(mockProjects));
    act(() => result.current.setSearch("react"));
    expect(result.current.filtered).toHaveLength(2);
  });

  it("empty search returns all projects", () => {
    const { result } = renderHook(() => useProjectSearch(mockProjects));
    act(() => result.current.setSearch("Dashboard"));
    expect(result.current.filtered).toHaveLength(1);
    act(() => result.current.setSearch(""));
    expect(result.current.filtered).toHaveLength(3);
  });

  it("returns correct counts", () => {
    const { result } = renderHook(() => useProjectSearch(mockProjects));
    act(() => result.current.setSearch("Node"));
    expect(result.current.totalCount).toBe(3);
    expect(result.current.resultCount).toBe(2);
  });
});
