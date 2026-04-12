// src/modules/shared/components/StarRating.tsx
"use client";

import { useState } from "react";
import { Star } from "lucide-react";

interface StarRatingProps {
  /** Current value (1–5). Pass 0 or undefined for no selection. */
  value?: number;
  /** If true, renders as a display-only widget (no hover/click) */
  readOnly?: boolean;
  size?: "sm" | "md" | "lg";
  onChange?: (value: number) => void;
}

const SIZE_CLASS = {
  sm: "w-3.5 h-3.5",
  md: "w-5 h-5",
  lg: "w-6 h-6",
};

export function StarRating({ value = 0, readOnly = false, size = "md", onChange }: StarRatingProps) {
  const [hovered, setHovered] = useState(0);

  const active = readOnly ? value : (hovered || value);

  return (
    <div
      className={`flex items-center gap-0.5 ${readOnly ? "" : "cursor-pointer"}`}
      onMouseLeave={() => !readOnly && setHovered(0)}
    >
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={readOnly}
          onClick={() => !readOnly && onChange?.(star)}
          onMouseEnter={() => !readOnly && setHovered(star)}
          className={`transition-colors focus:outline-none ${readOnly ? "cursor-default" : "hover:scale-110 transition-transform"}`}
          aria-label={readOnly ? undefined : `Rate ${star} star${star !== 1 ? "s" : ""}`}
        >
          <Star
            className={`${SIZE_CLASS[size]} ${
              star <= active
                ? "fill-amber-400 text-amber-400"
                : "fill-surface-200 text-surface-200"
            }`}
          />
        </button>
      ))}
    </div>
  );
}

/** Compact inline display: e.g. ★ 4.3 (12) */
export function StarDisplay({
  avg,
  count,
  size = "sm",
}: {
  avg: number | null;
  count: number;
  size?: "sm" | "md";
}) {
  if (!avg || count === 0) return null;

  return (
    <span className="flex items-center gap-1 text-amber-500">
      <Star className={`${SIZE_CLASS[size]} fill-amber-400 text-amber-400`} />
      <span className={`font-semibold ${size === "sm" ? "text-xs" : "text-sm"}`}>{avg.toFixed(1)}</span>
      <span className={`text-surface-400 ${size === "sm" ? "text-xs" : "text-sm"}`}>({count})</span>
    </span>
  );
}
