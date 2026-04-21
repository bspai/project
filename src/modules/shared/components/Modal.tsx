// src/modules/shared/components/Modal.tsx
"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { X } from "lucide-react";
import { cn } from "../utils";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
}

const sizeClasses = {
  sm: "w-[90vw] max-w-md",
  md: "w-[90vw] max-w-lg",
  lg: "w-[90vw] max-w-2xl",
  xl: "w-[90vw] min-w-[60vw]",
};

const bodyHeightClasses = {
  sm: "max-h-[60vh]",
  md: "max-h-[60vh]",
  lg: "max-h-[60vh]",
  xl: "max-h-[80vh]",
};

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = "md",
}: ModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const handleClose = () => onClose();
    dialog.addEventListener("close", handleClose);
    return () => dialog.removeEventListener("close", handleClose);
  }, [onClose]);

  if (!open) return null;

  return (
    <dialog
      ref={dialogRef}
      onClick={(e) => {
        if (e.target === dialogRef.current) onClose();
      }}
      className="backdrop:bg-black/40 backdrop:backdrop-blur-sm bg-transparent p-0 m-auto"
    >
      <div
        className={cn(
          "bg-white rounded-2xl shadow-xl overflow-hidden",
          sizeClasses[size]
        )}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4 px-6 pt-5 pb-4 border-b border-surface-100">
          <div>
            <h2 className="text-lg font-semibold text-surface-900">{title}</h2>
            {description && (
              <p className="text-sm text-surface-500 mt-0.5">{description}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-surface-400 hover:text-surface-700 hover:bg-surface-100 transition-colors shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className={cn("px-6 py-5 overflow-y-auto", bodyHeightClasses[size])}>{children}</div>

        {/* Footer */}
        {footer && (
          <div className="px-6 py-4 border-t border-surface-100 flex items-center justify-end gap-3 bg-surface-50">
            {footer}
          </div>
        )}
      </div>
    </dialog>
  );
}
