// src/modules/projects/components/RichTextEditor.tsx
"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import TextAlign from "@tiptap/extension-text-align";
import Underline from "@tiptap/extension-underline";
import Placeholder from "@tiptap/extension-placeholder";
import { useCallback, useRef } from "react";
import {
  Bold,
  Italic,
  UnderlineIcon,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  AlignLeft,
  AlignCenter,
  AlignRight,
  ImageIcon,
  Minus,
  Undo,
  Redo,
  Quote,
} from "lucide-react";
import { cn } from "@/modules/shared/utils";

interface RichTextEditorProps {
  value?: Record<string, unknown>;
  onChange?: (json: Record<string, unknown>, text: string) => void;
  placeholder?: string;
  disabled?: boolean;
  error?: string;
}

export function RichTextEditor({
  value,
  onChange,
  placeholder = "Describe the project — goals, context, technical details…",
  disabled,
  error,
}: RichTextEditorProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Image.configure({
        inline: false,
        allowBase64: true, // allow base64 for local preview before upload
        HTMLAttributes: {
          class: "max-w-full rounded-lg my-4 shadow-card",
        },
      }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Underline,
      Placeholder.configure({ placeholder }),
    ],
    content: value && Object.keys(value).length > 0 ? value : undefined,
    editable: !disabled,
    onUpdate({ editor }) {
      onChange?.(
        editor.getJSON() as Record<string, unknown>,
        editor.getText()
      );
    },
  });

  const handleImageUpload = useCallback(async (file: File) => {
    if (!editor) return;

    // Show base64 preview immediately
    const reader = new FileReader();
    reader.onload = async (e) => {
      const base64 = e.target?.result as string;

      // Insert base64 preview first
      editor.chain().focus().setImage({ src: base64 }).run();

      // Then upload to server and swap src
      try {
        const formData = new FormData();
        formData.append("file", file);

        const res = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });

        if (res.ok) {
          const { url } = await res.json();
          // Find and replace the base64 src with the uploaded URL
          // Tiptap doesn't expose an easy node-update API for this,
          // so we update the JSON manually then reload content
          const json = editor.getJSON();
          replaceBase64InJson(json, base64, url);
          editor.commands.setContent(json, false);
        }
      } catch {
        // Keep base64 if upload fails — still functional
      }
    };
    reader.readAsDataURL(file);
  }, [editor]);

  const handleFileInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleImageUpload(file);
      e.target.value = ""; // reset so same file can be re-selected
    },
    [handleImageUpload]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const file = e.dataTransfer.files?.[0];
      if (file && file.type.startsWith("image/")) {
        handleImageUpload(file);
      }
    },
    [handleImageUpload]
  );

  if (!editor) return null;

  const ToolbarButton = ({
    onClick,
    active,
    title,
    children,
  }: {
    onClick: () => void;
    active?: boolean;
    title: string;
    children: React.ReactNode;
  }) => (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={cn(
        "w-8 h-8 flex items-center justify-center rounded-md text-sm transition-colors",
        active
          ? "bg-brand-100 text-brand-700"
          : "text-surface-600 hover:bg-surface-100 hover:text-surface-900"
      )}
    >
      {children}
    </button>
  );

  const Divider = () => <div className="w-px h-5 bg-surface-200 mx-1" />;

  return (
    <div
      className={cn(
        "rounded-xl border bg-white overflow-hidden",
        error ? "border-danger" : "border-surface-200",
        disabled && "opacity-60 pointer-events-none"
      )}
    >
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-0.5 px-3 py-2 border-b border-surface-100 bg-surface-50">
        {/* History */}
        <ToolbarButton title="Undo" onClick={() => editor.chain().focus().undo().run()}>
          <Undo className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton title="Redo" onClick={() => editor.chain().focus().redo().run()}>
          <Redo className="w-4 h-4" />
        </ToolbarButton>

        <Divider />

        {/* Headings */}
        <ToolbarButton
          title="Heading 1"
          active={editor.isActive("heading", { level: 1 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        >
          <Heading1 className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton
          title="Heading 2"
          active={editor.isActive("heading", { level: 2 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        >
          <Heading2 className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton
          title="Heading 3"
          active={editor.isActive("heading", { level: 3 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        >
          <Heading3 className="w-4 h-4" />
        </ToolbarButton>

        <Divider />

        {/* Inline formatting */}
        <ToolbarButton
          title="Bold"
          active={editor.isActive("bold")}
          onClick={() => editor.chain().focus().toggleBold().run()}
        >
          <Bold className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton
          title="Italic"
          active={editor.isActive("italic")}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        >
          <Italic className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton
          title="Underline"
          active={editor.isActive("underline")}
          onClick={() => editor.chain().focus().toggleUnderline().run()}
        >
          <UnderlineIcon className="w-4 h-4" />
        </ToolbarButton>

        <Divider />

        {/* Lists */}
        <ToolbarButton
          title="Bullet list"
          active={editor.isActive("bulletList")}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        >
          <List className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton
          title="Numbered list"
          active={editor.isActive("orderedList")}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        >
          <ListOrdered className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton
          title="Blockquote"
          active={editor.isActive("blockquote")}
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
        >
          <Quote className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton
          title="Horizontal rule"
          onClick={() => editor.chain().focus().setHorizontalRule().run()}
        >
          <Minus className="w-4 h-4" />
        </ToolbarButton>

        <Divider />

        {/* Alignment */}
        <ToolbarButton
          title="Align left"
          active={editor.isActive({ textAlign: "left" })}
          onClick={() => editor.chain().focus().setTextAlign("left").run()}
        >
          <AlignLeft className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton
          title="Align center"
          active={editor.isActive({ textAlign: "center" })}
          onClick={() => editor.chain().focus().setTextAlign("center").run()}
        >
          <AlignCenter className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton
          title="Align right"
          active={editor.isActive({ textAlign: "right" })}
          onClick={() => editor.chain().focus().setTextAlign("right").run()}
        >
          <AlignRight className="w-4 h-4" />
        </ToolbarButton>

        <Divider />

        {/* Image */}
        <ToolbarButton
          title="Insert image"
          onClick={() => fileInputRef.current?.click()}
        >
          <ImageIcon className="w-4 h-4" />
        </ToolbarButton>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileInputChange}
        />
      </div>

      {/* Editor area */}
      <div
        className="tiptap-editor"
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
      >
        <EditorContent
          editor={editor}
          className="px-4 py-4 min-h-[280px] focus-within:outline-none"
        />
      </div>

      {/* Footer: character count + drag hint */}
      <div className="flex items-center justify-between px-4 py-2 border-t border-surface-100 bg-surface-50">
        <p className="text-xs text-surface-400">
          Drag & drop images into the editor, or use the toolbar
        </p>
        <p className="text-xs text-surface-400">
          {editor.getText().length} chars
        </p>
      </div>

      {error && <p className="px-4 pb-2 text-xs text-danger">{error}</p>}
    </div>
  );
}

// Helper: walk Tiptap JSON and replace a base64 src with a URL
function replaceBase64InJson(
  node: Record<string, unknown>,
  base64: string,
  url: string
) {
  if (node.type === "image" && (node.attrs as Record<string, unknown>)?.src === base64) {
    (node.attrs as Record<string, unknown>).src = url;
    return;
  }
  if (Array.isArray(node.content)) {
    for (const child of node.content) {
      replaceBase64InJson(child as Record<string, unknown>, base64, url);
    }
  }
}
