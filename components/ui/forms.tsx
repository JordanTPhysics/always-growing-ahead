import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { controlTrackClassName } from "@/lib/ui-styles";
import { cn } from "@/lib/utils";

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-text">
          {title}
        </h1>
        {subtitle ? (
          <p className="mt-2 max-w-2xl text-muted">{subtitle}</p>
        ) : null}
      </div>
      {actions}
    </div>
  );
}

export function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-medium text-text">{label}</span>
      {children}
      {hint ? <span className="block text-xs text-muted">{hint}</span> : null}
    </label>
  );
}

export type FormMode = "preview" | "edit";

export function FormModeTabs({
  mode,
  onChange,
  previewLabel,
  editLabel,
}: {
  mode: FormMode;
  onChange: (mode: FormMode) => void;
  previewLabel: string;
  editLabel: string;
}) {
  return (
    <div className={cn("flex", controlTrackClassName)}>
      <Button
        type="button"
        variant={mode === "preview" ? "default" : "ghost"}
        size="sm"
        className="min-h-10 flex-1 rounded"
        onClick={() => onChange("preview")}
      >
        {previewLabel}
      </Button>
      <Button
        type="button"
        variant={mode === "edit" ? "accent" : "ghost"}
        size="sm"
        className="min-h-10 flex-1 rounded"
        onClick={() => onChange("edit")}
      >
        {editLabel}
      </Button>
    </div>
  );
}

export const inputClassName =
  "w-full rounded-md border border-border bg-surface px-3 py-2 text-text outline-none ring-accent focus:ring-2";
