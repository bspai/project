// src/modules/projects/components/RichTextViewer.tsx
"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import TextAlign from "@tiptap/extension-text-align";
import Underline from "@tiptap/extension-underline";
import { JsonValue } from "@prisma/client/runtime/library";

interface RichTextViewerProps {
  content: JsonValue;
  className?: string;
}

export function RichTextViewer({ content, className }: RichTextViewerProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
      Image.configure({
        inline: false,
        HTMLAttributes: { class: "max-w-full rounded-lg my-4 shadow-card" },
      }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Underline,
    ],
    content:  content as any,
    editable: false,
  });

  if (!editor) return null;

  return (
    <div className={`tiptap-editor ${className ?? ""}`}>
      <EditorContent editor={editor} />
    </div>
  );
}
