import type { ReactNode } from "react";

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
    <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
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
    <div className="flex rounded-md border border-border bg-surface p-1">
      <button
        type="button"
        className={`min-h-10 flex-1 rounded px-3 text-sm ${
          mode === "preview" ? "bg-background text-white" : "hover:bg-background-soft"
        }`}
        onClick={() => onChange("preview")}
      >
        {previewLabel}
      </button>
      <button
        type="button"
        className={`min-h-10 flex-1 rounded px-3 text-sm ${
          mode === "edit" ? "bg-foreground text-white" : "hover:bg-background-soft"
        }`}
        onClick={() => onChange("edit")}
      >
        {editLabel}
      </button>
    </div>
  );
}

export const inputClassName =
  "w-full rounded-md border border-border bg-surface px-3 py-2 text-text outline-none ring-accent focus:ring-2";

export const buttonPrimaryClassName =
  "inline-flex min-h-11 items-center justify-center rounded-md bg-background px-4 py-2 text-sm font-medium text-muted hover:opacity-90 disabled:opacity-50";

export const buttonSecondaryClassName =
  "inline-flex min-h-11 items-center justify-center rounded-md border border-border bg-surface px-4 py-2 text-sm font-medium hover:bg-background-soft disabled:opacity-50";
