// src/app/(app)/learner/courses/[id]/learn/[lessonId]/LessonPlayer.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  CheckCircle2, Circle, ChevronLeft, ChevronRight,
  FileText, Video, Headphones, Image, Clock, Globe,
} from "lucide-react";
import { Button } from "@/modules/shared/components/Button";
import { RichTextViewer } from "@/modules/projects/components";
import { ContentBlockType } from "@prisma/client";

interface Block {
  id: string;
  type: ContentBlockType;
  title: string | null;
  // Prisma returns JsonValue; we narrow to object at runtime
  payload: unknown;
  order: number;
}

interface Lesson {
  id: string;
  title: string;
  duration: number | null;
  blocks: Block[];
}

interface NavLesson {
  id: string;
  title: string;
}

// ─── Block renderers ──────────────────────────────────────────────────────────

function BlockRenderer({ block }: { block: Block }) {
  const payload = (block.payload ?? {}) as Record<string, unknown>;

  switch (block.type) {
    case "TEXT":
      if (payload.content && typeof payload.content === "object") {
        return <RichTextViewer content={payload.content as import("@prisma/client/runtime/library").JsonValue} className="prose prose-sm max-w-none" />;
      }
      // Legacy plain-text fallback
      return (
        <div className="prose prose-sm max-w-none text-surface-800 whitespace-pre-line leading-relaxed">
          {String(payload.text ?? "")}
        </div>
      );

    case "VIDEO_URL":
      return (
        <div className="rounded-xl overflow-hidden aspect-video bg-black">
          <video src={String(payload.url ?? "")} controls className="w-full h-full" />
        </div>
      );

    case "IFRAME":
      return (
        <div className="rounded-xl overflow-hidden aspect-video bg-black">
          <iframe
            src={String(payload.src ?? "")}
            className="w-full h-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      );

    case "AUDIO_URL":
      return (
        <div className="bg-surface-50 rounded-xl p-4">
          <audio src={String(payload.url ?? "")} controls className="w-full" />
        </div>
      );

    case "IMAGE_URL":
      return (
        <div className="rounded-xl overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={String(payload.url ?? "")}
            alt={block.title ?? "Image"}
            className="w-full rounded-xl"
          />
        </div>
      );

    case "VIDEO_UPLOAD":
    case "AUDIO_UPLOAD":
    case "IMAGE_UPLOAD":
      return (
        <div className="bg-surface-50 rounded-xl p-4 text-sm text-surface-500 flex items-center gap-2">
          {block.type.startsWith("VIDEO") ? (
            <Video className="w-4 h-4 shrink-0" />
          ) : block.type.startsWith("AUDIO") ? (
            <Headphones className="w-4 h-4 shrink-0" />
          ) : (
            <Image className="w-4 h-4 shrink-0" />
          )}
          Uploaded file: {String(payload.url ?? payload.filename ?? "unavailable")}
        </div>
      );

    default:
      return null;
  }
}

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

// ─── Main player ──────────────────────────────────────────────────────────────

export function LessonPlayer({
  courseId,
  lesson,
  isComplete: initialComplete,
  prevLesson,
  nextLesson,
}: {
  courseId: string;
  lesson: Lesson;
  isComplete: boolean;
  prevLesson: NavLesson | null;
  nextLesson: NavLesson | null;
}) {
  const router = useRouter();
  const [isComplete, setIsComplete] = useState(initialComplete);
  const [toggling, setToggling] = useState(false);

  async function toggleComplete() {
    setToggling(true);
    const next = !isComplete;
    await fetch(`/api/courses/${courseId}/progress`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lessonId: lesson.id, isComplete: next }),
    });
    setIsComplete(next);
    setToggling(false);
    router.refresh();
  }

  async function markCompleteAndNext() {
    if (!isComplete) {
      setToggling(true);
      await fetch(`/api/courses/${courseId}/progress`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lessonId: lesson.id, isComplete: true }),
      });
      setToggling(false);
    }
    if (nextLesson) {
      router.push(`/learner/courses/${courseId}/learn/${nextLesson.id}`);
    }
  }

  return (
    <div className="max-w-3xl mx-auto p-6 lg:p-8">
      {/* Lesson header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-surface-900">{lesson.title}</h1>
        {lesson.duration && (
          <p className="text-sm text-surface-500 mt-1 flex items-center gap-1">
            <Clock className="w-4 h-4" />
            {lesson.duration} min estimated
          </p>
        )}
      </div>

      {/* Content blocks */}
      {lesson.blocks.length === 0 ? (
        <div className="py-12 text-center text-surface-400">
          <FileText className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">No content added to this lesson yet.</p>
        </div>
      ) : (
        <div className="space-y-6 mb-10">
          {lesson.blocks.map((block) => (
            <div key={block.id}>
              {block.title && (
                <div className="flex items-center gap-2 mb-3 text-surface-500">
                  <span className="text-surface-300">{BLOCK_ICONS[block.type]}</span>
                  <h3 className="text-sm font-semibold text-surface-700">{block.title}</h3>
                </div>
              )}
              <BlockRenderer block={block} />
            </div>
          ))}
        </div>
      )}

      {/* Completion + navigation */}
      <div className="border-t border-surface-100 pt-6 flex items-center justify-between gap-4">
        {prevLesson ? (
          <Link href={`/learner/courses/${courseId}/learn/${prevLesson.id}`}>
            <Button variant="ghost" leftIcon={<ChevronLeft className="w-4 h-4" />}>
              Previous
            </Button>
          </Link>
        ) : (
          <div />
        )}

        <div className="flex items-center gap-3">
          <button
            onClick={toggleComplete}
            disabled={toggling}
            className={`flex items-center gap-2 text-sm font-medium transition-colors ${
              isComplete
                ? "text-success hover:text-success-dark"
                : "text-surface-400 hover:text-surface-600"
            }`}
          >
            {isComplete ? (
              <CheckCircle2 className="w-5 h-5" />
            ) : (
              <Circle className="w-5 h-5" />
            )}
            {isComplete ? "Completed" : "Mark complete"}
          </button>

          {nextLesson ? (
            <Button
              onClick={markCompleteAndNext}
              isLoading={toggling}
              rightIcon={<ChevronRight className="w-4 h-4" />}
            >
              {isComplete ? "Next Lesson" : "Complete & Next"}
            </Button>
          ) : (
            <Button
              onClick={toggleComplete}
              isLoading={toggling}
              disabled={isComplete}
              variant={isComplete ? "outline" : "secondary"}
            >
              {isComplete ? "Course complete!" : "Finish Lesson"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
