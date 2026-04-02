import { describe, it, expect } from "vitest";
import { diffText, diffProjectVersions } from "../index";

// ─── diffText() ──────────────────────────────────────
describe("diffText", () => {
  it("returns single equal segment for identical strings", () => {
    const result = diffText("hello", "hello");
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({ type: "equal", text: "hello" });
  });

  it("detects insertion", () => {
    const result = diffText("hello", "hello world");
    const insertSegments = result.filter((s) => s.type === "insert");
    expect(insertSegments.length).toBeGreaterThan(0);
    expect(insertSegments.some((s) => s.text.includes("world"))).toBe(true);
  });

  it("detects deletion", () => {
    const result = diffText("hello world", "hello");
    const deleteSegments = result.filter((s) => s.type === "delete");
    expect(deleteSegments.length).toBeGreaterThan(0);
    expect(deleteSegments.some((s) => s.text.includes("world"))).toBe(true);
  });

  it("detects replacement", () => {
    const result = diffText("cat", "dog");
    const types = result.map((s) => s.type);
    expect(types).toContain("delete");
    expect(types).toContain("insert");
  });

  it("handles empty strings", () => {
    const result = diffText("", "");
    // Either empty array or single equal with empty text
    expect(result.every((s) => s.type === "equal")).toBe(true);
  });

  it("handles one empty string (insertion from nothing)", () => {
    const result = diffText("", "new text");
    expect(result.some((s) => s.type === "insert" && s.text === "new text")).toBe(true);
  });
});

// ─── diffProjectVersions() ──────────────────────────
describe("diffProjectVersions", () => {
  const baseVersion = {
    descriptionText: "Original description",
    descriptionJson: { type: "doc", content: [] },
  };

  const baseMeta = {
    title: "My Project",
    deadline: new Date("2025-06-01"),
    technologies: ["React", "TypeScript"],
    milestones: [
      { title: "Milestone 1", deadline: new Date("2025-03-01") },
      { title: "Milestone 2", deadline: new Date("2025-04-01") },
    ],
  };

  it("reports no changes for identical versions", () => {
    const result = diffProjectVersions(baseVersion, baseVersion, baseMeta, baseMeta);
    expect(result.hasAnyChange).toBe(false);
    expect(result.title.changed).toBe(false);
    expect(result.description.changed).toBe(false);
    expect(result.deadline.changed).toBe(false);
    expect(result.technologies.changed).toBe(false);
    expect(result.milestones.changed).toBe(false);
  });

  it("detects title change", () => {
    const newMeta = { ...baseMeta, title: "Updated Project" };
    const result = diffProjectVersions(baseVersion, baseVersion, baseMeta, newMeta);
    expect(result.title.changed).toBe(true);
    expect(result.title.segments).toBeDefined();
    expect(result.hasAnyChange).toBe(true);
  });

  it("detects description change", () => {
    const newVersion = { ...baseVersion, descriptionText: "Updated description" };
    const result = diffProjectVersions(baseVersion, newVersion, baseMeta, baseMeta);
    expect(result.description.changed).toBe(true);
    expect(result.description.segments).toBeDefined();
  });

  it("detects deadline change", () => {
    const newMeta = { ...baseMeta, deadline: new Date("2025-12-01") };
    const result = diffProjectVersions(baseVersion, baseVersion, baseMeta, newMeta);
    expect(result.deadline.changed).toBe(true);
    expect(result.deadline.oldValue).toBeDefined();
    expect(result.deadline.newValue).toBeDefined();
  });

  it("detects technologies change", () => {
    const newMeta = { ...baseMeta, technologies: ["React", "TypeScript", "Node.js"] };
    const result = diffProjectVersions(baseVersion, baseVersion, baseMeta, newMeta);
    expect(result.technologies.changed).toBe(true);
    expect(result.technologies.segments).toBeDefined();
  });

  it("ignores technology order (sorted before comparison)", () => {
    const newMeta = { ...baseMeta, technologies: ["TypeScript", "React"] };
    const result = diffProjectVersions(baseVersion, baseVersion, baseMeta, newMeta);
    expect(result.technologies.changed).toBe(false);
  });

  it("detects milestones change", () => {
    const newMeta = {
      ...baseMeta,
      milestones: [
        { title: "New Milestone", deadline: new Date("2025-05-01") },
      ],
    };
    const result = diffProjectVersions(baseVersion, baseVersion, baseMeta, newMeta);
    expect(result.milestones.changed).toBe(true);
    expect(result.milestones.segments).toBeDefined();
  });

  it("sets hasAnyChange when at least one field changes", () => {
    const newMeta = { ...baseMeta, title: "Changed" };
    const result = diffProjectVersions(baseVersion, baseVersion, baseMeta, newMeta);
    expect(result.hasAnyChange).toBe(true);
  });

  it("handles string deadline inputs", () => {
    const metaWithStringDates = {
      ...baseMeta,
      deadline: "2025-06-01",
      milestones: [
        { title: "M1", deadline: "2025-03-01" },
      ],
    };
    // Should not throw
    const result = diffProjectVersions(baseVersion, baseVersion, metaWithStringDates, metaWithStringDates);
    expect(result.hasAnyChange).toBe(false);
  });
});
