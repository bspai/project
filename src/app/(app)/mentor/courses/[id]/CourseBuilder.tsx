// src/app/(app)/mentor/courses/[id]/CourseBuilder.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  GraduationCap, Plus, Trash2, ChevronDown, ChevronRight,
  BookOpen, FileText, Video, Headphones, Image, Globe,
  Upload, Edit3, Check, X, Users, Eye, EyeOff, Star,
} from "lucide-react";
import { StarRating, StarDisplay } from "@/modules/shared/components/StarRating";
import { Button } from "@/modules/shared/components/Button";
import { Badge } from "@/modules/shared/components/Badge";
import { Card } from "@/modules/shared/components/Card";
import { Modal } from "@/modules/shared/components/Modal";
import { ContentBlockType } from "@prisma/client";
import { formatDate } from "@/modules/shared/utils";

// ─── Types ───────────────────────────────────────────────────────────────────

interface Block {
  id: string;
  type: ContentBlockType;
  title: string | null;
  payload: unknown;
  order: number;
}

interface Lesson {
  id: string;
  title: string;
  duration: number | null;
  order: number;
  blocks: Block[];
}

interface Module {
  id: string;
  title: string;
  order: number;
  lessons: Lesson[];
}

interface ReviewAuthor {
  id: string;
  name: string;
  avatar: string | null;
}

interface Review {
  id: string;
  rating: number;
  body: string | null;
  createdAt: Date;
  learner: ReviewAuthor;
}

interface Course {
  id: string;
  title: string;
  description: string | null;
  coverImage: string | null;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  isOpen: boolean;
  updatedAt: Date;
  modules: Module[];
  reviews: Review[];
  _count: { enrollments: number };
}

// ─── Block type icons ─────────────────────────────────────────────────────────

const BLOCK_ICONS: Record<ContentBlockType, React.ReactNode> = {
  TEXT:         <FileText className="w-4 h-4" />,
  VIDEO_URL:    <Video className="w-4 h-4" />,
  VIDEO_UPLOAD: <Video className="w-4 h-4" />,
  AUDIO_URL:    <Headphones className="w-4 h-4" />,
  AUDIO_UPLOAD: <Headphones className="w-4 h-4" />,
  IMAGE_URL:    <Image className="w-4 h-4" />,
  IMAGE_UPLOAD: <Image className="w-4 h-4" />,
  IFRAME:       <Globe className="w-4 h-4" />,
};

const BLOCK_LABELS: Record<ContentBlockType, string> = {
  TEXT:         "Text",
  VIDEO_URL:    "Video (URL)",
  VIDEO_UPLOAD: "Video (Upload)",
  AUDIO_URL:    "Audio (URL)",
  AUDIO_UPLOAD: "Audio (Upload)",
  IMAGE_URL:    "Image (URL)",
  IMAGE_UPLOAD: "Image (Upload)",
  IFRAME:       "Embed (iframe)",
};

// ─── Inline edit field ────────────────────────────────────────────────────────

function InlineEdit({
  value,
  onSave,
  className = "",
  placeholder = "Untitled",
}: {
  value: string;
  onSave: (val: string) => Promise<void>;
  className?: string;
  placeholder?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!draft.trim() || draft === value) { setEditing(false); setDraft(value); return; }
    setSaving(true);
    await onSave(draft.trim());
    setSaving(false);
    setEditing(false);
  }

  if (editing) {
    return (
      <span className="flex items-center gap-1">
        <input
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") save(); if (e.key === "Escape") { setEditing(false); setDraft(value); } }}
          className="h-7 px-2 rounded border border-brand-400 text-sm focus:outline-none bg-white"
          style={{ minWidth: 120 }}
          disabled={saving}
        />
        <button onClick={save} disabled={saving} className="text-success hover:text-success-dark"><Check className="w-4 h-4" /></button>
        <button onClick={() => { setEditing(false); setDraft(value); }} className="text-surface-400 hover:text-surface-600"><X className="w-4 h-4" /></button>
      </span>
    );
  }

  return (
    <span
      className={`group flex items-center gap-1 cursor-pointer hover:text-brand-600 transition-colors ${className}`}
      onClick={() => setEditing(true)}
    >
      {value || <span className="text-surface-400 italic">{placeholder}</span>}
      <Edit3 className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity text-surface-400" />
    </span>
  );
}

// ─── Add block modal ──────────────────────────────────────────────────────────

const BLOCK_TYPES: ContentBlockType[] = [
  "TEXT", "IFRAME", "VIDEO_URL", "VIDEO_UPLOAD", "AUDIO_URL", "AUDIO_UPLOAD", "IMAGE_URL", "IMAGE_UPLOAD",
];

function AddBlockModal({
  courseId, moduleId, lessonId,
  onAdded, onClose,
}: {
  courseId: string; moduleId: string; lessonId: string;
  onAdded: (block: Block) => void;
  onClose: () => void;
}) {
  const [type, setType] = useState<ContentBlockType>("TEXT");
  const [blockTitle, setBlockTitle] = useState("");
  const [textContent, setTextContent] = useState("");
  const [url, setUrl] = useState("");
  const [embedCode, setEmbedCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isText = type === "TEXT";
  const isUrl = type.endsWith("_URL");
  const isIframe = type === "IFRAME";

  function extractSrc(code: string): string {
    const match = code.match(/src=["']([^"']+)["']/i);
    return match ? match[1] : code.trim(); // fallback: treat raw input as src
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const payload: Record<string, unknown> = isText
        ? { text: textContent }
        : isIframe
        ? { src: extractSrc(embedCode) }
        : { url };
      const requestBody = { type, title: blockTitle || undefined, payload };
      console.log("Sending block create:", JSON.stringify(requestBody, null, 2));
      const res = await fetch(
        `/api/courses/${courseId}/modules/${moduleId}/lessons/${lessonId}/blocks`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(requestBody),
        }
      );
      const data = await res.json();
      if (!res.ok) {
        console.error("Block create failed:", JSON.stringify(data, null, 2));
        throw new Error(data.error ?? "Failed to add block");
      }
      onAdded(data);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal open title="Add Content Block" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-surface-700">Block Type</label>
          <div className="grid grid-cols-2 gap-2">
            {BLOCK_TYPES.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setType(t)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm border transition-all ${
                  type === t
                    ? "border-brand-500 bg-brand-50 text-brand-700 font-medium"
                    : "border-surface-200 text-surface-700 hover:bg-surface-50"
                }`}
              >
                {BLOCK_ICONS[t]}
                {BLOCK_LABELS[t]}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-surface-700">Block Title (optional)</label>
          <input
            type="text"
            value={blockTitle}
            onChange={(e) => setBlockTitle(e.target.value)}
            placeholder="e.g. Introduction Video"
            className="w-full h-9 px-3 rounded-lg border border-surface-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>

        {isText ? (
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-surface-700">Content <span className="text-danger">*</span></label>
            <textarea
              value={textContent}
              onChange={(e) => setTextContent(e.target.value)}
              rows={6}
              required
              placeholder="Enter the text content..."
              className="w-full px-3 py-2 rounded-lg border border-surface-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
            />
          </div>
        ) : isIframe ? (
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-surface-700">
              Embed Code <span className="text-danger">*</span>
            </label>
            <textarea
              value={embedCode}
              onChange={(e) => setEmbedCode(e.target.value)}
              rows={4}
              required
              placeholder={`Paste the full <iframe ...> embed code from YouTube, Vimeo, etc.`}
              className="w-full px-3 py-2 rounded-lg border border-surface-200 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
            />
            <p className="text-xs text-surface-400">
              On YouTube: Share → Embed → copy the &lt;iframe&gt; code
            </p>
          </div>
        ) : isUrl ? (
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-surface-700">
              {BLOCK_LABELS[type]} URL <span className="text-danger">*</span>
            </label>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              required
              placeholder="https://..."
              className="w-full h-9 px-3 rounded-lg border border-surface-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
        ) : (
          <div className="p-4 bg-surface-50 rounded-lg text-sm text-surface-500 flex items-center gap-2">
            <Upload className="w-4 h-4 shrink-0" />
            File upload integration coming soon. Use the URL option for now.
          </div>
        )}

        {error && <p className="text-xs text-danger">{error}</p>}

        <div className="flex gap-3 justify-end pt-1">
          <Button type="button" variant="ghost" size="sm" onClick={onClose} disabled={loading}>Cancel</Button>
          <Button type="submit" size="sm" isLoading={loading}
            disabled={isText ? !textContent : isIframe ? !embedCode : !isUrl}>
            Add Block
          </Button>
        </div>
      </form>
    </Modal>
  );
}

// ─── Edit block modal ─────────────────────────────────────────────────────────

function EditBlockModal({
  courseId, moduleId, lessonId, block,
  onSaved, onClose,
}: {
  courseId: string; moduleId: string; lessonId: string; block: Block;
  onSaved: (updated: Block) => void;
  onClose: () => void;
}) {
  const payload = (block.payload ?? {}) as Record<string, unknown>;
  const isText = block.type === "TEXT";
  const isUrl = block.type.endsWith("_URL");
  const isIframe = block.type === "IFRAME";

  const [blockTitle, setBlockTitle] = useState(block.title ?? "");
  const [textContent, setTextContent] = useState(isText ? String(payload.text ?? "") : "");
  const [url, setUrl] = useState(isUrl ? String(payload.url ?? "") : "");
  const [embedSrc, setEmbedSrc] = useState(isIframe ? String(payload.src ?? "") : "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const newPayload: Record<string, unknown> = isText
        ? { text: textContent }
        : isIframe
        ? { src: embedSrc }
        : { url };
      const res = await fetch(
        `/api/courses/${courseId}/modules/${moduleId}/lessons/${lessonId}/blocks/${block.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: blockTitle || null, payload: newPayload }),
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to save block");
      onSaved(data);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal open title={`Edit — ${BLOCK_LABELS[block.type]}`} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-surface-700">Block Title (optional)</label>
          <input
            type="text"
            value={blockTitle}
            onChange={(e) => setBlockTitle(e.target.value)}
            placeholder="e.g. Introduction Video"
            className="w-full h-9 px-3 rounded-lg border border-surface-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>

        {isText ? (
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-surface-700">Content <span className="text-danger">*</span></label>
            <textarea
              value={textContent}
              onChange={(e) => setTextContent(e.target.value)}
              rows={8}
              required
              className="w-full px-3 py-2 rounded-lg border border-surface-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
            />
          </div>
        ) : isIframe ? (
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-surface-700">Embed Code <span className="text-danger">*</span></label>
            <textarea
              value={embedSrc}
              onChange={(e) => setEmbedSrc(e.target.value)}
              rows={4}
              required
              placeholder={`Paste the <iframe> embed code from YouTube, Vimeo, etc.`}
              className="w-full px-3 py-2 rounded-lg border border-surface-200 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
            />
            <p className="text-xs text-surface-400">YouTube: Share → Embed → copy the &lt;iframe&gt; code</p>
          </div>
        ) : isUrl ? (
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-surface-700">
              {BLOCK_LABELS[block.type]} URL <span className="text-danger">*</span>
            </label>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              required
              placeholder="https://..."
              className="w-full h-9 px-3 rounded-lg border border-surface-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
        ) : (
          <div className="p-4 bg-surface-50 rounded-lg text-sm text-surface-500 flex items-center gap-2">
            <Upload className="w-4 h-4 shrink-0" />
            File upload not yet supported. Use a URL block type instead.
          </div>
        )}

        {error && <p className="text-xs text-danger">{error}</p>}

        <div className="flex gap-3 justify-end pt-1">
          <Button type="button" variant="ghost" size="sm" onClick={onClose} disabled={loading}>Cancel</Button>
          <Button type="submit" size="sm" isLoading={loading}
            disabled={isText ? !textContent : isIframe ? !embedSrc : isUrl ? !url : true}>
            Save Changes
          </Button>
        </div>
      </form>
    </Modal>
  );
}

// ─── Lesson row ───────────────────────────────────────────────────────────────

function LessonRow({
  lesson, courseId, moduleId,
  onUpdate, onDelete,
}: {
  lesson: Lesson; courseId: string; moduleId: string;
  onUpdate: (updated: Lesson) => void;
  onDelete: (lessonId: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [addingBlock, setAddingBlock] = useState(false);
  const [editingBlock, setEditingBlock] = useState<Block | null>(null);
  const [blocks, setBlocks] = useState<Block[]>(lesson.blocks);
  const [deletingBlock, setDeletingBlock] = useState<string | null>(null);

  async function saveTitle(title: string) {
    await fetch(`/api/courses/${courseId}/modules/${moduleId}/lessons/${lesson.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title }),
    });
    onUpdate({ ...lesson, title });
  }

  async function deleteLesson() {
    if (!confirm(`Delete lesson "${lesson.title}"? This cannot be undone.`)) return;
    await fetch(`/api/courses/${courseId}/modules/${moduleId}/lessons/${lesson.id}`, {
      method: "DELETE",
    });
    onDelete(lesson.id);
  }

  async function deleteBlock(blockId: string) {
    setDeletingBlock(blockId);
    await fetch(
      `/api/courses/${courseId}/modules/${moduleId}/lessons/${lesson.id}/blocks/${blockId}`,
      { method: "DELETE" }
    );
    setBlocks((prev) => prev.filter((b) => b.id !== blockId));
    setDeletingBlock(null);
  }

  return (
    <div className="border border-surface-100 rounded-lg overflow-hidden">
      <div
        className="flex items-center gap-3 px-3 py-2.5 bg-surface-50 cursor-pointer hover:bg-surface-100 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <span className="text-surface-400">
          {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </span>
        <BookOpen className="w-4 h-4 text-surface-400 shrink-0" />
        <div className="flex-1 min-w-0" onClick={(e) => e.stopPropagation()}>
          <InlineEdit value={lesson.title} onSave={saveTitle} className="text-sm font-medium text-surface-800" />
        </div>
        <span className="text-xs text-surface-400 shrink-0">
          {blocks.length} block{blocks.length !== 1 ? "s" : ""}
          {lesson.duration ? ` · ${lesson.duration} min` : ""}
        </span>
        <button
          onClick={(e) => { e.stopPropagation(); deleteLesson(); }}
          className="text-surface-300 hover:text-danger transition-colors shrink-0"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {expanded && (
        <div className="px-3 py-3 space-y-2 bg-white">
          {blocks.length === 0 ? (
            <p className="text-xs text-surface-400 italic text-center py-2">
              No content blocks yet. Add one below.
            </p>
          ) : (
            blocks.map((block) => (
              <div
                key={block.id}
                className="flex items-start gap-2 px-3 py-2 bg-surface-50 rounded-lg"
              >
                <span className="text-surface-400 mt-0.5 shrink-0">{BLOCK_ICONS[block.type]}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-surface-700">
                    {block.title || BLOCK_LABELS[block.type]}
                  </p>
                  {block.type === "TEXT" ? (
                    <p className="text-xs text-surface-500 truncate mt-0.5">
                      {String((block.payload as Record<string, unknown>)?.text ?? "").slice(0, 80)}
                      {String((block.payload as Record<string, unknown>)?.text ?? "").length > 80 ? "…" : ""}
                    </p>
                  ) : (
                    <p className="text-xs text-surface-400 truncate mt-0.5">
                      {String((block.payload as Record<string, unknown>)?.url ?? "")}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => setEditingBlock(block)}
                    className="text-surface-300 hover:text-brand-600 transition-colors"
                    title="Edit block"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => deleteBlock(block.id)}
                    disabled={deletingBlock === block.id}
                    className="text-surface-300 hover:text-danger transition-colors disabled:opacity-40"
                    title="Delete block"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}

          <Button
            size="sm"
            variant="ghost"
            leftIcon={<Plus className="w-3.5 h-3.5" />}
            onClick={() => setAddingBlock(true)}
            className="w-full justify-center border border-dashed border-surface-200"
          >
            Add Content Block
          </Button>
        </div>
      )}

      {addingBlock && (
        <AddBlockModal
          courseId={courseId}
          moduleId={moduleId}
          lessonId={lesson.id}
          onAdded={(block) => setBlocks((prev) => [...prev, block])}
          onClose={() => setAddingBlock(false)}
        />
      )}

      {editingBlock && (
        <EditBlockModal
          courseId={courseId}
          moduleId={moduleId}
          lessonId={lesson.id}
          block={editingBlock}
          onSaved={(updated) => setBlocks((prev) => prev.map((b) => b.id === updated.id ? updated : b))}
          onClose={() => setEditingBlock(null)}
        />
      )}
    </div>
  );
}

// ─── Module section ───────────────────────────────────────────────────────────

function ModuleSection({
  mod, courseId,
  onUpdate, onDelete,
}: {
  mod: Module; courseId: string;
  onUpdate: (updated: Module) => void;
  onDelete: (moduleId: string) => void;
}) {
  const [expanded, setExpanded] = useState(true);
  const [lessons, setLessons] = useState<Lesson[]>(mod.lessons);
  const [addingLesson, setAddingLesson] = useState(false);
  const [newLessonTitle, setNewLessonTitle] = useState("");
  const [saving, setSaving] = useState(false);

  async function saveModuleTitle(title: string) {
    await fetch(`/api/courses/${courseId}/modules/${mod.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title }),
    });
    onUpdate({ ...mod, title });
  }

  async function deleteModule() {
    if (!confirm(`Delete module "${mod.title}" and all its lessons? This cannot be undone.`)) return;
    await fetch(`/api/courses/${courseId}/modules/${mod.id}`, { method: "DELETE" });
    onDelete(mod.id);
  }

  async function addLesson() {
    if (!newLessonTitle.trim()) return;
    setSaving(true);
    const res = await fetch(`/api/courses/${courseId}/modules/${mod.id}/lessons`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: newLessonTitle.trim() }),
    });
    const data = await res.json();
    setLessons((prev) => [...prev, { ...data, blocks: [] }]);
    setNewLessonTitle("");
    setAddingLesson(false);
    setSaving(false);
  }

  return (
    <div className="border border-surface-200 rounded-xl overflow-hidden">
      {/* Module header */}
      <div
        className="flex items-center gap-3 px-4 py-3 bg-surface-50 border-b border-surface-100 cursor-pointer hover:bg-surface-100 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <span className="text-surface-500">
          {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </span>
        <span className="w-6 h-6 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center text-xs font-bold shrink-0">
          {mod.order}
        </span>
        <div className="flex-1 min-w-0" onClick={(e) => e.stopPropagation()}>
          <InlineEdit
            value={mod.title}
            onSave={saveModuleTitle}
            className="font-semibold text-surface-900"
            placeholder="Module title"
          />
        </div>
        <span className="text-xs text-surface-400 shrink-0">
          {lessons.length} lesson{lessons.length !== 1 ? "s" : ""}
        </span>
        <button
          onClick={(e) => { e.stopPropagation(); deleteModule(); }}
          className="text-surface-300 hover:text-danger transition-colors shrink-0"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {expanded && (
        <div className="p-4 space-y-2 bg-white">
          {lessons.map((lesson) => (
            <LessonRow
              key={lesson.id}
              lesson={lesson}
              courseId={courseId}
              moduleId={mod.id}
              onUpdate={(updated) => setLessons((prev) => prev.map((l) => l.id === updated.id ? updated : l))}
              onDelete={(lessonId) => setLessons((prev) => prev.filter((l) => l.id !== lessonId))}
            />
          ))}

          {addingLesson ? (
            <div className="flex items-center gap-2 px-3 py-2 border border-dashed border-brand-300 rounded-lg bg-brand-50">
              <BookOpen className="w-4 h-4 text-brand-400 shrink-0" />
              <input
                autoFocus
                type="text"
                value={newLessonTitle}
                onChange={(e) => setNewLessonTitle(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") addLesson(); if (e.key === "Escape") { setAddingLesson(false); setNewLessonTitle(""); } }}
                placeholder="Lesson title"
                className="flex-1 bg-transparent text-sm focus:outline-none placeholder:text-brand-300"
                disabled={saving}
              />
              <button onClick={addLesson} disabled={saving || !newLessonTitle.trim()} className="text-success hover:text-success-dark disabled:opacity-40">
                <Check className="w-4 h-4" />
              </button>
              <button onClick={() => { setAddingLesson(false); setNewLessonTitle(""); }} className="text-surface-400 hover:text-surface-600">
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <Button
              size="sm"
              variant="ghost"
              leftIcon={<Plus className="w-3.5 h-3.5" />}
              onClick={() => setAddingLesson(true)}
              className="w-full justify-center border border-dashed border-surface-200"
            >
              Add Lesson
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Course description inline editor ────────────────────────────────────────

function CourseDescriptionEdit({
  description,
  onSave,
}: {
  description: string | null;
  onSave: (val: string) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(description ?? "");
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    await onSave(draft.trim());
    setSaving(false);
    setEditing(false);
  }

  function cancel() {
    setDraft(description ?? "");
    setEditing(false);
  }

  if (editing) {
    return (
      <div className="mb-6 space-y-2">
        <textarea
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          rows={3}
          maxLength={2000}
          disabled={saving}
          className="w-full px-3 py-2 rounded-lg border border-brand-400 text-sm text-surface-800 focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
        />
        <div className="flex items-center gap-2">
          <Button size="sm" onClick={save} isLoading={saving}>Save</Button>
          <Button size="sm" variant="ghost" onClick={cancel} disabled={saving}>Cancel</Button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="mb-6 group flex items-start gap-2 cursor-pointer"
      onClick={() => setEditing(true)}
    >
      {description ? (
        <p className="text-sm text-surface-600 border-l-2 border-brand-200 pl-3 flex-1">
          {description}
        </p>
      ) : (
        <p className="text-sm text-surface-400 italic border-l-2 border-surface-200 pl-3 flex-1">
          Add a course description…
        </p>
      )}
      <Edit3 className="w-3.5 h-3.5 text-surface-300 group-hover:text-surface-500 transition-colors mt-0.5 shrink-0" />
    </div>
  );
}

// ─── Main CourseBuilder ───────────────────────────────────────────────────────

export function CourseBuilder({ course: initial }: { course: Course }) {
  const router = useRouter();
  const [course, setCourse] = useState<Course>(initial);
  const [modules, setModules] = useState<Module[]>(initial.modules);
  const [addingModule, setAddingModule] = useState(false);
  const [newModuleTitle, setNewModuleTitle] = useState("");
  const [addingModule2, setAddingModule2] = useState(false);
  const [statusLoading, setStatusLoading] = useState(false);
  const [statusError, setStatusError] = useState<string | null>(null);

  async function addModule() {
    if (!newModuleTitle.trim()) return;
    setAddingModule2(true);
    const res = await fetch(`/api/courses/${course.id}/modules`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: newModuleTitle.trim() }),
    });
    const data = await res.json();
    setModules((prev) => [...prev, { ...data, lessons: [] }]);
    setNewModuleTitle("");
    setAddingModule(false);
    setAddingModule2(false);
  }

  async function changeStatus(status: "DRAFT" | "PUBLISHED" | "ARCHIVED") {
    setStatusLoading(true);
    setStatusError(null);
    const res = await fetch(`/api/courses/${course.id}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    const data = await res.json();
    if (!res.ok) { setStatusError(data.error); setStatusLoading(false); return; }
    setCourse((prev) => ({ ...prev, status }));
    setStatusLoading(false);
  }

  async function deleteCourse() {
    if (!confirm("Delete this course? This action cannot be undone.")) return;
    const res = await fetch(`/api/courses/${course.id}`, { method: "DELETE" });
    if (res.ok) router.push("/mentor/courses");
  }

  async function saveCourseTitle(title: string) {
    await fetch(`/api/courses/${course.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title }),
    });
    setCourse((prev) => ({ ...prev, title }));
  }

  async function saveCourseDescription(description: string) {
    await fetch(`/api/courses/${course.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ description: description || null }),
    });
    setCourse((prev) => ({ ...prev, description: description || null }));
  }

  const isDraft = course.status === "DRAFT";
  const isPublished = course.status === "PUBLISHED";

  return (
    <div className="p-6 lg:p-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-6 gap-4">
        <div className="flex items-start gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-brand-50 flex items-center justify-center shrink-0 mt-0.5">
            <GraduationCap className="w-5 h-5 text-brand-600" />
          </div>
          <div className="min-w-0">
            <h1 className="text-xl font-bold text-surface-900">
              <InlineEdit
                value={course.title}
                onSave={saveCourseTitle}
                placeholder="Course title"
              />
            </h1>
            <div className="flex items-center gap-2 mt-1">
              <Badge
                variant={isDraft ? "default" : isPublished ? "success" : "warning"}
                dot
              >
                {course.status.charAt(0) + course.status.slice(1).toLowerCase()}
              </Badge>
              <span className="text-xs text-surface-400 flex items-center gap-1">
                <Users className="w-3 h-3" />
                {course._count.enrollments} enrolled
              </span>
              <span className="text-xs text-surface-400">
                {course.isOpen ? "Open enrollment" : "Invite only"}
              </span>
              <span className="text-xs text-surface-400">
                Last Updated: {formatDate(course.updatedAt)}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {isDraft && (
            <Button
              size="sm"
              leftIcon={<Eye className="w-4 h-4" />}
              onClick={() => changeStatus("PUBLISHED")}
              isLoading={statusLoading}
            >
              Publish
            </Button>
          )}
          {isPublished && (
            <Button
              size="sm"
              variant="outline"
              leftIcon={<EyeOff className="w-4 h-4" />}
              onClick={() => changeStatus("ARCHIVED")}
              isLoading={statusLoading}
            >
              Archive
            </Button>
          )}
          {course.status === "ARCHIVED" && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => changeStatus("PUBLISHED")}
              isLoading={statusLoading}
            >
              Re-publish
            </Button>
          )}
          {isDraft && (
            <Button
              size="sm"
              variant="danger"
              leftIcon={<Trash2 className="w-4 h-4" />}
              onClick={deleteCourse}
            >
              Delete
            </Button>
          )}
        </div>
      </div>

      {statusError && (
        <div className="mb-4 px-4 py-3 bg-danger/5 border border-danger/20 rounded-xl text-sm text-danger">
          {statusError}
        </div>
      )}

      <CourseDescriptionEdit
        description={course.description}
        onSave={saveCourseDescription}
      />

      {/* Module list */}
      <div className="space-y-3 mb-4">
        <div className="flex items-center gap-2 mb-4">
          <Globe className="w-4 h-4 text-surface-400" />
          <h2 className="font-semibold text-surface-900">Course Content</h2>
          <span className="text-sm text-surface-400">({modules.length} module{modules.length !== 1 ? "s" : ""})</span>
        </div>

        {modules.length === 0 && !addingModule && (
          <Card padding="lg">
            <div className="text-center py-4">
              <BookOpen className="w-8 h-8 text-surface-300 mx-auto mb-3" />
              <p className="font-medium text-surface-700 mb-1">No modules yet</p>
              <p className="text-sm text-surface-500">Add your first module to start building the course.</p>
            </div>
          </Card>
        )}

        {modules.map((mod) => (
          <ModuleSection
            key={mod.id}
            mod={mod}
            courseId={course.id}
            onUpdate={(updated) => setModules((prev) => prev.map((m) => m.id === updated.id ? updated : m))}
            onDelete={(moduleId) => setModules((prev) => prev.filter((m) => m.id !== moduleId))}
          />
        ))}

        {addingModule ? (
          <div className="flex items-center gap-2 px-4 py-3 border-2 border-dashed border-brand-300 rounded-xl bg-brand-50">
            <input
              autoFocus
              type="text"
              value={newModuleTitle}
              onChange={(e) => setNewModuleTitle(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") addModule(); if (e.key === "Escape") { setAddingModule(false); setNewModuleTitle(""); } }}
              placeholder="Module title"
              className="flex-1 bg-transparent text-sm font-medium focus:outline-none placeholder:text-brand-300"
              disabled={addingModule2}
            />
            <button onClick={addModule} disabled={addingModule2 || !newModuleTitle.trim()} className="text-success hover:text-success-dark disabled:opacity-40">
              <Check className="w-4 h-4" />
            </button>
            <button onClick={() => { setAddingModule(false); setNewModuleTitle(""); }} className="text-surface-400 hover:text-surface-600">
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <Button
            variant="outline"
            leftIcon={<Plus className="w-4 h-4" />}
            onClick={() => setAddingModule(true)}
            className="w-full justify-center"
          >
            Add Module
          </Button>
        )}
      </div>

      {/* Reviews panel */}
      <MentorReviewsPanel reviews={initial.reviews} />
    </div>
  );
}

// ─── Mentor reviews panel (read-only) ────────────────────────────────────────

function MentorReviewsPanel({ reviews }: { reviews: Review[] }) {
  const count = reviews.length;
  const avg =
    count > 0
      ? Math.round((reviews.reduce((s, r) => s + r.rating, 0) / count) * 10) / 10
      : null;

  // Rating breakdown (5 → 1)
  const breakdown = [5, 4, 3, 2, 1].map((star) => ({
    star,
    n: reviews.filter((r) => r.rating === star).length,
  }));

  return (
    <Card padding="md" className="mt-6">
      <div className="flex items-center gap-3 mb-4">
        <Star className="w-4 h-4 text-amber-400" />
        <h2 className="font-semibold text-surface-900">Student Reviews</h2>
        {avg !== null && <StarDisplay avg={avg} count={count} size="md" />}
        {count === 0 && <span className="text-sm text-surface-400">No reviews yet</span>}
      </div>

      {count > 0 && (
        <>
          {/* Breakdown bar chart */}
          <div className="space-y-1.5 mb-6">
            {breakdown.map(({ star, n }) => (
              <div key={star} className="flex items-center gap-2 text-xs text-surface-500">
                <span className="w-3 text-right">{star}</span>
                <Star className="w-3 h-3 fill-amber-400 text-amber-400 shrink-0" />
                <div className="flex-1 h-2 bg-surface-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-amber-400 rounded-full transition-all"
                    style={{ width: count > 0 ? `${(n / count) * 100}%` : "0%" }}
                  />
                </div>
                <span className="w-5 text-right">{n}</span>
              </div>
            ))}
          </div>

          {/* Review list */}
          <div className="divide-y divide-surface-100">
            {reviews.map((r) => (
              <div key={r.id} className="flex gap-3 py-4">
                <div className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center shrink-0 text-sm font-semibold text-brand-700">
                  {r.learner.avatar ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={r.learner.avatar} alt={r.learner.name} className="w-8 h-8 rounded-full object-cover" />
                  ) : (
                    r.learner.name.charAt(0).toUpperCase()
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-surface-900">{r.learner.name}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <StarRating value={r.rating} readOnly size="sm" />
                    <span className="text-xs text-surface-400">{formatDate(r.createdAt)}</span>
                  </div>
                  {r.body && (
                    <p className="text-sm text-surface-700 mt-2 leading-relaxed whitespace-pre-line">{r.body}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </Card>
  );
}
