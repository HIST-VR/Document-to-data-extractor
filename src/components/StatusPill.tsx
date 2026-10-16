import { AlertTriangle, Check, CircleAlert } from "lucide-react";
import type { FieldStatus } from "../../shared/types";

const ICON = {
  ok: Check,
  warning: AlertTriangle,
  error: CircleAlert,
} as const;

const COLOR = {
  ok: "pill-ok",
  warning: "pill-warning",
  error: "pill-error",
} as const;

export function StatusPill({ status, label }: { status: FieldStatus; label: string }) {
  const Icon = ICON[status];
  return (
    <span className={`inline-flex h-6 items-center gap-1 rounded-full px-2 type-meta font-medium ${COLOR[status]}`}>
      <Icon className="h-3.5 w-3.5" strokeWidth={2} aria-hidden="true" />
      {label}
    </span>
  );
}
