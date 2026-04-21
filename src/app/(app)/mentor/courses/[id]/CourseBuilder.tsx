// src/app/(app)/mentor/courses/[id]/CourseBuilder.tsx
"use client";

import { useState, useRef, createContext, useContext } from "react";
import { useRouter } from "next/navigation";
import {
  GraduationCap, Plus, Trash2, ChevronDown, ChevronRight,
  BookOpen, FileText, Video, Headphones, Image, Globe,
  Upload, Edit3, Check, X, Users, Eye, EyeOff, Star,
  GripVertical,
} from "lucide-react";
import {
  DndContext,
  DragStartEvent,
  DragEndEvent,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useDroppable } from "@dnd-kit/core";
import { RichTextEditor } from "@/modules/projects/components";
import { JsonValue } from "@prisma/client/runtime/library";
import { StarRating, StarDisplay } from "@/modules/shared/components/StarRating";
import { Button } from "@/modules/shared/components/Button";
import { Badge } from "@/modules/shared/components/Badge";
import { Card } from "@/modules/shared/components/Card";
import { Modal } from "@/modules/shared/components/Modal";
import { ContentBlockType } from "@prisma/client";
import { formatDate } from "@/modules/shared/utils";

// ─── Edit-mode context ────────────────────────────────────────────────────────
// True while the user is in edit mode (changes are local; Save commits them).
const EditModeContext = createContext(false);
const useEditMode = () => useContext(EditModeContext);
const makeTempId = () => `temp_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

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
  readOnly = false,
}: {
  value: string;
  onSave: (val: string) => Promise<void>;
  className?: string;
  placeholder?: string;
  readOnly?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [saving, setSaving] = useState(false);

  if (readOnly) {
    return (
      <span className={className}>
        {value || <span className="text-surface-400 italic">{placeholder}</span>}
      </span>
    );
  }

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
  const [richContent, setRichContent] = useState<{ json: JsonValue | null; text: string }>({ json: null, text: "" });
  const [url, setUrl] = useState("");
  const [embedCode, setEmbedCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isText = type === "TEXT";
  const isUrl = type.endsWith("_URL");
  const isIframe = type === "IFRAME";

  function extractSrc(code: string): string {
    const match = code.match(/src=["']([^"']+)["']/i);
    return match ? match[1] : code.trim();
  }

  const isEditing = useEditMode();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const payload: Record<string, unknown> = isText
        ? { content: richContent.json, text: richContent.text }
        : isIframe
        ? { src: extractSrc(embedCode) }
        : { url };

      if (isEditing) {
        // In edit mode: create a local temp block, skip the API
        onAdded({
          id: makeTempId(),
          type,
          title: blockTitle || null,
          payload,
          order: 0, // order is assigned by position in the array on save
        });
        onClose();
        return;
      }

      const requestBody = { type, title: blockTitle || undefined, payload };
      const res = await fetch(
        `/api/courses/${courseId}/modules/${moduleId}/lessons/${lessonId}/blocks`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(requestBody),
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to add block");
      onAdded(data);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal open title="Add Content Block" onClose={onClose} size="xl">
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
            <RichTextEditor
              placeholder="Enter the text content..."
              onChange={(json, text) => setRichContent({ json, text })}
              disabled={loading}
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
            disabled={isText ? !richContent.text.trim() : isIframe ? !embedCode : !isUrl}>
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
  // For text blocks: initialise with existing content. Support both new (Tiptap JSON in
  // payload.content) and legacy (plain string in payload.text) formats.
  const initialTextJson: JsonValue | null = isText
    ? typeof payload.content === "object" && payload.content !== null
      ? (payload.content as JsonValue)
      : typeof payload.text === "string" && payload.text
      ? { type: "doc", content: payload.text.split(/\n+/).filter(Boolean).map((p) => ({ type: "paragraph", content: [{ type: "text", text: p }] })) }
      : null
    : null;
  const initialText = isText ? String(payload.text ?? "") : "";
  const [richContent, setRichContent] = useState<{ json: JsonValue | null; text: string }>({
    json: initialTextJson,
    text: initialText,
  });
  const [url, setUrl] = useState(isUrl ? String(payload.url ?? "") : "");
  const [embedSrc, setEmbedSrc] = useState(isIframe ? String(payload.src ?? "") : "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isEditing = useEditMode();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const newPayload: Record<string, unknown> = isText
        ? { content: richContent.json, text: richContent.text }
        : isIframe
        ? { src: embedSrc }
        : { url };

      if (isEditing) {
        // In edit mode: update block locally, skip the API
        onSaved({ ...block, title: blockTitle || null, payload: newPayload });
        onClose();
        return;
      }

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
    <Modal open title={`Edit — ${BLOCK_LABELS[block.type]}`} onClose={onClose} size="xl">
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
            <RichTextEditor
              value={initialTextJson ?? undefined}
              onChange={(json, text) => setRichContent({ json, text })}
              disabled={loading}
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
            disabled={isText ? !richContent.text.trim() : isIframe ? !embedSrc : isUrl ? !url : true}>
            Save Changes
          </Button>
        </div>
      </form>
    </Modal>
  );
}

// ─── Sortable block row ───────────────────────────────────────────────────────

function SortableBlockRow({
  block, moduleId, lessonId,
  onEdit, onDelete, isDeleting,
}: {
  block: Block;
  moduleId: string; lessonId: string;
  onEdit: () => void;
  onDelete: () => void;
  isDeleting: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: block.id,
    data: { type: "block", block, moduleId, lessonId },
  });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.35 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-start gap-2 px-3 py-2 bg-surface-50 rounded-lg border border-transparent hover:border-surface-200 transition-colors"
    >
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing text-surface-300 hover:text-surface-500 mt-0.5 shrink-0 touch-none"
        title="Drag to reorder or move to another lesson"
        tabIndex={-1}
      >
        <GripVertical className="w-4 h-4" />
      </button>
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
            {String((block.payload as Record<string, unknown>)?.url ?? (block.payload as Record<string, unknown>)?.src ?? "")}
          </p>
        )}
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <button
          onClick={onEdit}
          className="text-surface-300 hover:text-brand-600 transition-colors"
          title="Edit block"
        >
          <Edit3 className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={onDelete}
          disabled={isDeleting}
          className="text-surface-300 hover:text-danger transition-colors disabled:opacity-40"
          title="Delete block"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

// Drag overlay card — block
function BlockDragOverlay({ block }: { block: Block }) {
  return (
    <div className="flex items-start gap-2 px-3 py-2 bg-white rounded-lg border border-brand-300 shadow-lg opacity-95 w-72">
      <GripVertical className="w-4 h-4 text-surface-300 mt-0.5 shrink-0" />
      <span className="text-surface-400 mt-0.5 shrink-0">{BLOCK_ICONS[block.type]}</span>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-surface-700">{block.title || BLOCK_LABELS[block.type]}</p>
        <p className="text-xs text-surface-400 truncate mt-0.5">
          {block.type === "TEXT"
            ? String((block.payload as Record<string, unknown>)?.text ?? "").slice(0, 60)
            : String((block.payload as Record<string, unknown>)?.url ?? (block.payload as Record<string, unknown>)?.src ?? "")}
        </p>
      </div>
    </div>
  );
}

// Drag overlay card — lesson
function LessonDragOverlay({ lesson }: { lesson: Lesson }) {
  return (
    <div className="flex items-center gap-3 px-3 py-2.5 bg-white rounded-lg border border-brand-300 shadow-lg opacity-95 w-80">
      <GripVertical className="w-4 h-4 text-surface-300 shrink-0" />
      <BookOpen className="w-4 h-4 text-surface-400 shrink-0" />
      <span className="flex-1 text-sm font-medium text-surface-800 truncate">{lesson.title}</span>
      <span className="text-xs text-surface-400 shrink-0">
        {lesson.blocks.length} block{lesson.blocks.length !== 1 ? "s" : ""}
      </span>
    </div>
  );
}

// Drag overlay card — module
function ModuleDragOverlay({ mod }: { mod: Module }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3 bg-white rounded-xl border border-brand-300 shadow-lg opacity-95 w-96">
      <GripVertical className="w-4 h-4 text-surface-300 shrink-0" />
      <span className="w-6 h-6 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center text-xs font-bold shrink-0">
        {mod.order}
      </span>
      <span className="flex-1 text-sm font-semibold text-surface-900 truncate">{mod.title}</span>
      <span className="text-xs text-surface-400 shrink-0">
        {mod.lessons.length} lesson{mod.lessons.length !== 1 ? "s" : ""}
      </span>
    </div>
  );
}

// ─── Droppable module lesson area ────────────────────────────────────────────

function DroppableModuleArea({
  moduleId,
  isEmpty,
  children,
}: {
  moduleId: string;
  isEmpty: boolean;
  children: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `droppable-module-${moduleId}` });
  return (
    <div
      ref={setNodeRef}
      className={`space-y-2 transition-all rounded-lg ${
        isOver && isEmpty ? "min-h-[3rem] bg-brand-50 border-2 border-dashed border-brand-300 p-2" : "min-h-[0.5rem]"
      }`}
    >
      {children}
    </div>
  );
}

// ─── Droppable lesson block area ──────────────────────────────────────────────

function DroppableBlockArea({
  lessonId,
  isEmpty,
  children,
}: {
  lessonId: string;
  isEmpty: boolean;
  children: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `droppable-${lessonId}` });

  return (
    <div
      ref={setNodeRef}
      className={`space-y-2 transition-all rounded-lg ${
        isOver && isEmpty ? "min-h-[3rem] bg-brand-50 border-2 border-dashed border-brand-300 p-2" : "min-h-[0.5rem]"
      }`}
    >
      {children}
    </div>
  );
}

// ─── Lesson row ───────────────────────────────────────────────────────────────

function LessonRow({
  lesson, courseId, moduleId, blocks,
  onUpdate, onDelete, onBlocksChange,
}: {
  lesson: Lesson; courseId: string; moduleId: string;
  blocks: Block[];
  onUpdate: (updated: Lesson) => void;
  onDelete: (lessonId: string) => void;
  onBlocksChange: (blocks: Block[]) => void;
}) {
  const isEditing = useEditMode();
  const [expanded, setExpanded] = useState(false);
  const [addingBlock, setAddingBlock] = useState(false);
  const [editingBlock, setEditingBlock] = useState<Block | null>(null);
  const [deletingBlock, setDeletingBlock] = useState<string | null>(null);

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: `lesson-${lesson.id}`,
    data: { type: "lesson", lesson, moduleId },
  });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.35 : 1,
  };

  async function saveTitle(title: string) {
    onUpdate({ ...lesson, title }); // always update local state
    if (isEditing) return;
    await fetch(`/api/courses/${courseId}/modules/${moduleId}/lessons/${lesson.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title }),
    });
  }

  async function deleteLesson() {
    if (!confirm(`Delete lesson "${lesson.title}"? This cannot be undone.`)) return;
    onDelete(lesson.id); // always update local state
    if (isEditing) return;
    await fetch(`/api/courses/${courseId}/modules/${moduleId}/lessons/${lesson.id}`, {
      method: "DELETE",
    });
  }

  async function deleteBlock(blockId: string) {
    setDeletingBlock(blockId);
    onBlocksChange(blocks.filter((b) => b.id !== blockId)); // always update local state
    if (!isEditing) {
      await fetch(
        `/api/courses/${courseId}/modules/${moduleId}/lessons/${lesson.id}/blocks/${blockId}`,
        { method: "DELETE" }
      );
    }
    setDeletingBlock(null);
  }

  return (
    <div ref={setNodeRef} style={style} className="border border-surface-100 rounded-lg overflow-hidden">
      <div
        className="flex items-center gap-3 px-3 py-2.5 bg-surface-50 cursor-pointer hover:bg-surface-100 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <button
          {...attributes}
          {...listeners}
          onClick={(e) => e.stopPropagation()}
          className="cursor-grab active:cursor-grabbing text-surface-300 hover:text-surface-500 shrink-0 touch-none"
          title="Drag to reorder or move to another module"
          tabIndex={-1}
        >
          <GripVertical className="w-4 h-4" />
        </button>
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
          <DroppableBlockArea lessonId={lesson.id} isEmpty={blocks.length === 0}>
            <SortableContext
              id={lesson.id}
              items={blocks.map((b) => b.id)}
              strategy={verticalListSortingStrategy}
            >
              {blocks.length === 0 ? (
                <p className="text-xs text-surface-400 italic text-center py-2">
                  No content blocks yet. Add one below, or drag a block here.
                </p>
              ) : (
                blocks.map((block) => (
                  <SortableBlockRow
                    key={block.id}
                    block={block}
                    moduleId={moduleId}
                    lessonId={lesson.id}
                    onEdit={() => setEditingBlock(block)}
                    onDelete={() => deleteBlock(block.id)}
                    isDeleting={deletingBlock === block.id}
                  />
                ))
              )}
            </SortableContext>
          </DroppableBlockArea>

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
          onAdded={(block) => onBlocksChange([...blocks, block])}
          onClose={() => setAddingBlock(false)}
        />
      )}

      {editingBlock && (
        <EditBlockModal
          courseId={courseId}
          moduleId={moduleId}
          lessonId={lesson.id}
          block={editingBlock}
          onSaved={(updated) => {
            onBlocksChange(blocks.map((b) => b.id === updated.id ? updated : b));
            setEditingBlock(null);
          }}
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
  const isEditing = useEditMode();
  const [expanded, setExpanded] = useState(true);
  const [addingLesson, setAddingLesson] = useState(false);
  const [newLessonTitle, setNewLessonTitle] = useState("");
  const [saving, setSaving] = useState(false);

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: `module-${mod.id}`,
    data: { type: "module", mod },
  });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.35 : 1,
  };

  const lessons = mod.lessons;

  function setLessons(updater: (prev: Lesson[]) => Lesson[]) {
    onUpdate({ ...mod, lessons: updater(lessons) });
  }

  async function saveModuleTitle(title: string) {
    onUpdate({ ...mod, title }); // always update local state
    if (isEditing) return;
    await fetch(`/api/courses/${courseId}/modules/${mod.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title }),
    });
  }

  async function deleteModule() {
    if (!confirm(`Delete module "${mod.title}" and all its lessons? This cannot be undone.`)) return;
    onDelete(mod.id); // always update local state
    if (isEditing) return;
    await fetch(`/api/courses/${courseId}/modules/${mod.id}`, { method: "DELETE" });
  }

  async function addLesson() {
    if (!newLessonTitle.trim()) return;
    setSaving(true);
    if (isEditing) {
      // In edit mode: create a temp lesson locally
      const tempLesson: Lesson = {
        id: makeTempId(),
        title: newLessonTitle.trim(),
        duration: null,
        order: lessons.length + 1,
        blocks: [],
      };
      setLessons((prev) => [...prev, tempLesson]);
      setNewLessonTitle("");
      setAddingLesson(false);
      setSaving(false);
      return;
    }
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
    <div ref={setNodeRef} style={style} className="border border-surface-200 rounded-xl overflow-hidden">
      {/* Module header */}
      <div
        className="flex items-center gap-3 px-4 py-3 bg-surface-50 border-b border-surface-100 cursor-pointer hover:bg-surface-100 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <button
          {...attributes}
          {...listeners}
          onClick={(e) => e.stopPropagation()}
          className="cursor-grab active:cursor-grabbing text-surface-300 hover:text-surface-500 shrink-0 touch-none"
          title="Drag to reorder module"
          tabIndex={-1}
        >
          <GripVertical className="w-4 h-4" />
        </button>
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
          <SortableContext
            id={`lessons-${mod.id}`}
            items={lessons.map((l) => `lesson-${l.id}`)}
            strategy={verticalListSortingStrategy}
          >
            <DroppableModuleArea moduleId={mod.id} isEmpty={lessons.length === 0}>
              {lessons.map((lesson) => (
                <LessonRow
                  key={lesson.id}
                  lesson={lesson}
                  courseId={courseId}
                  moduleId={mod.id}
                  blocks={lesson.blocks}
                  onUpdate={(updated) => setLessons((prev) => prev.map((l) => l.id === updated.id ? updated : l))}
                  onDelete={(lessonId) => setLessons((prev) => prev.filter((l) => l.id !== lessonId))}
                  onBlocksChange={(blocks) =>
                    setLessons((prev) =>
                      prev.map((l) => l.id === lesson.id ? { ...l, blocks } : l)
                    )
                  }
                />
              ))}
            </DroppableModuleArea>
          </SortableContext>

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

// ─── Mentor reviews panel ─────────────────────────────────────────────────────

function MentorReviewsPanel({ reviews }: { reviews: Review[] }) {
  const [open, setOpen] = useState(false);
  if (reviews.length === 0) return null;
  const avg = reviews.reduce((s, r) => s + r.rating, 0) / reviews.length;

  return (
    <div className="mt-8 border border-surface-200 rounded-xl overflow-hidden">
      <div
        className="flex items-center gap-3 px-4 py-3 bg-surface-50 border-b border-surface-100 cursor-pointer hover:bg-surface-100 transition-colors"
        onClick={() => setOpen(!open)}
      >
        <Star className="w-4 h-4 text-yellow-500 shrink-0" />
        <span className="font-semibold text-surface-900 flex-1">Student Reviews</span>
        <StarDisplay avg={avg} count={reviews.length} />
        <span className="text-sm text-surface-500">{avg.toFixed(1)} ({reviews.length})</span>
        {open ? <ChevronDown className="w-4 h-4 text-surface-400" /> : <ChevronRight className="w-4 h-4 text-surface-400" />}
      </div>
      {open && (
        <div className="divide-y divide-surface-100">
          {reviews.map((r) => (
            <div key={r.id} className="px-4 py-3 bg-white">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm font-medium text-surface-800">{r.learner.name}</span>
                <StarRating value={r.rating} readOnly size="sm" />
                <span className="text-xs text-surface-400 ml-auto">{formatDate(r.createdAt)}</span>
              </div>
              {r.body && <p className="text-sm text-surface-600">{r.body}</p>}
            </div>
          ))}
        </div>
      )}
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

  // ─── Edit mode ───────────────────────────────────────────────────────────
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const editSnapshot = useRef<{ course: Course; modules: Module[] } | null>(null);

  function enterEdit() {
    editSnapshot.current = {
      course: JSON.parse(JSON.stringify(course)),
      modules: JSON.parse(JSON.stringify(modules)),
    };
    setIsEditing(true);
  }

  function cancelEdit() {
    if (editSnapshot.current) {
      setCourse(editSnapshot.current.course);
      setModules(editSnapshot.current.modules);
    }
    editSnapshot.current = null;
    setIsEditing(false);
    setSaveError(null);
  }

  async function saveEdit() {
    setIsSaving(true);
    setSaveError(null);
    try {
      const res = await fetch(`/api/courses/${course.id}/structure`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: course.title,
          description: course.description,
          modules: modules.map((m, mi) => ({
            id: m.id,
            title: m.title,
            order: mi + 1,
            lessons: m.lessons.map((l, li) => ({
              id: l.id,
              title: l.title,
              order: li + 1,
              blocks: l.blocks.map((b, bi) => ({
                id: b.id,
                type: b.type,
                title: b.title,
                payload: b.payload,
                order: bi + 1,
              })),
            })),
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to save");
      // Replace state with server-confirmed structure (real IDs replace temp IDs)
      if (data.modules) setModules(data.modules);
      if (data.title) setCourse((prev) => ({ ...prev, title: data.title, description: data.description }));
      editSnapshot.current = null;
      setIsEditing(false);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsSaving(false);
    }
  }

  // Active item being dragged (for DragOverlay)
  const [activeBlock, setActiveBlock] = useState<Block | null>(null);
  const [activeLesson, setActiveLesson] = useState<Lesson | null>(null);
  const [activeModule, setActiveModule] = useState<Module | null>(null);

  // Track dragged item's source location (stable during drag)
  const dragSourceRef = useRef<{ type: "block" | "lesson" | "module"; moduleId: string; lessonId?: string } | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  );

  // ─── State helpers ───────────────────────────────────────────────────────

  function findLessonById(lessonId: string): { module: Module; lesson: Lesson } | null {
    for (const mod of modules) {
      const lesson = mod.lessons.find((l) => l.id === lessonId);
      if (lesson) return { module: mod, lesson };
    }
    return null;
  }

  function updateModuleBlocks(
    moduleId: string,
    lessonId: string,
    updater: (blocks: Block[]) => Block[]
  ) {
    setModules((prev) =>
      prev.map((m) =>
        m.id === moduleId
          ? {
              ...m,
              lessons: m.lessons.map((l) =>
                l.id === lessonId ? { ...l, blocks: updater(l.blocks) } : l
              ),
            }
          : m
      )
    );
  }

  // ─── DnD handlers ────────────────────────────────────────────────────────

  function handleDragStart(event: DragStartEvent) {
    const data = event.active.data.current as { type: "block" | "lesson" | "module"; block?: Block; lesson?: Lesson; mod?: Module; moduleId?: string; lessonId?: string } | undefined;
    if (!data) return;
    if (data.type === "block" && data.block) {
      setActiveBlock(data.block);
      dragSourceRef.current = { type: "block", moduleId: data.moduleId!, lessonId: data.lessonId };
    } else if (data.type === "lesson" && data.lesson) {
      setActiveLesson(data.lesson);
      dragSourceRef.current = { type: "lesson", moduleId: data.moduleId! };
    } else if (data.type === "module" && data.mod) {
      setActiveModule(data.mod);
      dragSourceRef.current = { type: "module", moduleId: data.mod.id };
    }
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveBlock(null);
    setActiveLesson(null);
    setActiveModule(null);
    const src = dragSourceRef.current;
    dragSourceRef.current = null;

    if (!over || !src) return;

    const activeId = active.id as string;
    const overId = over.id as string;
    const sortableContainerId = over.data.current?.sortable?.containerId as string | undefined;

    // ── Module drag ────────────────────────────────────────────────────────
    if (src.type === "module") {
      const oldIndex = modules.findIndex((m) => `module-${m.id}` === activeId);
      const newIndex = modules.findIndex((m) => `module-${m.id}` === overId);
      if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) return;

      const reordered = arrayMove(modules, oldIndex, newIndex).map((m, i) => ({ ...m, order: i + 1 }));
      setModules(reordered);

      if (!isEditing) {
        await fetch(`/api/courses/${course.id}/modules/reorder`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ order: reordered.map((m) => ({ id: m.id, order: m.order })) }),
        });
      }
      return;
    }

    // ── Lesson drag ────────────────────────────────────────────────────────
    if (src.type === "lesson") {
      const lessonId = activeId.replace("lesson-", "");
      const srcModuleId = src.moduleId;

      let targetModuleId: string;
      if (sortableContainerId?.startsWith("lessons-")) {
        targetModuleId = sortableContainerId.replace("lessons-", "");
      } else if (overId.startsWith("droppable-module-")) {
        targetModuleId = overId.replace("droppable-module-", "");
      } else if (overId.startsWith("lesson-")) {
        const overLessonId = overId.replace("lesson-", "");
        targetModuleId = findLessonById(overLessonId)?.module.id ?? srcModuleId;
      } else {
        targetModuleId = srcModuleId;
      }

      const srcMod = modules.find((m) => m.id === srcModuleId);
      const tgtMod = modules.find((m) => m.id === targetModuleId);
      if (!srcMod || !tgtMod) return;

      if (srcModuleId === targetModuleId) {
        const oldIndex = srcMod.lessons.findIndex((l) => `lesson-${l.id}` === activeId);
        const newIndex = srcMod.lessons.findIndex((l) => `lesson-${l.id}` === overId);
        if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) return;

        const reordered = arrayMove(srcMod.lessons, oldIndex, newIndex).map((l, i) => ({ ...l, order: i + 1 }));
        setModules((prev) => prev.map((m) => m.id === srcModuleId ? { ...m, lessons: reordered } : m));

        if (!isEditing) {
          await Promise.all(
            reordered.map((l) =>
              fetch(`/api/courses/${course.id}/modules/${srcModuleId}/lessons/${l.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ order: l.order }),
              })
            )
          );
        }
      } else {
        const lessonToMove = srcMod.lessons.find((l) => l.id === lessonId);
        if (!lessonToMove) return;

        const newSrcLessons = srcMod.lessons
          .filter((l) => l.id !== lessonId)
          .map((l, i) => ({ ...l, order: i + 1 }));

        const overIndex = tgtMod.lessons.findIndex((l) => `lesson-${l.id}` === overId);
        const insertAt = overIndex >= 0 ? overIndex : tgtMod.lessons.length;
        const newTgtLessons = [
          ...tgtMod.lessons.slice(0, insertAt),
          { ...lessonToMove, order: insertAt + 1 },
          ...tgtMod.lessons.slice(insertAt),
        ].map((l, i) => ({ ...l, order: i + 1 }));

        setModules((prev) =>
          prev.map((m) => {
            if (m.id === srcModuleId) return { ...m, lessons: newSrcLessons };
            if (m.id === targetModuleId) return { ...m, lessons: newTgtLessons };
            return m;
          })
        );

        if (!isEditing) {
          await fetch(`/api/courses/${course.id}/modules/${srcModuleId}/lessons/${lessonId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ moduleId: targetModuleId, order: insertAt + 1 }),
          });
          await Promise.all(
            newSrcLessons.map((l) =>
              fetch(`/api/courses/${course.id}/modules/${srcModuleId}/lessons/${l.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ order: l.order }),
              })
            )
          );
          await Promise.all(
            newTgtLessons
              .filter((l) => l.id !== lessonId)
              .map((l) =>
                fetch(`/api/courses/${course.id}/modules/${targetModuleId}/lessons/${l.id}`, {
                  method: "PATCH",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ order: l.order }),
                })
              )
          );
        }
      }
      return;
    }

    // ── Block drag ─────────────────────────────────────────────────────────
    const srcLessonId = src.lessonId!;
    const srcModuleId = src.moduleId;

    // Resolve target lesson ID from drop position.
    // Several possible cases:
    //   1. Over a block in a lesson  → sortableContainerId = lesson.id, overBlockLessonId = lesson.id
    //   2. Over a lesson's empty droppable area → overId = `droppable-${lessonId}`
    //   3. Over a lesson row header  → overId = `lesson-${lessonId}`,
    //                                  sortableContainerId = `lessons-${moduleId}` (NOT a lesson id)
    // Case 3 used to fall through to `overId` which is an unrecognised key, causing silent failure.

    // sortableContainerId is valid as a lesson ID only when it doesn't look like the
    // lessons-level SortableContext ("lessons-…") or the module-level one ("module-…").
    const containerIsLessonId =
      sortableContainerId &&
      !sortableContainerId.startsWith("lessons-") &&
      !sortableContainerId.startsWith("module-");

    const droppableLesson =
      overId.startsWith("droppable-") && !overId.startsWith("droppable-module-")
        ? overId.replace("droppable-", "")
        : null;

    // When over a lesson row header the id carries the "lesson-" prefix.
    const overLessonHeader = overId.startsWith("lesson-")
      ? overId.replace("lesson-", "")
      : null;

    const overBlockLessonId = over.data.current?.lessonId as string | undefined;

    const targetLessonId =
      (containerIsLessonId ? sortableContainerId : undefined) ??
      overBlockLessonId ??
      droppableLesson ??
      overLessonHeader ??   // drop onto a lesson header → block is appended to that lesson
      overId;

    if (!targetLessonId) return;

    const srcLoc = findLessonById(srcLessonId);
    const tgtLoc = findLessonById(targetLessonId);
    if (!srcLoc || !tgtLoc) return;

    const srcBlocks = srcLoc.lesson.blocks;

    if (srcLessonId === targetLessonId) {
      // ── Same lesson: reorder ───────────────────────────────────────────
      const oldIndex = srcBlocks.findIndex((b) => b.id === activeId);
      const newIndex = srcBlocks.findIndex((b) => b.id === overId);
      if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) return;

      const reordered = arrayMove(srcBlocks, oldIndex, newIndex).map((b, i) => ({
        ...b,
        order: i + 1,
      }));
      updateModuleBlocks(srcModuleId, srcLessonId, () => reordered);

      if (!isEditing) {
        await fetch(`/api/courses/${course.id}/blocks/move`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            blockId: activeId,
            sourceLessonId: srcLessonId,
            targetLessonId: srcLessonId,
            sourceBlocks: [],
            targetBlocks: reordered.map((b) => ({ id: b.id, order: b.order })),
          }),
        });
      }
    } else {
      // ── Cross-lesson move ──────────────────────────────────────────────
      const blockToMove = srcBlocks.find((b) => b.id === activeId);
      if (!blockToMove) return;

      const tgtBlocks = tgtLoc.lesson.blocks;

      const newSrcBlocks = srcBlocks
        .filter((b) => b.id !== activeId)
        .map((b, i) => ({ ...b, order: i + 1 }));

      const overIndex = tgtBlocks.findIndex((b) => b.id === overId);
      const insertAt = overIndex >= 0 ? overIndex : tgtBlocks.length;
      const newTgtBlocks = [
        ...tgtBlocks.slice(0, insertAt),
        { ...blockToMove, order: insertAt + 1 },
        ...tgtBlocks.slice(insertAt),
      ].map((b, i) => ({ ...b, order: i + 1 }));

      setModules((prev) =>
        prev.map((m) => ({
          ...m,
          lessons: m.lessons.map((l) => {
            if (l.id === srcLessonId) return { ...l, blocks: newSrcBlocks };
            if (l.id === targetLessonId) return { ...l, blocks: newTgtBlocks };
            return l;
          }),
        }))
      );

      if (!isEditing) {
        await fetch(`/api/courses/${course.id}/blocks/move`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            blockId: activeId,
            sourceLessonId: srcLessonId,
            targetLessonId,
            sourceBlocks: newSrcBlocks.map((b) => ({ id: b.id, order: b.order })),
            targetBlocks: newTgtBlocks.map((b) => ({ id: b.id, order: b.order })),
          }),
        });
      }
    }
  }

  // ─── Course-level actions ─────────────────────────────────────────────────

  async function addModule() {
    if (!newModuleTitle.trim()) return;
    setAddingModule2(true);
    if (isEditing) {
      setModules((prev) => [
        ...prev,
        { id: makeTempId(), title: newModuleTitle.trim(), order: prev.length + 1, lessons: [] },
      ]);
      setNewModuleTitle("");
      setAddingModule(false);
      setAddingModule2(false);
      return;
    }
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
    setCourse((prev) => ({ ...prev, title }));
    if (isEditing) return;
    await fetch(`/api/courses/${course.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title }),
    });
  }

  async function saveCourseDescription(description: string) {
    setCourse((prev) => ({ ...prev, description: description || null }));
    if (isEditing) return;
    await fetch(`/api/courses/${course.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ description: description || null }),
    });
  }

  const isDraft = course.status === "DRAFT";
  const isPublished = course.status === "PUBLISHED";

  return (
    <EditModeContext.Provider value={isEditing}>
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
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
            {isEditing ? (
              <>
                {saveError && (
                  <span className="text-xs text-danger">{saveError}</span>
                )}
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={cancelEdit}
                  disabled={isSaving}
                >
                  Discard
                </Button>
                <Button
                  size="sm"
                  leftIcon={<Check className="w-4 h-4" />}
                  onClick={saveEdit}
                  isLoading={isSaving}
                >
                  Save
                </Button>
              </>
            ) : (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  leftIcon={<Edit3 className="w-4 h-4" />}
                  onClick={enterEdit}
                >
                  Edit Course
                </Button>
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
              </>
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

          <SortableContext
            items={modules.map((m) => `module-${m.id}`)}
            strategy={verticalListSortingStrategy}
          >
            {modules.map((mod) => (
              <ModuleSection
                key={mod.id}
                mod={mod}
                courseId={course.id}
                onUpdate={(updated) =>
                  setModules((prev) => prev.map((m) => m.id === updated.id ? updated : m))
                }
                onDelete={(moduleId) =>
                  setModules((prev) => prev.filter((m) => m.id !== moduleId))
                }
              />
            ))}
          </SortableContext>

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

        <MentorReviewsPanel reviews={course.reviews} />
      </div>

      {/* Drag overlay: shown while dragging */}
      <DragOverlay dropAnimation={null}>
        {activeBlock ? <BlockDragOverlay block={activeBlock} /> : null}
        {activeLesson ? <LessonDragOverlay lesson={activeLesson} /> : null}
        {activeModule ? <ModuleDragOverlay mod={activeModule} /> : null}
      </DragOverlay>
    </DndContext>
    </EditModeContext.Provider>
  );
}
