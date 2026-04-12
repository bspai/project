// src/app/(app)/admin/courses/ImportCourseForm.tsx
"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Upload, CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "@/modules/shared/components/Button";
import { Modal } from "@/modules/shared/components/Modal";

interface Mentor {
  id: string;
  name: string;
  email: string;
}

export function ImportCourseForm({ mentors }: { mentors: Mentor[] }) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);

  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [bundle, setBundle] = useState<Record<string, unknown> | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [mentorId, setMentorId] = useState(mentors[0]?.id ?? "");
  const [importAsStatus, setImportAsStatus] = useState<"DRAFT" | "PUBLISHED">("DRAFT");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ id: string; title: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null;
    setFile(f);
    setBundle(null);
    setParseError(null);
    setResult(null);
    setError(null);

    if (!f) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const parsed = JSON.parse(ev.target?.result as string);
        if (parsed.__version !== 1 || !parsed.course) {
          setParseError("This file doesn't look like a valid course export.");
          return;
        }
        setBundle(parsed);
      } catch {
        setParseError("Could not parse JSON file.");
      }
    };
    reader.readAsText(f);
  }

  async function handleImport() {
    if (!bundle || !mentorId) return;
    setLoading(true);
    setError(null);

    const res = await fetch("/api/admin/courses/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mentorId, bundle, importAsStatus }),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error ?? "Import failed.");
      return;
    }

    setResult(data);
    router.refresh();
  }

  function handleClose() {
    setOpen(false);
    setFile(null);
    setBundle(null);
    setParseError(null);
    setError(null);
    setResult(null);
    setMentorId(mentors[0]?.id ?? "");
    setImportAsStatus("DRAFT");
    if (fileRef.current) fileRef.current.value = "";
  }

  const courseData = bundle?.course as Record<string, unknown> | undefined;

  return (
    <>
      <Button
        leftIcon={<Upload className="w-4 h-4" />}
        variant="outline"
        onClick={() => setOpen(true)}
      >
        Import Course
      </Button>

      <Modal open={open} title="Import Course" onClose={handleClose}>
        <div className="space-y-5">
          {result ? (
            <div className="flex flex-col items-center gap-3 py-4 text-center">
              <CheckCircle2 className="w-10 h-10 text-success" />
              <p className="font-semibold text-surface-900">Course imported successfully!</p>
              <p className="text-sm text-surface-500">
                &ldquo;{result.title}&rdquo; has been created as{" "}
                <span className="font-medium">{importAsStatus === "DRAFT" ? "a draft" : "published"}</span>.
              </p>
              <Button onClick={handleClose}>Done</Button>
            </div>
          ) : (
            <>
              {/* File picker */}
              <div>
                <label className="text-xs font-medium text-surface-700 block mb-1.5">
                  Course export file <span className="text-danger">*</span>
                </label>
                <input
                  ref={fileRef}
                  type="file"
                  accept=".json,application/json"
                  onChange={handleFileChange}
                  className="block w-full text-sm text-surface-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-medium file:bg-brand-50 file:text-brand-700 hover:file:bg-brand-100 cursor-pointer"
                />
                {parseError && (
                  <p className="mt-1.5 text-xs text-danger flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {parseError}
                  </p>
                )}
              </div>

              {/* Preview */}
              {bundle && courseData && (
                <div className="rounded-xl border border-brand-200 bg-brand-50 px-4 py-3 space-y-1 text-sm">
                  <p className="font-semibold text-surface-900 truncate">
                    {String(courseData.title ?? "Untitled")}
                  </p>
                  {courseData.description ? (
                    <p className="text-surface-500 text-xs line-clamp-2">
                      {String(courseData.description)}
                    </p>
                  ) : null}
                  <p className="text-xs text-surface-400">
                    {(bundle.originalCreator as Record<string, string>)?.name
                      ? `Originally by ${(bundle.originalCreator as Record<string, string>).name}`
                      : null}
                    {" · "}
                    {Array.isArray((courseData.modules as unknown[])) ? (courseData.modules as unknown[]).length : 0} modules
                  </p>
                </div>
              )}

              {/* Assign mentor */}
              <div>
                <label className="text-xs font-medium text-surface-700 block mb-1.5">
                  Assign to mentor <span className="text-danger">*</span>
                </label>
                {mentors.length === 0 ? (
                  <p className="text-sm text-danger">No mentor users found. Invite a mentor first.</p>
                ) : (
                  <select
                    value={mentorId}
                    onChange={(e) => setMentorId(e.target.value)}
                    className="w-full h-9 px-3 rounded-lg border border-surface-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
                  >
                    {mentors.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name} ({m.email})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Import as status */}
              <div>
                <label className="text-xs font-medium text-surface-700 block mb-1.5">
                  Import as
                </label>
                <div className="flex gap-3">
                  {(["DRAFT", "PUBLISHED"] as const).map((s) => (
                    <label key={s} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="importAsStatus"
                        value={s}
                        checked={importAsStatus === s}
                        onChange={() => setImportAsStatus(s)}
                        className="accent-brand-600"
                      />
                      <span className="text-sm text-surface-700">
                        {s.charAt(0) + s.slice(1).toLowerCase()}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {error && (
                <p className="text-xs text-danger flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {error}
                </p>
              )}

              <div className="flex gap-3 justify-end pt-1">
                <Button variant="ghost" size="sm" onClick={handleClose} disabled={loading}>
                  Cancel
                </Button>
                <Button
                  size="sm"
                  isLoading={loading}
                  disabled={!bundle || !mentorId || mentors.length === 0}
                  onClick={handleImport}
                  leftIcon={<Upload className="w-3.5 h-3.5" />}
                >
                  Import
                </Button>
              </div>
            </>
          )}
        </div>
      </Modal>
    </>
  );
}
