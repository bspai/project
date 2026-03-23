// src/modules/shared/components/Badge.tsx
import { cn } from "../utils";

type BadgeVariant = "default" | "success" | "warning" | "danger" | "info" | "outline";

interface BadgeProps {
  variant?: BadgeVariant;
  children: React.ReactNode;
  className?: string;
  dot?: boolean;
}

const variantClasses: Record<BadgeVariant, string> = {
  default: "bg-surface-100 text-surface-700 border-surface-200",
  success: "bg-success/10 text-success-dark border-success/20",
  warning: "bg-warning/10 text-warning-dark border-warning/20",
  danger:  "bg-danger/10 text-danger-dark border-danger/20",
  info:    "bg-info/10 text-info-dark border-info/20",
  outline: "bg-transparent text-surface-700 border-surface-300",
};

const dotClasses: Record<BadgeVariant, string> = {
  default: "bg-surface-400",
  success: "bg-success",
  warning: "bg-warning",
  danger:  "bg-danger",
  info:    "bg-info",
  outline: "bg-surface-400",
};

export function Badge({ variant = "default", children, className, dot }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border",
        variantClasses[variant],
        className
      )}
    >
      {dot && (
        <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", dotClasses[variant])} />
      )}
      {children}
    </span>
  );
}
