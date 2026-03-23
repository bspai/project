// src/modules/shared/components/EmptyState.tsx
import { cn } from "../utils";

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center py-16 px-4 text-center", className)}>
      {icon && (
        <div className="w-14 h-14 rounded-2xl bg-surface-100 flex items-center justify-center text-surface-400 mb-4">
          {icon}
        </div>
      )}
      <h3 className="text-base font-semibold text-surface-800 mb-1">{title}</h3>
      {description && <p className="text-sm text-surface-500 max-w-sm mb-6">{description}</p>}
      {action}
    </div>
  );
}
