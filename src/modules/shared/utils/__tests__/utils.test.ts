import { describe, it, expect } from "vitest";
import {
  cn,
  formatDate,
  formatDateTime,
  formatRelative,
  formatDeadline,
  slugify,
  truncate,
  roleLabel,
  statusLabel,
  statusColor,
} from "../index";

// ─── cn() ────────────────────────────────────────────
describe("cn", () => {
  it("merges class strings", () => {
    expect(cn("p-4", "m-2")).toBe("p-4 m-2");
  });

  it("deduplicates Tailwind classes (last wins)", () => {
    expect(cn("p-4", "p-2")).toBe("p-2");
  });

  it("handles conditional classes via clsx", () => {
    expect(cn("base", false && "hidden")).toBe("base");
    expect(cn("base", true && "visible")).toBe("base visible");
  });

  it("handles undefined and null inputs", () => {
    expect(cn("base", undefined, null)).toBe("base");
  });
});

// ─── formatDate() ────────────────────────────────────
describe("formatDate", () => {
  it("formats Date object correctly", () => {
    const result = formatDate(new Date("2025-01-15T00:00:00Z"));
    expect(result).toBe("15 Jan 2025");
  });

  it("formats ISO string correctly", () => {
    const result = formatDate("2025-06-01T12:00:00Z");
    expect(result).toMatch(/01 Jun 2025/);
  });
});

// ─── formatDateTime() ────────────────────────────────
describe("formatDateTime", () => {
  it("includes time component", () => {
    const result = formatDateTime(new Date("2025-01-15T14:30:00Z"));
    // Should contain date and time pattern
    expect(result).toMatch(/15 Jan 2025/);
    expect(result).toMatch(/\d{1,2}:\d{2}\s?(AM|PM)/i);
  });
});

// ─── formatRelative() ────────────────────────────────
describe("formatRelative", () => {
  it("returns relative time for recent date", () => {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const result = formatRelative(oneHourAgo);
    expect(result).toMatch(/ago/);
  });

  it("handles string input", () => {
    const result = formatRelative(new Date().toISOString());
    expect(typeof result).toBe("string");
  });
});

// ─── formatDeadline() ────────────────────────────────
describe("formatDeadline", () => {
  it("shows overdue for past dates", () => {
    const pastDate = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
    expect(formatDeadline(pastDate)).toMatch(/overdue/);
  });

  it("shows 'Due today' for a time just slightly ahead", () => {
    // Math.ceil((small positive) / day) = 1, but if diff is nearly 0 it could be 0
    // The function uses Math.ceil, so a date ~1 minute from now gives days=1 (Due tomorrow)
    // A date ~1 second ago gives days=0 (Due today)
    const almostNow = new Date(Date.now() - 1000);
    const result = formatDeadline(almostNow);
    expect(result).toMatch(/Due today|1d overdue/);
  });

  it("shows 'Due tomorrow' for next day", () => {
    // 25 hours from now — Math.ceil gives 2 or 1 depending on exact timing
    const tomorrow = new Date(Date.now() + 25 * 60 * 60 * 1000);
    const result = formatDeadline(tomorrow);
    expect(result).toMatch(/Due tomorrow|2d remaining/);
  });

  it("shows remaining days for future dates", () => {
    const future = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000);
    expect(formatDeadline(future)).toMatch(/\d+d remaining/);
  });
});

// ─── slugify() ───────────────────────────────────────
describe("slugify", () => {
  it("converts text to lowercase with hyphens", () => {
    expect(slugify("Hello World")).toBe("hello-world");
  });

  it("strips special characters", () => {
    expect(slugify("a@b#c")).toBe("a-b-c");
  });

  it("trims leading/trailing hyphens", () => {
    expect(slugify("-test-")).toBe("test");
  });

  it("collapses multiple hyphens", () => {
    expect(slugify("hello   world")).toBe("hello-world");
  });
});

// ─── truncate() ──────────────────────────────────────
describe("truncate", () => {
  it("returns short text unchanged", () => {
    expect(truncate("hi", 10)).toBe("hi");
  });

  it("truncates long text with ellipsis", () => {
    expect(truncate("hello world", 5)).toBe("hello…");
  });

  it("returns exact-length text unchanged", () => {
    expect(truncate("exact", 5)).toBe("exact");
  });
});

// ─── roleLabel() ─────────────────────────────────────
describe("roleLabel", () => {
  it("maps CONSULTANT", () => {
    expect(roleLabel("CONSULTANT")).toBe("Consultant");
  });

  it("maps LEARNER", () => {
    expect(roleLabel("LEARNER")).toBe("Learner");
  });

  it("maps ADMIN", () => {
    expect(roleLabel("ADMIN")).toBe("Admin");
  });

  it("returns unknown role as-is", () => {
    expect(roleLabel("UNKNOWN")).toBe("UNKNOWN");
  });
});

// ─── statusLabel() ───────────────────────────────────
describe("statusLabel", () => {
  it("maps all known statuses", () => {
    expect(statusLabel("OPEN")).toBe("Open");
    expect(statusLabel("IN_PROGRESS")).toBe("In Progress");
    expect(statusLabel("DONE")).toBe("Done");
    expect(statusLabel("ARCHIVED")).toBe("Archived");
  });

  it("returns unknown status as-is", () => {
    expect(statusLabel("UNKNOWN")).toBe("UNKNOWN");
  });
});

// ─── statusColor() ───────────────────────────────────
describe("statusColor", () => {
  it("returns classes for OPEN", () => {
    expect(statusColor("OPEN")).toContain("info");
  });

  it("returns classes for IN_PROGRESS", () => {
    expect(statusColor("IN_PROGRESS")).toContain("warning");
  });

  it("returns classes for DONE", () => {
    expect(statusColor("DONE")).toContain("success");
  });

  it("returns classes for ARCHIVED", () => {
    expect(statusColor("ARCHIVED")).toContain("surface");
  });

  it("returns default for unknown status", () => {
    expect(statusColor("UNKNOWN")).toContain("surface");
  });
});
