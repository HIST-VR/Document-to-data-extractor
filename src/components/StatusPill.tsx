import { AlertTriangle, Check, CircleAlert } from "lucide-react";
import type { FieldStatus } from "../../shared/types";

const ICON = {
  ok: Check,
  warning: AlertTriangle,
  error: CircleAlert,
} as const;

const COLOR = {
  ok: "text-ok",
  warning: "text-warning",
  error: "text-error",
} as const;

export function StatusPill({ status, label }: { status: FieldStatus; label: string }) {
  const Icon = ICON[status];
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium ${COLOR[status]}`}>
      <Icon className="h-3.5 w-3.5" strokeWidth={2} aria-hidden="true" />
      {label}
    </span>
  );
}
