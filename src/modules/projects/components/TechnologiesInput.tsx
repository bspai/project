// src/modules/projects/components/TechnologiesInput.tsx
"use client";

import { useState, useRef, KeyboardEvent } from "react";
import { X, Plus } from "lucide-react";
import { cn } from "@/modules/shared/utils";

const SUGGESTIONS = [
  "React", "Next.js", "Vue.js", "Angular", "Svelte",
  "Node.js", "Express", "NestJS", "FastAPI", "Django", "Flask", "Spring Boot",
  "PostgreSQL", "MySQL", "MongoDB", "Redis", "SQLite",
  "TypeScript", "JavaScript", "Python", "Java", "Go", "Rust",
  "Docker", "Kubernetes", "AWS", "GCP", "Azure",
  "TailwindCSS", "GraphQL", "REST API", "WebSockets",
  "TensorFlow", "PyTorch", "scikit-learn",
];

interface TechnologiesInputProps {
  value: string[];
  onChange: (technologies: string[]) => void;
  error?: string;
}

export function TechnologiesInput({ value, onChange, error }: TechnologiesInputProps) {
  const [inputValue, setInputValue] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const filteredSuggestions = SUGGESTIONS.filter(
    (s) =>
      s.toLowerCase().includes(inputValue.toLowerCase()) &&
      !value.includes(s)
  ).slice(0, 6);

  const addTechnology = (tech: string) => {
    const trimmed = tech.trim();
    if (trimmed && !value.includes(trimmed)) {
      onChange([...value, trimmed]);
    }
    setInputValue("");
    setShowSuggestions(false);
    inputRef.current?.focus();
  };

  const removeTechnology = (tech: string) => {
    onChange(value.filter((t) => t !== tech));
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if ((e.key === "Enter" || e.key === ",") && inputValue.trim()) {
      e.preventDefault();
      addTechnology(inputValue);
    }
    if (e.key === "Backspace" && !inputValue && value.length > 0) {
      removeTechnology(value[value.length - 1]);
    }
    if (e.key === "Escape") {
      setShowSuggestions(false);
    }
  };

  return (
    <div className="space-y-2">
      <div
        className={cn(
          "relative flex flex-wrap gap-2 p-2 rounded-xl border bg-white min-h-[44px]",
          "focus-within:ring-2 focus-within:ring-brand-500 focus-within:border-transparent",
          "transition-colors cursor-text",
          error ? "border-danger" : "border-surface-200 hover:border-surface-300"
        )}
        onClick={() => inputRef.current?.focus()}
      >
        {/* Tags */}
        {value.map((tech) => (
          <span
            key={tech}
            className="inline-flex items-center gap-1 px-2.5 py-1 bg-brand-50 text-brand-700 border border-brand-200 rounded-lg text-sm font-medium"
          >
            {tech}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                removeTechnology(tech);
              }}
              className="text-brand-400 hover:text-brand-700 transition-colors"
            >
              <X className="w-3 h-3" />
            </button>
          </span>
        ))}

        {/* Input */}
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={(e) => {
            setInputValue(e.target.value);
            setShowSuggestions(e.target.value.length > 0);
          }}
          onFocus={() => setShowSuggestions(inputValue.length > 0)}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
          onKeyDown={handleKeyDown}
          placeholder={value.length === 0 ? "Type a technology and press Enter…" : "Add more…"}
          className="flex-1 min-w-[140px] h-7 text-sm bg-transparent outline-none placeholder:text-surface-400 text-surface-900"
        />

        {/* Dropdown */}
        {showSuggestions && filteredSuggestions.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-1.5 bg-white border border-surface-200 rounded-xl shadow-panel z-20 py-1">
            {filteredSuggestions.map((s) => (
              <button
                key={s}
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  addTechnology(s);
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-surface-700 hover:bg-brand-50 hover:text-brand-700 transition-colors text-left"
              >
                <Plus className="w-3 h-3 text-surface-400" />
                {s}
              </button>
            ))}
          </div>
        )}
      </div>

      <p className="text-xs text-surface-400">
        Press <kbd className="px-1.5 py-0.5 bg-surface-100 rounded text-surface-600 font-mono">Enter</kbd> or{" "}
        <kbd className="px-1.5 py-0.5 bg-surface-100 rounded text-surface-600 font-mono">,</kbd> to add.
        Backspace to remove the last tag.
      </p>

      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  );
}
