// src/modules/shared/utils/index.ts
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, formatDistanceToNow } from "date-fns";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: Date | string): string {
  return format(new Date(date), "dd MMM yyyy");
}

export function formatDateTime(date: Date | string): string {
  return format(new Date(date), "dd MMM yyyy, h:mm a");
}

export function formatRelative(date: Date | string): string {
  return formatDistanceToNow(new Date(date), { addSuffix: true });
}

export function formatDeadline(date: Date | string): string {
  const d = new Date(date);
  const now = new Date();
  const diff = d.getTime() - now.getTime();
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24));

  if (days < 0) return `${Math.abs(days)}d overdue`;
  if (days === 0) return "Due today";
  if (days === 1) return "Due tomorrow";
  return `${days}d remaining`;
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

export function truncate(text: string, length: number): string {
  if (text.length <= length) return text;
  return text.slice(0, length) + "…";
}

export function roleLabel(role: string): string {
  const map: Record<string, string> = {
    CONSULTANT: "Consultant",
    LEARNER: "Learner",
    ADMIN: "Admin",
    MENTOR: "Mentor",
  };
  return map[role] ?? role;
}

export function statusLabel(status: string): string {
  const map: Record<string, string> = {
    OPEN: "Open",
    IN_PROGRESS: "In Progress",
    ON_HOLD: "On Hold",
    DONE: "Done",
    ARCHIVED: "Archived",
  };
  return map[status] ?? status;
}

export function statusColor(status: string): string {
  const map: Record<string, string> = {
    OPEN: "bg-info/10 text-info border-info/20",
    IN_PROGRESS: "bg-warning/10 text-warning-dark border-warning/20",
    ON_HOLD: "bg-surface-200 text-surface-600 border-surface-300",
    DONE: "bg-success/10 text-success-dark border-success/20",
    ARCHIVED: "bg-surface-100 text-surface-500 border-surface-200",
  };
  return map[status] ?? "bg-surface-100 text-surface-500";
}
