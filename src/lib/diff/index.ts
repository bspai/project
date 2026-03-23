// src/lib/diff/index.ts
import { diff_match_patch, DIFF_DELETE, DIFF_INSERT, DIFF_EQUAL } from "diff-match-patch";

export interface DiffSegment {
  type: "equal" | "insert" | "delete";
  text: string;
}

export interface FieldDiff {
  changed: boolean;
  segments?: DiffSegment[];
  oldValue?: string;
  newValue?: string;
}

export interface ProjectDiff {
  title: FieldDiff;
  description: FieldDiff;
  technologies: FieldDiff;
  deadline: FieldDiff;
  milestones: FieldDiff;
  hasAnyChange: boolean;
}

const dmp = new diff_match_patch();

/**
 * Compute character-level diff between two text strings.
 * Returns an array of segments tagged as equal / insert / delete.
 */
export function diffText(oldText: string, newText: string): DiffSegment[] {
  const diffs = dmp.diff_main(oldText, newText);
  dmp.diff_cleanupSemantic(diffs);

  return diffs.map(([op, text]) => ({
    type: op === DIFF_INSERT ? "insert" : op === DIFF_DELETE ? "delete" : "equal",
    text,
  }));
}

/**
 * Compare two project versions and return a structured diff.
 */
export function diffProjectVersions(
  oldVersion: {
    descriptionText: string;
    descriptionJson: Record<string, unknown>;
  },
  newVersion: {
    descriptionText: string;
    descriptionJson: Record<string, unknown>;
  },
  oldMeta: {
    title: string;
    deadline: Date | string;
    technologies: string[];
    milestones: Array<{ title: string; deadline: Date | string }>;
  },
  newMeta: {
    title: string;
    deadline: Date | string;
    technologies: string[];
    milestones: Array<{ title: string; deadline: Date | string }>;
  }
): ProjectDiff {
  // Title diff
  const titleChanged = oldMeta.title !== newMeta.title;
  const titleDiff: FieldDiff = {
    changed: titleChanged,
    segments: titleChanged
      ? diffText(oldMeta.title, newMeta.title)
      : undefined,
    oldValue: oldMeta.title,
    newValue: newMeta.title,
  };

  // Description diff (text-level for display)
  const descChanged =
    oldVersion.descriptionText.trim() !== newVersion.descriptionText.trim();
  const descDiff: FieldDiff = {
    changed: descChanged,
    segments: descChanged
      ? diffText(oldVersion.descriptionText, newVersion.descriptionText)
      : undefined,
  };

  // Deadline diff
  const oldDeadline = new Date(oldMeta.deadline).toDateString();
  const newDeadline = new Date(newMeta.deadline).toDateString();
  const deadlineChanged = oldDeadline !== newDeadline;
  const deadlineDiff: FieldDiff = {
    changed: deadlineChanged,
    oldValue: oldDeadline,
    newValue: newDeadline,
  };

  // Technologies diff
  const oldTechStr = [...oldMeta.technologies].sort().join(", ");
  const newTechStr = [...newMeta.technologies].sort().join(", ");
  const techChanged = oldTechStr !== newTechStr;
  const techDiff: FieldDiff = {
    changed: techChanged,
    segments: techChanged ? diffText(oldTechStr, newTechStr) : undefined,
    oldValue: oldTechStr,
    newValue: newTechStr,
  };

  // Milestones diff (summary level)
  const oldMilestoneStr = oldMeta.milestones
    .map((m) => `${m.title} (${new Date(m.deadline).toDateString()})`)
    .join("\n");
  const newMilestoneStr = newMeta.milestones
    .map((m) => `${m.title} (${new Date(m.deadline).toDateString()})`)
    .join("\n");
  const milestonesChanged = oldMilestoneStr !== newMilestoneStr;
  const milestonesDiff: FieldDiff = {
    changed: milestonesChanged,
    segments: milestonesChanged
      ? diffText(oldMilestoneStr, newMilestoneStr)
      : undefined,
  };

  return {
    title: titleDiff,
    description: descDiff,
    technologies: techDiff,
    deadline: deadlineDiff,
    milestones: milestonesDiff,
    hasAnyChange:
      titleChanged ||
      descChanged ||
      deadlineChanged ||
      techChanged ||
      milestonesChanged,
  };
}
